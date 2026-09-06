const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || "http://localhost:8000";

interface NlpChatResponse {
  intent: string;
  confidence: number;
  response: string;
}

export async function getNlpReply(message: string): Promise<string> {
  const res = await fetch(`${NLP_SERVICE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    throw new Error(`NLP service returned ${res.status}: ${await res.text()}`);
  }

  const data: NlpChatResponse = await res.json();
  return data.response;
}
