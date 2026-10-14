"""Quiz generation, scoring and answer explanations."""

import json
import re

from flask import Blueprint, jsonify, request

import ollama_client
from database import save_quiz_result
from ollama_client import OllamaBadResponse, OllamaUnavailable

quiz_bp = Blueprint("quiz", __name__)

DIFFICULTIES = ("easy", "medium", "hard")


@quiz_bp.post("/quiz/generate")
def generate_quiz():
    data = request.get_json(silent=True) or {}
    subject = (data.get("subject") or "").strip()
    topic = (data.get("topic") or "").strip()
    difficulty = (data.get("difficulty") or "medium").lower()
    count = data.get("count", 5)

    if not subject or not topic:
        return jsonify(error="Please provide both a subject and a topic."), 400
    if difficulty not in DIFFICULTIES:
        return jsonify(error="Difficulty must be easy, medium or hard."), 400
    try:
        count = max(1, min(10, int(count)))
    except (TypeError, ValueError):
        return jsonify(error="Number of questions must be between 1 and 10."), 400

    prompt = f"""
Create a multiple-choice quiz about the topic "{topic}" in the subject "{subject}".
Difficulty: {difficulty}.
Number of questions: {count}.

Return ONLY valid JSON with this exact shape:
{{
  "questions": [
    {{
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0,
      "explanation": "A short explanation of why the correct answer is right"
    }}
  ]
}}

Rules:
- Exactly 4 answer options per question.
- correct_index is the 0-based position of the correct option (0 to 3).
- No markdown, no extra text, only the JSON object.
""".strip()

    messages = [
        {"role": "system", "content": "You are a strict JSON quiz generator for students."},
        {"role": "user", "content": prompt},
    ]

    try:
        raw = ollama_client.chat(messages, temperature=0.4, json_mode=True)
    except OllamaUnavailable as exc:
        return jsonify(error=str(exc), code="ollama_unavailable"), 503
    except OllamaBadResponse as exc:
        return jsonify(error=str(exc), code="ollama_bad_response"), 502

    questions = _parse_quiz(raw)
    if not questions:
        return jsonify(
            error="The model did not return a usable quiz. Please try again.",
            code="bad_quiz_format",
        ), 502

    return jsonify(
        quiz={
            "subject": subject,
            "topic": topic,
            "difficulty": difficulty,
            "questions": questions,
        }
    )


@quiz_bp.post("/quiz/submit")
def submit_quiz():
    """Save a finished quiz result so the Progress page can show it."""
    data = request.get_json(silent=True) or {}
    subject = (data.get("subject") or "").strip()
    topic = (data.get("topic") or "").strip()
    difficulty = (data.get("difficulty") or "medium").lower()
    total = data.get("total_questions")
    correct = data.get("correct_answers")

    if not subject or not topic:
        return jsonify(error="Missing subject or topic."), 400
    try:
        total = int(total)
        correct = int(correct)
    except (TypeError, ValueError):
        return jsonify(error="total_questions and correct_answers must be numbers."), 400
    if total <= 0 or correct < 0 or correct > total:
        return jsonify(error="Invalid score values."), 400

    percentage = save_quiz_result(subject, topic, difficulty, total, correct)
    return jsonify(saved=True, percentage=percentage)


def _parse_quiz(raw):
    """Extract a clean list of question dicts from the model's reply."""
    text = raw.strip()
    # The model occasionally wraps JSON in ``` ... ```
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()

    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        # Last resort: find the first {...} block in the text.
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            return None
        try:
            payload = json.loads(match.group(0))
        except json.JSONDecodeError:
            return None

    raw_questions = payload.get("questions", []) if isinstance(payload, dict) else []
    clean = []
    for q in raw_questions:
        options = q.get("options", [])
        correct_index = q.get("correct_index", -1)
        if not isinstance(options, list) or len(options) != 4:
            continue
        if not isinstance(correct_index, int) or not 0 <= correct_index <= 3:
            continue
        clean.append(
            {
                "question": str(q.get("question", "")).strip(),
                "options": [str(o).strip() for o in options],
                "correct_index": correct_index,
                "explanation": str(q.get("explanation", "")).strip(),
            }
        )
    return clean or None
