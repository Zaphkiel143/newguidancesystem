"""Paraphrase augmentation for the training phrases (English, Tagalog, Taglish).

Each phrase gets a few rule-based variants: synonym swaps, common chat spellings,
and natural openers. Seeded, so every training run produces the same data.
"""

import random
import re

SYNONYMS = [
    ["guidance office", "gco", "guidance", "guidance and counseling office"],
    ["appointment", "schedule", "session", "consultation"],
    ["counselor", "guidance associate", "guidance counselor"],
    ["parents", "mom and dad", "family"],
    ["exam", "quiz", "test"],
    ["exams", "quizzes", "tests"],
    ["classmates", "groupmates", "blockmates"],
    ["friends", "barkada", "friend group"],
    ["teacher", "prof", "instructor"],
    ["sad", "down", "upset"],
    ["happy", "glad", "good"],
    ["angry", "mad", "pissed"],
    ["stressed", "pressured", "overwhelmed"],
    ["magulang", "mama at papa", "parents"],
    ["kaibigan", "barkada", "tropa"],
    ["kaklase", "classmate", "blockmate"],
]
SPELLINGS = [
    ("i'm", "im"), ("i am", "i'm"), ("don't", "dont"), ("can't", "cant"), ("you", "u"),
    ("paano", "pano"), ("kailangan", "kelangan"), ("ano", "anu"), ("talaga", "tlga"),
    ("ngayon", "ngaun"), ("sobrang", "super"), ("hindi", "di"),
]
OPENERS_EN = ["", "hi ", "um ", "honestly ", "can you tell me ", "i want to know "]
OPENERS_FEEL_EN = ["", "honestly ", "lately ", "i think ", "today "]
OPENERS_TL = ["", "ano po ", "grabe ", "pwede po bang malaman ", "huhu "]
CLOSERS_TL = ["", " po", " naman", " lang"]
SHORT = {"affirm", "deny", "greeting", "goodbye", "thanks", "how_are_you"}
FEELINGS = {"feeling_happy", "feeling_sad", "feeling_anxious", "feeling_angry", "feeling_okay",
            "exam_stress", "thesis_stress", "self_esteem", "family_problems", "friendship_issues", "bullying",
            "loneliness", "sleep_problems", "relationship_problems", "grief_loss", "abuse_harassment",
            "addiction_concern", "pregnancy_concern", "gender_identity", "school_adjustment", "peer_pressure"}
TL_HINTS = re.compile(r"\b(ako|ko|mo|ba|po|ang|ng|sa|na|naman|kasi|hindi|paano|ano|saan|kailan)\b")


def _swap(text, rng):
    for group in SYNONYMS:
        for word in group:
            if re.search(rf"\b{re.escape(word)}\b", text):
                alt = rng.choice([w for w in group if w != word])
                return re.sub(rf"\b{re.escape(word)}\b", alt, text, count=1)
    return None


def _spell(text, rng):
    options = [(a, b) for a, b in SPELLINGS if re.search(rf"\b{re.escape(a)}\b", text)]
    if not options:
        return None
    a, b = rng.choice(options)
    return re.sub(rf"\b{re.escape(a)}\b", b, text, count=1)


def variants(text, tag, rng, limit=4):
    text = text.lower().strip()
    out = set()
    for make in (_swap, _spell):
        v = make(text, rng)
        if v:
            out.add(v)
    if tag not in SHORT:
        if TL_HINTS.search(text):
            out.add((rng.choice(OPENERS_TL) + text + rng.choice(CLOSERS_TL)).strip())
        else:
            openers = OPENERS_FEEL_EN if tag in FEELINGS else OPENERS_EN
            out.add((rng.choice(openers) + text).strip())
    out.discard(text)
    return sorted(out)[:limit]


def augment(texts, labels, seed=0):
    """Returns the original phrases plus their variants, with matching labels."""
    rng = random.Random(seed)
    new_texts, new_labels = list(texts), list(labels)
    for text, label in zip(texts, labels):
        for v in variants(text, label, rng):
            new_texts.append(v)
            new_labels.append(label)
    return new_texts, new_labels
