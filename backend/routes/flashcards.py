"""Flashcard generation."""

import json
import re

from flask import Blueprint, jsonify, request

import ollama_client
from ollama_client import OllamaBadResponse, OllamaUnavailable

flashcards_bp = Blueprint("flashcards", __name__)


@flashcards_bp.post("/flashcards/generate")
def generate_flashcards():
    data = request.get_json(silent=True) or {}
    topic = (data.get("topic") or "").strip()
    source_text = (data.get("text") or "").strip()
    count = data.get("count", 8)

    if not topic:
        return jsonify(error="Please provide a topic."), 400
    try:
        count = max(1, min(20, int(count)))
    except (TypeError, ValueError):
        return jsonify(error="Number of cards must be between 1 and 20."), 400

    base = f"Create {count} study flashcards about the topic: \"{topic}\"."
    if source_text:
        base += (
            "\nBase the flashcards on the following notes:\n"
            f"{source_text[:6000]}"
        )
    prompt = base + """

Return ONLY valid JSON:
{
  "flashcards": [
    { "question": "Front of the card", "answer": "Back of the card" }
  ]
}

Rules:
- Questions are short and test understanding, not trivial recall.
- Answers are 1-3 sentences.
- No markdown code fences, no extra text, only the JSON object.
"""

    messages = [
        {"role": "system", "content": "You are a strict JSON flashcard generator."},
        {"role": "user", "content": prompt},
    ]

    try:
        raw = ollama_client.chat(messages, temperature=0.5, json_mode=True)
    except OllamaUnavailable as exc:
        return jsonify(error=str(exc), code="ollama_unavailable"), 503
    except OllamaBadResponse as exc:
        return jsonify(error=str(exc), code="bad_response"), 502

    cards = _parse_flashcards(raw)
    if not cards:
        return jsonify(
            error="The model did not return usable flashcards. Please try again.",
            code="bad_format",
        ), 502

    return jsonify(flashcards=cards)


def _parse_flashcards(raw):
    text = raw.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            return None
        try:
            payload = json.loads(match.group(0))
        except json.JSONDecodeError:
            return None

    raw_cards = payload.get("flashcards", []) if isinstance(payload, dict) else []
    cards = []
    for card in raw_cards:
        question = str(card.get("question", "")).strip()
        answer = str(card.get("answer", "")).strip()
        if question and answer:
            cards.append({"question": question, "answer": answer})
    return cards or None
