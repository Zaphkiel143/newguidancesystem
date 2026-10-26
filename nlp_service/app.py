"""E-Gabay intent-classification chatbot service"""

import json
import os
from pathlib import Path
from typing import Optional

import joblib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from engine import Engine

BASE_DIR = Path(__file__).parent
INTENTS_PATH = BASE_DIR / "intents.json"
MODEL_PATH = BASE_DIR / "model" / "intent_classifier.joblib"

app = FastAPI(title="E-Gabay NLP Service")

# Comma-separated list of origins allowed to call this service
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

_engine: Optional[Engine] = None


@app.on_event("startup")
def load_model():
    global _engine
    if not MODEL_PATH.exists():
        raise RuntimeError(f"No trained model found at {MODEL_PATH}. Run `python train.py` first.")
    with open(INTENTS_PATH, "r", encoding="utf-8") as f:
        intents = json.load(f)["intents"]
    _engine = Engine(joblib.load(MODEL_PATH), intents)


class ChatRequest(BaseModel):
    message: str
    # Intent of E-Gabay's previous reply, so "yes"/"no" can continue that topic
    context: Optional[str] = None


class Suggestion(BaseModel):
    intent: str
    label: str
    message: str


class ChatResponse(BaseModel):
    intent: str
    confidence: float
    language: str
    response: str
    suggestions: list[Suggestion] = []


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": _engine is not None}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    if _engine is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="message cannot be empty")
    return ChatResponse(**_engine.reply(req.message, req.context))
