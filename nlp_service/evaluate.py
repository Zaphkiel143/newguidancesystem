"""Scores a trained model on the held-out test set (tests/test_set.json).

Usage: python evaluate.py [--model PATH] [--intents PATH] [--json OUT]
"""

import argparse
import collections
import json
from pathlib import Path

import joblib
from sklearn.metrics import classification_report

from engine import Engine

BASE_DIR = Path(__file__).parent
DECLINE = {"fallback", "out_of_scope"}


def evaluate(model_path, intents_path, test_path):
    model = joblib.load(model_path)
    intents = json.load(open(intents_path, encoding="utf-8"))["intents"]
    items = json.load(open(test_path, encoding="utf-8"))["items"]
    engine = Engine(model, intents)
    known = set(engine.intents)

    rows = []
    for item in items:
        tag, conf, _ = engine.classify(item["text"])
        expected = item["intent"]
        # Declining an off-topic message (fallback or out_of_scope) counts as correct
        correct = tag == expected or (expected == "out_of_scope" and tag in DECLINE)
        rows.append({**item, "predicted": tag, "confidence": round(conf, 2), "correct": correct,
                     "existing_topic": expected in ORIGINAL_TOPICS})

    def acc(subset):
        return round(100 * sum(r["correct"] for r in subset) / len(subset), 1) if subset else None

    wrong_confident = [r for r in rows if not r["correct"] and r["predicted"] not in DECLINE]
    summary = {
        "test_messages": len(rows),
        "accuracy_all": acc(rows),
        "accuracy_existing_topics": acc([r for r in rows if r["existing_topic"]]),
        "accuracy_new_topics": acc([r for r in rows if not r["existing_topic"]]),
        "confidently_wrong": len(wrong_confident),
        "confidently_wrong_pct": round(100 * len(wrong_confident) / len(rows), 1),
        "topics_known_to_model": len(known),
    }
    y_true = ["out_of_scope" if (r["intent"] == "out_of_scope") else r["intent"] for r in rows]
    y_pred = ["out_of_scope" if (r["intent"] == "out_of_scope" and r["predicted"] in DECLINE) else r["predicted"] for r in rows]
    report = classification_report(y_true, y_pred, zero_division=0, output_dict=True)
    return summary, rows, report


# Topics the original (baseline) chatbot already had
ORIGINAL_TOPICS = {
    "greeting", "goodbye", "thanks", "exam_stress", "time_management", "bullying", "family_problems",
    "friendship_issues", "career_question", "self_esteem", "crisis", "book_appointment", "walk_in",
    "office_hours", "no_record", "worried_about_someone", "office_location_contact", "consultation_length",
    "cancel_reschedule", "confidentiality", "referral_process", "document_requirements", "clearance_inventory",
    "exit_interview", "parent_contact", "faculty_concern", "urgent_after_hours", "services_offered", "seek_help",
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default=str(BASE_DIR / "model" / "intent_classifier.joblib"))
    parser.add_argument("--intents", default=str(BASE_DIR / "intents.json"))
    parser.add_argument("--test", default=str(BASE_DIR / "tests" / "test_set.json"))
    parser.add_argument("--json", help="write the full results to this file")
    args = parser.parse_args()

    summary, rows, report = evaluate(args.model, args.intents, args.test)
    for k, v in summary.items():
        print(f"{k:28s} {v}")
    print(f"{'macro_f1':28s} {round(100 * report['macro avg']['f1-score'], 1)}")
    misses = collections.Counter((r["intent"], r["predicted"]) for r in rows if not r["correct"])
    print("\nMost common mistakes (expected -> predicted):")
    for (exp, pred), n in misses.most_common(10):
        print(f"  {n}x  {exp} -> {pred}")
    if args.json:
        json.dump({"summary": summary, "macro_f1": report["macro avg"]["f1-score"], "rows": rows, "report": report},
                  open(args.json, "w", encoding="utf-8"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
