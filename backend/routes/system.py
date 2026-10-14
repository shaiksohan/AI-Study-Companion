"""System routes: health check and Ollama status."""

from flask import Blueprint, jsonify

import ollama_client
from config import OLLAMA_API_URL, OLLAMA_MODEL

system_bp = Blueprint("system", __name__)


@system_bp.get("/health")
def health():
    """Used by the frontend banner to show whether Ollama is reachable."""
    online, models = ollama_client.check_connection()
    configured_model_ready = any(
        m == OLLAMA_MODEL or m.split(":")[0] == OLLAMA_MODEL for m in models
    )
    return jsonify(
        status="ok",
        ollama={
            "online": online,
            "url": OLLAMA_API_URL,
            "model": OLLAMA_MODEL,
            "model_available": configured_model_ready,
            "models": models,
        },
    )
