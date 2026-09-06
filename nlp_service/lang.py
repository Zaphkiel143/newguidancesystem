"""Lightweight English/Tagalog detector for short chat messages.

Statistical detectors (e.g. langdetect) are unreliable on short, informal
text like SMS-style Taglish, so this uses a curated list of common Tagalog
function words instead - simple, transparent, and easy to tune.
"""

import re

TAGALOG_MARKERS = {
    "ako", "ko", "mo", "ka", "kita", "natin", "namin", "tayo", "sila", "niya",
    "kanya", "hindi", "oo", "opo", "po", "ba", "naman", "kasi", "pero", "dahil",
    "kung", "kapag", "para", "sa", "ng", "mga", "ang", "na", "at", "pa", "din",
    "rin", "lang", "talaga", "ngayon", "kailan", "saan", "paano", "bakit",
    "ganito", "ganyan", "gusto", "ayaw", "hirap", "tulong", "pakiramdam",
    "nararamdaman", "kumusta", "kamusta", "musta", "salamat", "paalam",
    "magulang", "kaibigan", "kaklase", "bukas", "kailangan", "nalulungkot",
    "malungkot", "takot", "kinakabahan", "sobrang", "wala", "meron", "may",
    "yung", "nga", "diba", "eh", "kayo", "nila", "nag", "mag", "aalis",
}

TAGALOG_THRESHOLD = 0.2


def detect_language(text: str) -> str:
    """Returns "tl" if the message reads as Tagalog/Taglish, else "en"."""
    words = re.findall(r"[a-zA-Z']+", text.lower())
    if not words:
        return "en"

    tagalog_hits = sum(1 for w in words if w in TAGALOG_MARKERS)
    score = tagalog_hits / len(words)
    return "tl" if score >= TAGALOG_THRESHOLD else "en"
