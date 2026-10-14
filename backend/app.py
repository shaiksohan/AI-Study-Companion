"""
AI Study Companion - Flask backend

Run it with:  python app.py
Then the API is available at http://localhost:5000

This app is the only place that talks to Ollama. The React frontend never
needs an API key because everything runs locally on your machine.
"""

import os

from flask import Flask, jsonify
from flask_cors import CORS

import config
from database import init_db
from routes.assistant import assistant_bp
from routes.documents import documents_bp
from routes.flashcards import flashcards_bp
from routes.progress import progress_bp
from routes.quiz import quiz_bp
from routes.system import system_bp


def create_app():
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = config.MAX_CONTENT_LENGTH

    # Allow the Vite dev server (http://localhost:5173) to call this API.
    CORS(app)

    os.makedirs(config.UPLOAD_FOLDER, exist_ok=True)
    init_db()

    # Every route is mounted under /api so it matches the frontend's
    # requests and the Vite dev proxy (see vite.config.js).
    app.register_blueprint(system_bp, url_prefix="/api")
    app.register_blueprint(assistant_bp, url_prefix="/api")
    app.register_blueprint(documents_bp, url_prefix="/api")
    app.register_blueprint(quiz_bp, url_prefix="/api")
    app.register_blueprint(flashcards_bp, url_prefix="/api")
    app.register_blueprint(progress_bp, url_prefix="/api")

    @app.errorhandler(413)
    def too_large(_error):
        return jsonify(error="That file is too large. The limit is 20 MB."), 413

    @app.errorhandler(404)
    def not_found(_error):
        return jsonify(error="Endpoint not found."), 404

    return app


app = create_app()


if __name__ == "__main__":
    print(f"AI Study Companion backend starting on http://{config.FLASK_HOST}:{config.FLASK_PORT}")
    print(f"  Ollama URL : {config.OLLAMA_API_URL}")
    print(f"  Model      : {config.OLLAMA_MODEL}")
    app.run(host=config.FLASK_HOST, port=config.FLASK_PORT, debug=config.FLASK_DEBUG)
