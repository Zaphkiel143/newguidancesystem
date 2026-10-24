"""E-Gabay intent-classification chatbot service"""

import json
import os
import random
from pathlib import Path

import joblib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from lang import detect_language

BASE_DIR = Path(__file__).parent
INTENTS_PATH = BASE_DIR / "intents.json"
MODEL_PATH = BASE_DIR / "model" / "intent_classifier.joblib"

# Below this confidence, reply with the fallback instead of guessing
CONFIDENCE_THRESHOLD = 0.45

# Crisis phrases always get the crisis reply, whatever the model predicts
CRISIS_KEYWORDS_EN = [
    "kill myself", "suicide", "end my life", "hurt myself", "self harm",
    "self-harm", "cutting myself", "want to die", "don't want to live",
    "not want to live", "don't want to be alive",
    # students often skip the apostrophe
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

app = FastAPI(title="E-Gabay NLP Service")

# Comma-separated list of origins allowed to call this service
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

_pipeline = None
# tag -> {"en": [...], "tl": [...]}
_responses_by_tag: dict[str, dict[str, list[str]]] = {}


@app.on_event("startup")
def load_model():
    global _pipeline, _responses_by_tag

    if not MODEL_PATH.exists():
        raise RuntimeError(
            f"No trained model found at {MODEL_PATH}. Run `python train.py` first."
        )
    _pipeline = joblib.load(MODEL_PATH)

    with open(INTENTS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    _responses_by_tag = {
        intent["tag"]: {"en": intent["responses_en"], "tl": intent["responses_tl"]}
        for intent in data["intents"]
    }


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    intent: str
    confidence: float
    language: str
    response: str


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": _pipeline is not None}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    if _pipeline is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    message = req.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="message cannot be empty")

    language = detect_language(message)

    lowered = message.lower()
    if any(keyword in lowered for keyword in CRISIS_KEYWORDS):
        tag = "crisis"
        confidence = 1.0
    else:
        probabilities = _pipeline.predict_proba([message])[0]
        classes = _pipeline.classes_
        best_index = probabilities.argmax()
        confidence = float(probabilities[best_index])
        tag = classes[best_index] if confidence >= CONFIDENCE_THRESHOLD else "fallback"

    responses = _responses_by_tag.get(tag, _responses_by_tag["fallback"])
    response_pool = responses.get(language) or responses.get("en", [])
    response_text = random.choice(response_pool)
    return ChatResponse(intent=tag, confidence=confidence, language=language, response=response_text)
