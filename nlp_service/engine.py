"""Classifies a message and picks E-Gabay's reply. Shared by app.py and evaluate.py."""

import random

from lang import detect_language

DEFAULT_THRESHOLD = 0.45
SUGGEST_MIN = 0.12
MAX_SUGGESTIONS = 3
NO_SUGGEST = {"fallback", "out_of_scope", "affirm", "deny", "greeting", "goodbye", "thanks", "crisis"}

# Always answered with the crisis reply, whatever the model predicts
CRISIS_KEYWORDS_EN = [
    "kill myself", "suicide", "end my life", "hurt myself", "self harm",
    "self-harm", "cutting myself", "want to die", "don't want to live",
    "not want to live", "don't want to be alive",
    "dont want to live", "dont want to be alive", "end it all", "giving up on life",
]
CRISIS_KEYWORDS_TL = [
    "magpakamatay", "papatayin ko na lang sarili", "papatayin ko sarili",
    "saktan ang sarili", "sinasaktan ko ang sarili", "ayoko na mabuhay",
    "ayoko nang mabuhay", "gusto ko nang mamatay", "gusto kong mamatay",
    "wala nang saysay ang buhay", "gusto ko na mawala", "gusto ko nang mawala",
    "ayoko na sa buhay", "gusto ko na mamatay",
]
CRISIS_KEYWORDS = CRISIS_KEYWORDS_EN + CRISIS_KEYWORDS_TL


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
        probs = self.pipeline.predict_proba([message])[0]
        ranked = sorted(zip(self.pipeline.classes_, probs), key=lambda p: -p[1])
        tag, conf = ranked[0]
        if conf < self.threshold:
            tag = "fallback"
        return tag, float(conf), [(t, float(p)) for t, p in ranked]

    def _pick(self, intent, language):
        pool = intent.get(f"responses_{language}") or intent.get("responses_en") or []
        return random.choice(pool) if pool else ""

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
        """context is the intent of E-Gabay's previous reply, if any."""
        message = message.strip()
        language = detect_language(message)
        tag, conf, ranked = self.classify(message)

        # Short "yes"/"no" answers continue the previous topic's follow-up question
        if tag in ("affirm", "deny") and context in self.intents:
            target = self.intents[context].get("followups", {}).get(tag)
            if target in self.intents:
                return {"intent": target, "confidence": conf, "language": language,
                        "response": self._pick(self.intents[target], language), "suggestions": []}

        intent = self.intents.get(tag) or self.intents["fallback"]
        suggestions = self._suggestions(ranked, language) if tag == "fallback" else []
        return {"intent": tag, "confidence": conf, "language": language,
                "response": self._pick(intent, language), "suggestions": suggestions}
