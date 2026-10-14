"""Tiny keyword-based search over uploaded PDF chunks.

We keep this simple on purpose (no vector database needed): score each chunk
by how many question words appear in it and return the best few.
"""

import re

from database import get_chunks

STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "were", "of", "in", "on", "to",
    "and", "or", "for", "what", "why", "how", "do", "does", "did", "with",
    "about", "this", "that", "it", "be", "can", "could", "you", "me", "my",
}


def find_relevant_chunks(question, doc_id=None, top_k=4):
    """Return the chunks most relevant to `question`."""
    chunks = get_chunks(doc_id=doc_id, limit=2000)
    if not chunks:
        return []

    terms = _important_terms(question)
    scored = []
    for chunk in chunks:
        content = chunk["content"].lower()
        score = sum(content.count(term) for term in terms)
        if score > 0:
            scored.append((score, chunk))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    top = [chunk for _score, chunk in scored[:top_k]]
    # If nothing matched, fall back to the first chunks of the document.
    return top if top else chunks[:top_k]


def _important_terms(text):
    words = re.findall(r"[a-z0-9]+", text.lower())
    return [w for w in words if w not in STOPWORDS and len(w) > 2]
