// Natural-language reply generation for the E-Gabay chatbot.
//
// The intent classifier (lib/nlp.ts + nlp_service/) stays in charge of topics,
// crisis/abuse safety replies, suggestion chips, and analytics. This module
// only writes the conversational reply, grounded in the matched intent's
// official answers from nlp_service/intents.json so the model can't invent
// school policy.
//
// Provider-agnostic: any OpenAI-compatible chat endpoint works, configured
// through AI_BASE_URL / AI_API_KEY / AI_MODEL in .env - e.g. the free Gemini
// tier (https://generativelanguage.googleapis.com/v1beta/openai), Groq, or a
// local Ollama server. When generation fails or isn't configured, callers
// fall back to the classifier's canned reply.

const AI_BASE_URL = process.env.AI_BASE_URL || "";
const AI_API_KEY = process.env.AI_API_KEY || "";
const AI_MODEL = process.env.AI_MODEL || "";

const SYSTEM_PROMPT = `You are E-Gabay, a warm and supportive AI guidance companion built into the E-Gabay STI guidance system at STI College Sta. Maria's Guidance and Counseling Office. You chat with senior high school students (Grades 11-12) about everyday concerns: academics, stress, time management, peer relationships, career questions, and general wellbeing.

Guidelines:
- Be warm, empathetic, and non-judgmental. Keep replies conversational and concise (a few short paragraphs at most) - this is a chat, not an essay.
- You are a first-line support tool, not a replacement for the school's human guidance associate. For personal concerns (stress, family, friends, relationships, feelings, sleep, habits, and similar), only acknowledge how they feel, offer at most one light suggestion, and point them to the Guidance Associate (they can book a session under My Appointments or message the guidance office). Never give a step-by-step plan, a list of coping techniques, or counseling, and don't ask them to keep telling you the details of their problem - that conversation belongs with the Guidance Associate. For anything serious - ongoing distress, family problems, bullying, or anything the student seems to really be struggling with - gently but clearly encourage them to reach out to their guidance associate, a trusted teacher, or a parent/guardian, and remind them they can message the guidance associate directly or submit a referral through this app.
- If a student expresses thoughts of self-harm, suicide, or being in immediate danger, treat it seriously: respond with care, do not minimize it, and strongly urge them to talk to a trusted adult, their guidance associate, or a parent/guardian right away, and to contact emergency services if they are in immediate danger. Do not attempt to handle a crisis alone in chat.
- Do not provide medical, psychiatric, or diagnostic advice. Do not claim credentials or professional licensure you don't have.
- Use age-appropriate language for a senior high school student.
- Never do tasks unrelated to guidance: no writing or fixing code, no homework or assignment answers, no essays, poems, summaries, translations, math, or general trivia, even "just a quick one". Politely say you're the guidance office's assistant and can't help with that, and mention what you can help with (appointments, office hours, referrals, how they're feeling).`;

export interface AiChatTurn {
  role: "user" | "assistant";
  content: string;
}

// The official information a reply must stay true to, taken from the matched
// intent in nlp_service/intents.json. Both fields are empty when the
// classifier didn't recognise the message (fallback).
export interface AiGrounding {
  label: string | null;
  responses: string[];
}

function buildSystemPrompt(grounding: AiGrounding, language: string) {
  const parts = [SYSTEM_PROMPT];

  parts.push(
    language === "tl"
      ? "The student writes in Filipino/Taglish. Reply in the same natural mix of Filipino and English they use - never stiff textbook Filipino."
      : "Reply in natural, conversational English."
  );

  if (grounding.responses.length) {
    // Most intents carry a label; conversational ones (greeting, thanks, ...)
    // don't, but their official answers still ground the reply.
    const topic = grounding.label ? `the topic "${grounding.label}"` : "a guidance topic";
    parts.push(
      `The student's message is about ${topic}. Base the reply ONLY on this official information from the Guidance and Counseling Office - rephrase it warmly and naturally, never contradict it, and never invent school rules, schedules, requirements, or policies:\n- ${grounding.responses.join("\n- ")}`
    );
    // The topic comes from an automatic classifier and can be a guess: "i feeling
    // stressed" was matched to exam stress, so replies talked about exams the
    // student never mentioned.
    parts.push(
      "That topic was picked automatically from the student's words and may be a guess. Never assume a cause or situation the student didn't mention (exams, thesis, friends, family, loneliness, and so on). If their message doesn't actually say what's behind it, acknowledge what they did say and ask what's going on, instead of advising on the guessed topic."
    );
  } else {
    parts.push(
      "The message wasn't matched to a known guidance topic. If official information for the question was already shared earlier in this conversation, you may build on it. If the message is a request unrelated to guidance (code, homework, essays, trivia, and the like), decline it as the guidelines say instead of doing it. Otherwise, answer as a warm guidance companion for everyday school concerns, but for anything the office must decide - records, requirements, formal complaints, exact schedules not already mentioned - say you're not certain and point them to the Guidance and Counseling Office (they can also use the \"Forward to the Guidance Office\" button below your reply)."
    );
  }

  parts.push("Keep it chat-sized: 1 to 4 short sentences of plain prose - no bullet lists, no headings, no parenthetical labels like (Yes), no sign-off.");
  return parts.join("\n\n");
}

// Generates the assistant's reply. Throws on any failure (missing config,
// network error, provider 429/503) - the caller falls back to the canned reply.
export async function getAiReply(input: {
  history: AiChatTurn[];
  message: string;
  grounding: AiGrounding;
  language: string;
}): Promise<string> {
  if (!AI_BASE_URL || !AI_MODEL) {
    throw new Error("AI reply generation is not configured (AI_BASE_URL / AI_MODEL missing)");
  }

  const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(AI_API_KEY ? { Authorization: `Bearer ${AI_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: "system", content: buildSystemPrompt(input.grounding, input.language) },
        ...input.history,
        { role: "user", content: input.message },
      ],
      // Thinking-style models spend invisible reasoning tokens out of this same
      // budget: gemini-3.6-flash used ~500 reasoning tokens per reply, so a
      // small cap starved the visible text and cut replies off mid-sentence
      // (finish_reason "length"). Keep generous headroom for reasoning + reply.
      max_tokens: 1200,
      temperature: 0.7,
    }),
    // Keep the chat snappy; the caller falls back to the canned reply on timeout.
    signal: AbortSignal.timeout(25_000),
  });

  if (!res.ok) {
    throw new Error(`AI provider returned ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const data = await res.json();
  const choice = data?.choices?.[0];
  // When generation gets cut (e.g. the token budget ran out mid-thought) the
  // reply arrives mid-sentence with finish_reason "length". Never show a
  // student a fragment - anything that didn't finish cleanly falls back to
  // the canned reply. finish_reason is optional in the OpenAI schema, so its
  // absence is accepted.
  if (choice?.finish_reason && choice.finish_reason !== "stop") {
    throw new Error(`AI provider returned an incomplete reply (finish_reason: ${choice.finish_reason})`);
  }
  const text = choice?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("AI provider returned an empty reply");
  }
  return text.trim();
}
