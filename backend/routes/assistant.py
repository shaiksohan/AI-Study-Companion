"""AI Study Assistant: explain, summarize, or give examples."""

from flask import Blueprint, jsonify, request

import ollama_client
from ollama_client import OllamaBadResponse, OllamaUnavailable

assistant_bp = Blueprint("assistant", __name__)

# Each mode gives the model slightly different instructions.
MODE_PROMPTS = {
    "explain": (
        "You are a friendly, expert tutor. Explain the concept clearly for a student. "
        "Use short paragraphs, markdown headings for structure, and bullet points for steps. "
        "Include a code block if the topic is technical."
    ),
    "summarize": (
        "You are a study assistant. Summarize the topic into concise, exam-ready notes. "
        "Use markdown headings, bullet points, and highlight key definitions and formulas."
    ),
    "examples": (
        "You are a study coach. Teach the topic through concrete worked examples. "
        "Give at least two examples, each with a short step-by-step solution. "
        "Use code blocks for any code."
    ),
}


@assistant_bp.post("/assistant")
def ask_assistant():
    data = request.get_json(silent=True) or {}
    question = (data.get("question") or "").strip()
    mode = data.get("mode", "explain")

    if not question:
        return jsonify(error="Please type a question first."), 400
    if mode not in MODE_PROMPTS:
        return jsonify(error=f"Unknown mode '{mode}'."), 400

    messages = [
        {
            "role": "system",
            "content": MODE_PROMPTS[mode]
            + " Answer in well-formatted markdown. Keep answers focused and under 500 words.",
        },
        {"role": "user", "content": question},
    ]

    try:
        answer = ollama_client.chat(messages)
    except OllamaUnavailable as exc:
        return jsonify(error=str(exc), code="ollama_unavailable"), 503
    except OllamaBadResponse as exc:
        return jsonify(error=str(exc), code="ollama_bad_response"), 502

    return jsonify(answer=answer, mode=mode)
