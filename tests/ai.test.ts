import { test } from "node:test";
import assert from "node:assert/strict";

// lib/ai.ts reads its provider config when the module loads, so the env has to
// exist first - hence the dynamic import below instead of a static one.
process.env.AI_BASE_URL = "https://ai.test/v1beta/openai";
process.env.AI_MODEL = "test-flash";
process.env.AI_API_KEY = "";

const { getAiReply } = await import("../lib/ai.ts");

const GROUNDING = {
  label: "office_hours",
  responses: ["Open Monday to Friday, 8:00 AM to 5:00 PM."],
};

// Stands in for the AI provider and captures each request body for assertions.
const realFetch = globalThis.fetch;
function stubFetch(payload: unknown, status = 200) {
  const calls: { url: string; body: any }[] = [];
  globalThis.fetch = (async (url: unknown, init?: { body?: string }) => {
    calls.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : null });
    return new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  return calls;
}

const INPUT = { history: [] as { role: "user" | "assistant"; content: string }[], message: "what are your office hours?", grounding: GROUNDING, language: "en" };

test("a completed reply (finish_reason stop) is returned trimmed, grounded, with a roomy token budget", async () => {
  const calls = stubFetch({ choices: [{ finish_reason: "stop", message: { content: "  The office is open Monday to Friday.  " } }] });
  try {
    const reply = await getAiReply(INPUT);
    assert.equal(reply, "The office is open Monday to Friday.");
    // Thinking-style models burn invisible reasoning tokens from this same
    // budget; 350 used to cut replies mid-sentence.
    assert.equal(calls[0].body.max_tokens, 1200);
    assert.equal(calls[0].body.model, "test-flash");
    assert.ok(calls[0].body.messages[0].content.includes("Monday to Friday, 8:00 AM to 5:00 PM."));
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("a length-cut reply throws so the caller falls back to the canned reply", async () => {
  stubFetch({ choices: [{ finish_reason: "length", message: { content: "I apologize for the confusion earlier! While I don't have" } }] });
  try {
    await assert.rejects(getAiReply(INPUT), /incomplete reply \(finish_reason: length\)/);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("providers that omit finish_reason are still accepted", async () => {
  stubFetch({ choices: [{ message: { content: "Sure, happy to help!" } }] });
  try {
    assert.equal(await getAiReply(INPUT), "Sure, happy to help!");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("an empty reply throws even when finish_reason says stop", async () => {
  stubFetch({ choices: [{ finish_reason: "stop", message: { content: "   " } }] });
  try {
    await assert.rejects(getAiReply(INPUT), /empty reply/);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("a non-OK provider response (rate limit, outage) throws", async () => {
  stubFetch({ error: { message: "quota exceeded" } }, 429);
  try {
    await assert.rejects(getAiReply(INPUT), /429/);
  } finally {
    globalThis.fetch = realFetch;
  }
});