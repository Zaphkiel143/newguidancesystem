const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || "http://localhost:8000";

export interface NlpSuggestion {
  intent: string;
  label: string;
  message: string;
}

interface NlpChatResponse {
  intent: string;
  confidence: number;
  language: string;
  response: string;
  // Topic label and the matched intent's official answers, used to ground AI
  // reply generation (lib/ai.ts). Added by nlp_service/engine.py.
  label?: string | null;
  responses?: string[];
  suggestions?: NlpSuggestion[];
}

export interface NlpReply {
  response: string;
  intent: string;
  language: string;
  label: string | null;
  responses: string[];
  suggestions: NlpSuggestion[];
}

// "im feeling", "i feel", "feeling ko"... with no feeling named yet. The
// classifier would guess the closest topic (usually feeling_sad), so E-Gabay
// asks instead of assuming.
const UNFINISHED_FEELING_EN = /^(?:i ?am |im |i |ive been |i have been |been )?(?:feeling|feel)(?: (?:so|really|very|kinda|kind of|a bit|a little|quite|like|that))?$/;
const UNFINISHED_FEELING_TL = /^(?:ang )?(?:feeling|pakiramdam|nararamdaman|nafefeel|nafeel) ko(?: (?:ay|na|ngayon|parang|sobrang|kasi))?$/;

export function unfinishedFeeling(message: string): "en" | "tl" | null {
  const text = message.toLowerCase().replace(/['’]/g, "").replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  if (UNFINISHED_FEELING_TL.test(text)) return "tl";
  if (UNFINISHED_FEELING_EN.test(text)) return "en";
  return null;
}

const FEELING_QUESTION = {
  en: "How are you feeling right now? Sad, stressed, tired, okay, or something else?",
  tl: "Ano ang nararamdaman mo ngayon? Malungkot, stressed, pagod, okay lang, o iba pa?",
};

// context: the intent of E-Gabay's previous reply, so "yes"/"no" can continue that topic
export async function getNlpReply(message: string, context?: string | null): Promise<NlpReply> {
  const unfinished = unfinishedFeeling(message);
  if (unfinished) {
    const question = FEELING_QUESTION[unfinished];
    return { response: question, intent: "feeling_unclear", language: unfinished, label: null, responses: [question], suggestions: [] };
  }

  const res = await fetch(`${NLP_SERVICE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, context: context ?? null }),
  });

  if (!res.ok) {
    throw new Error(`NLP service returned ${res.status}: ${await res.text()}`);
  }

  const data: NlpChatResponse = await res.json();
  return {
    response: data.response,
    intent: data.intent,
    language: data.language,
    label: data.label ?? null,
    responses: data.responses ?? [],
    suggestions: data.suggestions ?? [],
  };
}
