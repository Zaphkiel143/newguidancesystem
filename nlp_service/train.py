"""Trains the E-Gabay intent classifier on nlp_service/intents.json"""

import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import FeatureUnion, Pipeline

from augment import augment

BASE_DIR = Path(__file__).parent
INTENTS_PATH = BASE_DIR / "intents.json"
MODEL_PATH = BASE_DIR / "model" / "intent_classifier.joblib"
THRESHOLDS = [round(t, 2) for t in np.arange(0.20, 0.71, 0.05)]


def load_training_data():
    with open(INTENTS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    texts, labels = [], []
    for intent in data["intents"]:
        # Reply-only topics (fallback, follow-ups) have no patterns
        for pattern in intent["patterns_en"] + intent["patterns_tl"]:
            texts.append(pattern.lower().strip())
            labels.append(intent["tag"])
    return texts, labels


def build_pipeline():
    # Word features catch phrasing; character features catch spelling variations
    return Pipeline([
        ("features", FeatureUnion([
            ("words", TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True)),
            ("chars", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), sublinear_tf=True)),
        ])),
        ("clf", LogisticRegression(max_iter=3000, C=10, class_weight="balanced")),
    ])


def cross_validate(texts, labels, folds=5):
    """Out-of-fold probabilities; augmentation is applied to each training fold only."""
    texts, labels = np.array(texts, dtype=object), np.array(labels)
    classes = sorted(set(labels))
    oof = np.zeros((len(texts), len(classes)))
    for train_idx, test_idx in StratifiedKFold(folds, shuffle=True, random_state=0).split(texts, labels):
        aug_x, aug_y = augment(list(texts[train_idx]), list(labels[train_idx]))
        model = build_pipeline().fit(aug_x, aug_y)
        probs = model.predict_proba(list(texts[test_idx]))
        for j, c in enumerate(model.classes_):
            oof[test_idx, classes.index(c)] = probs[:, j]
    return oof, classes, labels


def pick_threshold(oof, classes, labels):
    """+1 correct, 0 for "not sure" (fallback), -1 for a confident wrong answer."""
    best, best_score = None, None
    pred = np.array(classes)[oof.argmax(1)]
    conf = oof.max(1)
    for t in THRESHOLDS:
        sure = conf >= t
        score = int(((pred == labels) & sure).sum()) - int(((pred != labels) & sure).sum())
        if best_score is None or score > best_score:
            best, best_score = t, score
    return best


def main():
    texts, labels = load_training_data()
    print(f"Loaded {len(texts)} training examples across {len(set(labels))} intents.")

    oof, classes, y = cross_validate(texts, labels)
    accuracy = (np.array(classes)[oof.argmax(1)] == y).mean()
    threshold = pick_threshold(oof, classes, y)
    print(f"Cross-validation accuracy: {accuracy:.2f} (5 folds, augmentation inside each fold)")
    print(f"Confidence threshold: {threshold}")

    aug_x, aug_y = augment(texts, labels)
    print(f"Training on {len(aug_x)} phrases after augmentation.")
    pipeline = build_pipeline().fit(aug_x, aug_y)

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"pipeline": pipeline, "threshold": threshold}, MODEL_PATH)
    print(f"Saved trained model to {MODEL_PATH}")


if __name__ == "__main__":
    main()
