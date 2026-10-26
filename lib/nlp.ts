const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || "http://localhost:8000";

export interface NlpSuggestion {
  intent: string;
  label: string;
  message: string;
}

interface NlpChatResponse {
  intent: string;
  confidence: number;
  response: string;
  suggestions?: NlpSuggestion[];
}

// context: the intent of E-Gabay's previous reply, so "yes"/"no" can continue that topic
export async function getNlpReply(
  message: string,
  context?: string | null,
): Promise<{ response: string; intent: string; suggestions: NlpSuggestion[] }> {
  const res = await fetch(`${NLP_SERVICE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, context: context ?? null }),
  });

  if (!res.ok) {
    throw new Error(`NLP service returned ${res.status}: ${await res.text()}`);
  }

  const data: NlpChatResponse = await res.json();
  return { response: data.response, intent: data.intent, suggestions: data.suggestions ?? [] };
}
