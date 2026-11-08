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

// "I want", "I need", "gusto ko"... cut off before the point. The classifier
// matched "I want" to crisis ("I want to die") and alerted the Guidance
// Associate. A short message made only of these words says nothing yet; any
// real word ("help", "die", "sad") sends it to the classifier as usual, and
// real crisis wording is still caught by the service's keyword list.
const FILLER_EN = new Set("i im me my you we they he she it a an the to and but so just really want wanna need have has had got am is are was were be been do dont did cant can will would should think like that this there if because cuz also still about".split(" "));
const FILLER_TL = new Set("ako ko mo ka kasi gusto gustong kong ayoko ayaw kailangan parang sana na nang lang pa ang ng sa si yung ung din rin may".split(" "));

export function unfinishedOpener(message: string): "en" | "tl" | null {
  const words = message.toLowerCase().replace(/['’]/g, "").replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 3) return null;
  if (!words.every((w) => FILLER_EN.has(w) || FILLER_TL.has(w))) return null;
  return words.some((w) => FILLER_TL.has(w) && !FILLER_EN.has(w)) ? "tl" : "en";
}

const GO_ON = {
  en: "I'm listening. Go on, what would you like to say?",
  tl: "Nakikinig ako. Ano ang gusto mong sabihin?",
};

// "i feeling stressed", "stressed ako": stress with no reason given. The
// classifier only has cause-specific stress topics (exam_stress,
// thesis_stress), so it assumed exams. Ask for the cause instead.
const STRESS_WORDS = new Set("stressed stress stressful pressured overwhelmed burnout burntout burnedout drained nastress nasstress naistress".split(" "));
const STRESS_EXTRA_EN = new Set("feel feeling feelings so very super really too much out lately today now right always kinda bit little".split(" "));
const STRESS_EXTRA_TL = new Set("sobrang sobra talaga ngayon lagi palagi medyo nako".split(" "));

export function stressWithoutCause(message: string): "en" | "tl" | null {
  const words = message.toLowerCase().replace(/['’-]/g, "").replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 6 || !words.some((w) => STRESS_WORDS.has(w))) return null;
  const known = (w: string) => STRESS_WORDS.has(w) || FILLER_EN.has(w) || FILLER_TL.has(w) || STRESS_EXTRA_EN.has(w) || STRESS_EXTRA_TL.has(w);
  if (!words.every(known)) return null;
  const tl = (w: string) => (FILLER_TL.has(w) || STRESS_EXTRA_TL.has(w) || w.startsWith("na")) && !FILLER_EN.has(w);
  return words.some(tl) ? "tl" : "en";
}

const STRESS_QUESTION = {
  en: "That sounds heavy. What's been stressing you out lately? School, family, friends, or something else?",
  tl: "Mukhang mabigat 'yan. Ano ang nagpapa-stress sa'yo ngayon? School, pamilya, kaibigan, o iba pa?",
};

// A short message that names only a person or a vague state ("my mom",
// "someone", "lost", "not good", "may problema ako") made the classifier
// guess a specific topic: "someone" -> abuse_harassment, "lost" -> grief_loss,
// "not good" -> feeling_okay, "tulong" -> bot_capabilities. Found by running
// vague messages through the real model; ask for more detail instead.
const PEOPLE = new Set("mom mommy mother dad daddy father parent parents family sister brother sibling siblings friend friends bestfriend bff classmate classmates teacher teachers adviser professor prof someone somebody person boyfriend girlfriend bf gf crush school class section nanay tatay mama papa ina ama magulang pamilya kapatid kuya ate kaibigan barkada kaklase guro titser propesor jowa".split(" "));
const CONNECT = new Set("its about with regarding of our tungkol kay ni mga namin natin po".split(" "));
const VAGUE_PHRASES = new Set([
  "confused", "im confused", "i feel confused", "im so confused",
  "lost", "im lost", "i feel lost", "im so lost",
  "worried", "i feel worried",
  "not good", "not great", "not so good", "not really good", "im not good", "im not great",
  "nahihirapan ako", "nahihirapan na ako", "sobrang nahihirapan ako",
  "everything is hard", "life is hard", "its hard", "its so hard", "this is hard", "ang hirap", "ang hirap na",
  "ayoko na talaga",
  "may problema ako", "i have a problem", "i got a problem", "im in trouble",
  "may tanong ako", "pwede ba magtanong", "pwede po magtanong", "can i ask", "can i ask something", "can i ask a question", "i have a question",
  "i dont know what to do", "idk what to do", "hindi ko alam gagawin ko", "hindi ko na alam gagawin ko", "hindi ko alam ang gagawin ko", "di ko alam gagawin ko",
  "tulong", "tulungan mo ako", "something is wrong", "may nangyari",
]);
const TL_WORDS = new Set("ako ko mo ka ang may na po ba pwede hindi di alam gagawin hirap nahihirapan sobrang tulong tulungan problema tanong magtanong nangyari ayoko talaga kay ni tungkol mga namin natin nanay tatay mama papa ina ama magulang pamilya kapatid kuya ate kaibigan barkada kaklase guro titser propesor jowa".split(" "));

function words(message: string) {
  return message.toLowerCase().replace(/['’-]/g, "").replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
}

export function needsMoreDetail(message: string): "en" | "tl" | null {
  const w = words(message);
  if (w.length === 0) return null;
  const peopleOnly = w.length <= 6 && w.some((x) => PEOPLE.has(x))
    && w.every((x) => PEOPLE.has(x) || CONNECT.has(x) || FILLER_EN.has(x) || FILLER_TL.has(x));
  if (!peopleOnly && !VAGUE_PHRASES.has(w.join(" "))) return null;
  return w.some((x) => TL_WORDS.has(x) && !FILLER_EN.has(x)) ? "tl" : "en";
}

const MORE_DETAIL = {
  en: "I'm here. What's on your mind? Tell me a bit more.",
  tl: "Nandito ako. Ano ang nasa isip mo? Ikuwento mo lang.",
};

// Any crisis or abuse wording skips every check above, so the message always
// reaches the service's crisis/abuse keyword lists (and the Guidance
// Associate alert) unchanged.
const SAFETY_STEMS = ["die", "dead", "death", "kill", "suicid", "hurt", "harm", "cut", "mamatay", "mamamatay", "magpakamatay", "mabuhay", "patay", "saktan", "sinasaktan", "wakasan", "tapusin", "disappear", "mawala", "rape", "molest", "harass", "abuse", "hit", "beat", "bugbog", "binubugbog", "hinipuan", "ginahasa", "bastos"];

export function hasSafetyWord(message: string): boolean {
  return words(message).some((x) => SAFETY_STEMS.some((s) => x.startsWith(s)));
}

// context: the intent of E-Gabay's previous reply, so "yes"/"no" can continue that topic
export async function getNlpReply(message: string, context?: string | null): Promise<NlpReply> {
  if (hasSafetyWord(message)) return classify(message, context);

  const unfinished = unfinishedFeeling(message);
  if (unfinished) {
    const question = FEELING_QUESTION[unfinished];
    return { response: question, intent: "feeling_unclear", language: unfinished, label: null, responses: [question], suggestions: [] };
  }
  const opener = unfinishedOpener(message);
  if (opener) {
    const prompt = GO_ON[opener];
    return { response: prompt, intent: "unfinished_message", language: opener, label: null, responses: [prompt], suggestions: [] };
  }
  const stress = stressWithoutCause(message);
  if (stress) {
    const question = STRESS_QUESTION[stress];
    return { response: question, intent: "stress_unclear", language: stress, label: null, responses: [question], suggestions: [] };
  }
  const vague = needsMoreDetail(message);
  if (vague) {
    const prompt = MORE_DETAIL[vague];
    return { response: prompt, intent: "needs_more_detail", language: vague, label: null, responses: [prompt], suggestions: [] };
  }

  return classify(message, context);
}

async function classify(message: string, context?: string | null): Promise<NlpReply> {
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
