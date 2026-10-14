"""
Everything that talks to Ollama lives here.

Ollama exposes a simple local HTTP API (by default at http://localhost:11434).
We only use two endpoints:

  GET  /api/tags    -> list installed models (also used as a health check)
  POST /api/chat    -> send messages and get a reply

If Ollama is not running, we raise `OllamaUnavailable` with a friendly
message that the frontend can show to the user.
"""

import requests

from config import OLLAMA_API_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT


class OllamaUnavailable(Exception):
    """Raised when the Ollama server cannot be reached."""


class OllamaBadResponse(Exception):
    """Raised when Ollama answers but the reply is unusable."""


def check_connection(timeout=5):
    """Return (online: bool, models: list[str])."""
    try:
        response = requests.get(f"{OLLAMA_API_URL}/api/tags", timeout=timeout)
        response.raise_for_status()
        data = response.json()
        models = [m.get("name", "") for m in data.get("models", [])]
        return True, models
    except (requests.RequestException, ValueError):
        return False, []


def list_models():
    online, models = check_connection()
    if not online:
        raise OllamaUnavailable(_unavailable_message())
    return models


def chat(messages, temperature=0.7, json_mode=False, timeout=None):
    """
    Send a list of {"role": ..., "content": ...} messages to Ollama and
    return the assistant's reply as a string.

    json_mode=True asks Ollama to answer with valid JSON only, which we use
    for quizzes and flashcards.
    """
    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {"temperature": temperature},
    }
    if json_mode:
        payload["format"] = "json"

    try:
        response = requests.post(
            f"{OLLAMA_API_URL}/api/chat",
            json=payload,
            timeout=timeout or OLLAMA_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.ConnectionError:
        raise OllamaUnavailable(_unavailable_message())
    except requests.exceptions.Timeout:
        raise OllamaBadResponse(
            f"Ollama took too long to answer using '{OLLAMA_MODEL}'. "
            "The model may still be loading - try again in a moment."
        )
    except requests.exceptions.HTTPError as exc:
        # Ollama answers with useful details in the body (e.g. out of memory,
        # model failed to load). Pass that detail along to the user.
        detail = _error_detail(response)
        raise OllamaBadResponse(
            f"Ollama returned an error ({response.status_code}): {detail}"
        )
    except requests.RequestException as exc:
        raise OllamaBadResponse(f"Ollama request failed: {exc}")
    except ValueError:
        raise OllamaBadResponse("Ollama returned a response that was not valid JSON.")

    reply = data.get("message", {}).get("content", "")
    if not reply:
        raise OllamaBadResponse("Ollama returned an empty response.")
    return reply


def _error_detail(response):
    """Pull a human-readable message out of an Ollama error response."""
    try:
        data = response.json()
        error = data.get("error")
        if error:
            return str(error)
    except ValueError:
        pass
    return (response.text or "no details provided").strip()[:300]


def _unavailable_message():
    return (
        f"Cannot reach Ollama at {OLLAMA_API_URL}. "
        "Make sure the Ollama desktop app (or `ollama serve`) is running, "
        f"and that the model '{OLLAMA_MODEL}' is installed "
        f"(run: ollama pull {OLLAMA_MODEL})."
    )
