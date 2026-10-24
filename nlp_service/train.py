"""Trains the E-Gabay intent classifier on nlp_service/intents.json"""

import json
from pathlib import Path

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import FeatureUnion, Pipeline

BASE_DIR = Path(__file__).parent
INTENTS_PATH = BASE_DIR / "intents.json"
MODEL_PATH = BASE_DIR / "model" / "intent_classifier.joblib"


def load_training_data():
    with open(INTENTS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    texts, labels = [], []
    for intent in data["intents"]:
        # "fallback" has no patterns; it is only used when confidence is low
        for pattern in intent["patterns_en"] + intent["patterns_tl"]:
            texts.append(pattern)
            labels.append(intent["tag"])

    return texts, labels


def main():
    texts, labels = load_training_data()
    print(f"Loaded {len(texts)} training examples across {len(set(labels))} intents.")

    # Word features catch phrasing; character features catch spelling variations
    pipeline = Pipeline([
        ("features", FeatureUnion([
            ("words", TfidfVectorizer(ngram_range=(1, 2), lowercase=True, sublinear_tf=True)),
            ("chars", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), lowercase=True, sublinear_tf=True)),
        ])),
        ("clf", LogisticRegression(max_iter=3000, C=10)),
    ])

    # Small dataset, so cross-validation estimates accuracy
    scores = cross_val_score(pipeline, texts, labels, cv=StratifiedKFold(3, shuffle=True, random_state=0))
    print(f"Cross-validation accuracy: {scores.mean():.2f} (folds: {[round(s, 2) for s in scores]})")

    pipeline.fit(texts, labels)

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    print(f"Saved trained model to {MODEL_PATH}")


if __name__ == "__main__":
    main()
