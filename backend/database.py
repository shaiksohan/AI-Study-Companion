"""
SQLite database helpers.

The database file is created automatically the first time the backend runs
(default: backend/study.db). Tables:

  documents        - uploaded PDF notes
  document_chunks  - small text pieces of each PDF used for Q&A
  quiz_results     - finished quizzes (score, subject, topic, difficulty)
  studied_topics   - unique topics the student has worked on
"""

import json
import sqlite3

from config import DATABASE_PATH


def get_db():
    """Open a connection that returns rows as dictionaries."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create tables if they do not exist yet."""
    conn = get_db()
    try:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                stored_path TEXT NOT NULL,
                size_bytes INTEGER NOT NULL DEFAULT 0,
                page_count INTEGER NOT NULL DEFAULT 0,
                char_count INTEGER NOT NULL DEFAULT 0,
                uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS document_chunks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER NOT NULL,
                chunk_index INTEGER NOT NULL,
                content TEXT NOT NULL,
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS quiz_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject TEXT NOT NULL,
                topic TEXT NOT NULL,
                difficulty TEXT NOT NULL,
                total_questions INTEGER NOT NULL,
                correct_answers INTEGER NOT NULL,
                percentage REAL NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS studied_topics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject TEXT NOT NULL,
                topic TEXT NOT NULL,
                studied_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE(subject, topic)
            );
            """
        )
        conn.commit()
    finally:
        conn.close()


# --- Quiz results ----------------------------------------------------------

def save_quiz_result(subject, topic, difficulty, total_questions, correct_answers):
    percentage = round(100.0 * correct_answers / total_questions, 1) if total_questions else 0.0
    conn = get_db()
    try:
        conn.execute(
            """INSERT INTO quiz_results
               (subject, topic, difficulty, total_questions, correct_answers, percentage)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (subject, topic, difficulty, total_questions, correct_answers, percentage),
        )
        conn.execute(
            """INSERT OR IGNORE INTO studied_topics (subject, topic) VALUES (?, ?)""",
            (subject, topic),
        )
        conn.commit()
    finally:
        conn.close()
    return percentage


def get_progress():
    """Return everything the Study Progress page needs."""
    conn = get_db()
    try:
        quizzes = [
            dict(row)
            for row in conn.execute(
                "SELECT * FROM quiz_results ORDER BY created_at DESC LIMIT 100"
            )
        ]
        topics = [
            dict(row)
            for row in conn.execute(
                "SELECT * FROM studied_topics ORDER BY studied_at DESC LIMIT 100"
            )
        ]
        stats_row = conn.execute(
            """SELECT COUNT(*) AS completed_quizzes,
                      COALESCE(SUM(correct_answers), 0) AS total_correct,
                      COALESCE(AVG(percentage), 0) AS average_score
               FROM quiz_results"""
        ).fetchone()
        stats = dict(stats_row)
        stats["topics_studied"] = len(topics)
    finally:
        conn.close()
    return {"stats": stats, "quizzes": quizzes, "topics": topics}


# --- Documents -------------------------------------------------------------

def save_document(filename, stored_path, size_bytes, page_count, char_count, chunks):
    conn = get_db()
    try:
        cursor = conn.execute(
            """INSERT INTO documents
               (filename, stored_path, size_bytes, page_count, char_count)
               VALUES (?, ?, ?, ?, ?)""",
            (filename, stored_path, size_bytes, page_count, char_count),
        )
        doc_id = cursor.lastrowid
        for index, content in enumerate(chunks):
            conn.execute(
                "INSERT INTO document_chunks (document_id, chunk_index, content) VALUES (?, ?, ?)",
                (doc_id, index, content),
            )
        conn.commit()
        return doc_id
    finally:
        conn.close()


def list_documents():
    conn = get_db()
    try:
        rows = conn.execute(
            """SELECT id, filename, size_bytes, page_count, char_count, uploaded_at
               FROM documents ORDER BY uploaded_at DESC"""
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def delete_document(doc_id):
    conn = get_db()
    try:
        row = conn.execute("SELECT stored_path FROM documents WHERE id = ?", (doc_id,)).fetchone()
        conn.execute("DELETE FROM document_chunks WHERE document_id = ?", (doc_id,))
        conn.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
        conn.commit()
        return row["stored_path"] if row else None
    finally:
        conn.close()


def get_chunks(doc_id=None, limit=400):
    conn = get_db()
    try:
        if doc_id:
            rows = conn.execute(
                """SELECT c.id, c.document_id, c.content, d.filename
                   FROM document_chunks c JOIN documents d ON d.id = c.document_id
                   WHERE c.document_id = ? ORDER BY c.chunk_index LIMIT ?""",
                (doc_id, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT c.id, c.document_id, c.content, d.filename
                   FROM document_chunks c JOIN documents d ON d.id = c.document_id
                   ORDER BY c.document_id, c.chunk_index LIMIT ?""",
                (limit,),
            ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()
