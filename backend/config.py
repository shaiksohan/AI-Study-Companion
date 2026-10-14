"""
Central configuration for the AI Study Companion backend.

Every important setting can be changed with an environment variable,
so you never need to edit code to point at a different Ollama server
or model.
"""

import os

# --- Ollama settings -------------------------------------------------------
# The local address where Ollama is running.
OLLAMA_API_URL = os.environ.get("OLLAMA_API_URL", "http://localhost:11434").rstrip("/")

# The model you want to use. The default matches the model that ships with
# this project's setup (Qwen 2.5 Coder 7B).
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5-coder:7b")

# How long we wait for Ollama before telling the user it is unavailable.
# A 7B model on CPU can need a few minutes for the very first reply while
# the model loads into memory, so the default is generous.
OLLAMA_TIMEOUT = int(os.environ.get("OLLAMA_TIMEOUT", "300"))

# --- Server settings -------------------------------------------------------
FLASK_HOST = os.environ.get("FLASK_HOST", "127.0.0.1")
# Cloud platforms (Render, Heroku, ...) inject a PORT env var and expect the
# app to bind to it, so prefer that when it is present.
FLASK_PORT = int(os.environ.get("PORT") or os.environ.get("FLASK_PORT", "5000"))
FLASK_DEBUG = os.environ.get("FLASK_DEBUG", "1") == "1"

# --- Storage settings ------------------------------------------------------
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", os.path.join(BASE_DIR, "uploads"))
DATABASE_PATH = os.environ.get("DATABASE_PATH", os.path.join(BASE_DIR, "study.db"))

MAX_CONTENT_LENGTH = 20 * 1024 * 1024  # 20 MB upload limit for PDFs
