"""Classifies a message and picks E-Gabay's reply. Shared by app.py and evaluate.py."""

import random

from lang import detect_language

DEFAULT_THRESHOLD = 0.45
SUGGEST_MIN = 0.12
MAX_SUGGESTIONS = 3
NO_SUGGEST = {"fallback", "out_of_scope", "affirm", "deny", "greeting", "goodbye", "thanks", "crisis"}

# Small talk is only trusted on short messages or with real confidence: a long
# request that merely contains "hello" ("write a python script that prints
# hello world") must not get a cheerful greeting back.
SMALL_TALK = {"greeting", "goodbye", "thanks", "affirm", "deny", "how_are_you", "bot_identity", "feeling_okay"}
SMALL_TALK_MIN = 0.5
SMALL_TALK_MAX_WORDS = 4

# Always answered with the crisis reply, whatever the model predicts
CRISIS_KEYWORDS_EN = [
    "kill myself", "suicide", "end my life", "hurt myself", "self harm",
    "self-harm", "cutting myself", "want to die", "don't want to live",
    "not want to live", "don't want to be alive",
    "dont want to live", "dont want to be alive", "end it all", "giving up on life",
    "wish i was dead", "wish i were dead", "better off dead", "take my own life",
    "suicidal", "want to disappear", "no reason to live",
]
CRISIS_KEYWORDS_TL = [
    "magpakamatay", "papatayin ko na lang sarili", "papatayin ko sarili",
    "saktan ang sarili", "sinasaktan ko ang sarili", "ayoko na mabuhay",
    "ayoko nang mabuhay", "gusto ko nang mamatay", "gusto kong mamatay",
    "wala nang saysay ang buhay", "gusto ko na mawala", "gusto ko nang mawala",
    "ayoko na sa buhay", "gusto ko na mamatay",
    "magpapakamatay", "nagpapakamatay", "patay na lang ako", "mamatay na lang ako",
    "tapusin ang buhay ko", "tatapusin ko na buhay ko", "wawakasan ko na",
]
CRISIS_KEYWORDS = CRISIS_KEYWORDS_EN + CRISIS_KEYWORDS_TL

# Clear signs of abuse or harassment always get the safety reply (911, 1553, tell the GCO)
ABUSE_KEYWORDS = [
    "sexually harassed", "harassing me", "molested", "molesting me", "raped", "rape me", "touched me inappropriately",
    "touched me without", "abusing me", "abused me", "hits me at home", "beats me", "beating me",
    "hinipuan", "minolestya", "ginahasa", "binastos ako", "binabastos ako", "pinagbubuhatan", "binubugbog ako",
    "hinarass", "hina-harass", "nangha-harass",
]


class Engine:
    def __init__(self, model, intents):
        # model is either a fitted Pipeline or {"pipeline": ..., "threshold": ...}
        if isinstance(model, dict):
            self.pipeline = model["pipeline"]
            self.threshold = model.get("threshold", DEFAULT_THRESHOLD)
        else:
            self.pipeline = model
            self.threshold = DEFAULT_THRESHOLD
        self.intents = {i["tag"]: i for i in intents}

    def classify(self, message):
        """Returns (tag, confidence, ranked [(tag, prob), ...])."""
        if any(k in message.lower() for k in CRISIS_KEYWORDS):
            return "crisis", 1.0, [("crisis", 1.0)]
        if "abuse_harassment" in self.intents and any(k in message.lower() for k in ABUSE_KEYWORDS):
            return "abuse_harassment", 1.0, [("abuse_harassment", 1.0)]
        probs = self.pipeline.predict_proba([message])[0]
        ranked = sorted(zip(self.pipeline.classes_, probs), key=lambda p: -p[1])
        tag, conf = ranked[0]
        if conf < self.threshold:
            tag = "fallback"
        elif tag in SMALL_TALK and conf < SMALL_TALK_MIN and len(message.split()) > SMALL_TALK_MAX_WORDS:
            tag = "fallback"
        return tag, float(conf), [(t, float(p)) for t, p in ranked]

    def _pick(self, intent, language):
        pool = self._pool(intent, language)
        return random.choice(pool) if pool else ""

    def _pool(self, intent, language):
        return intent.get(f"responses_{language}") or intent.get("responses_en") or []

    def _label(self, intent, language):
        return intent.get(f"label_{language}") or intent.get("label_en")

    def _suggestions(self, ranked, language):
        out = []
        for tag, prob in ranked:
            intent = self.intents.get(tag)
            if prob < SUGGEST_MIN or tag in NO_SUGGEST or not intent or "label_en" not in intent:
                continue
            out.append({
                "intent": tag,
                "label": intent.get(f"label_{language}") or intent["label_en"],
                "message": intent.get(f"example_{language}") or intent["example_en"],
            })
            if len(out) == MAX_SUGGESTIONS:
                break
        return out

    def reply(self, message, context=None):
        """context is the intent of E-Gabay's previous reply, if any.

        The reply also carries the matched intent's label and official answer
        pool so the app can ground AI-generated replies (lib/ai.ts) on the
        guidance office's real information.
        """
        message = message.strip()
        language = detect_language(message)
        tag, conf, ranked = self.classify(message)

        # Short "yes"/"no" answers continue the previous topic's follow-up question
        if tag in ("affirm", "deny") and context in self.intents:
            target = self.intents[context].get("followups", {}).get(tag)
            if target in self.intents:
                target_intent = self.intents[target]
                return {"intent": target, "confidence": conf, "language": language,
                        "label": self._label(target_intent, language),
                        "response": self._pick(target_intent, language),
                        "responses": self._pool(target_intent, language),
                        "suggestions": []}

        intent = self.intents.get(tag) or self.intents["fallback"]
        suggestions = self._suggestions(ranked, language) if tag == "fallback" else []
        return {"intent": tag, "confidence": conf, "language": language,
                "label": self._label(intent, language),
                "response": self._pick(intent, language),
                "responses": self._pool(intent, language),
                "suggestions": suggestions}
