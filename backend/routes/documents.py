"""PDF notes: upload, list, delete, and ask questions about them."""

import os

from flask import Blueprint, jsonify, request
from werkzeug.utils import secure_filename

import ollama_client
from config import UPLOAD_FOLDER
from database import delete_document, get_chunks, list_documents, save_document
from ollama_client import OllamaBadResponse, OllamaUnavailable
from services.pdf_reader import extract_text_from_pdf
from services.retrieval import find_relevant_chunks

documents_bp = Blueprint("documents", __name__)


@documents_bp.get("/documents")
def documents():
    docs = list_documents()
    for doc in docs:
        doc["size_kb"] = round(doc.get("size_bytes", 0) / 1024, 1)
    return jsonify(documents=docs)


@documents_bp.post("/documents/upload")
def upload_document():
    if "file" not in request.files:
        return jsonify(error="No file was included in the request."), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify(error="No file was selected."), 400
    if not file.filename.lower().endswith(".pdf"):
        return jsonify(error="Only PDF files are supported."), 400

    filename = secure_filename(file.filename)
    stored_path = os.path.join(UPLOAD_FOLDER, filename)
    # Avoid overwriting a previous upload with the same name.
    counter = 1
    base, ext = os.path.splitext(stored_path)
    while os.path.exists(stored_path):
        stored_path = f"{base}_{counter}{ext}"
        counter += 1
    file.save(stored_path)

    try:
        text, pages = extract_text_from_pdf(stored_path)
    except Exception as exc:  # noqa: BLE001 - show any PDF problem to the user
        os.remove(stored_path)
        return jsonify(error=f"Could not read that PDF: {exc}"), 400

    if not text.strip():
        os.remove(stored_path)
        return jsonify(
            error="That PDF has no selectable text (it may be a scanned image)."
        ), 400

    chunks = _split_text(text, chunk_size=1200, overlap=150)
    doc_id = save_document(
        filename=os.path.basename(stored_path),
        stored_path=stored_path,
        size_bytes=os.path.getsize(stored_path),
        page_count=pages,
        char_count=len(text),
        chunks=chunks,
    )

    return jsonify(
        document={
            "id": doc_id,
            "filename": os.path.basename(stored_path),
            "page_count": pages,
            "char_count": len(text),
        }
    )


@documents_bp.delete("/documents/<int:doc_id>")
def remove_document(doc_id):
    stored_path = delete_document(doc_id)
    if stored_path and os.path.exists(stored_path):
        try:
            os.remove(stored_path)
        except OSError:
            pass
    return jsonify(deleted=True)


@documents_bp.post("/documents/ask")
def ask_documents():
    data = request.get_json(silent=True) or {}
    question = (data.get("question") or "").strip()
    doc_id = data.get("document_id")

    if not question:
        return jsonify(error="Please type a question about your notes."), 400

    relevant = find_relevant_chunks(question, doc_id=doc_id)
    if not relevant:
        return jsonify(error="No uploaded notes to search. Upload a PDF first."), 400

    context = "\n\n".join(
        f"[From {chunk['filename']}]\n{chunk['content']}" for chunk in relevant
    )
    messages = [
        {
            "role": "system",
            "content": (
                "You are a study assistant. Answer the student's question using ONLY "
                "the provided notes below. If the answer is not in the notes, say so "
                "honestly. Cite the document name when possible. Use markdown formatting."
            ),
        },
        {"role": "user", "content": f"NOTES:\n{context}\n\nQUESTION: {question}"},
    ]

    try:
        answer = ollama_client.chat(messages, temperature=0.3)
    except OllamaUnavailable as exc:
        return jsonify(error=str(exc), code="ollama_unavailable"), 503
    except OllamaBadResponse as exc:
        return jsonify(error=str(exc), code="bad_response"), 502

    sources = [{"document_id": c["document_id"], "filename": c["filename"]} for c in relevant]
    # Remove duplicates while preserving order.
    seen = set()
    unique_sources = []
    for source in sources:
        key = source["document_id"]
        if key not in seen:
            seen.add(key)
            unique_sources.append(source)

    return jsonify(answer=answer, sources=unique_sources)


def _split_text(text, chunk_size=1200, overlap=150):
    """Split extracted PDF text into overlapping chunks for retrieval."""
    text = " ".join(text.split())
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap
    return chunks
