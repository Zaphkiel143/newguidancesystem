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

// context: the intent of E-Gabay's previous reply, so "yes"/"no" can continue that topic
export async function getNlpReply(message: string, context?: string | null): Promise<NlpReply> {
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
