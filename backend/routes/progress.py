"""Study progress from the SQLite database."""

from flask import Blueprint, jsonify

from database import get_progress

progress_bp = Blueprint("progress", __name__)


@progress_bp.get("/progress")
def progress():
    return jsonify(get_progress())
