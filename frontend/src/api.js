// Small helper for calling the Flask backend.
//
// In development Vite proxies /api to http://localhost:5000 (see vite.config.js).
// If you ever serve the frontend separately, set VITE_API_URL in a .env file,
// e.g. VITE_API_URL=http://localhost:5000
const API_URL = import.meta.env.VITE_API_URL || "";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = { error: "The server returned an unreadable response." };
  }

  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.code = data.code || null;
    throw error;
  }
  return data;
}

export const api = {
  health: () => request("/health"),
  askAssistant: (question, mode) =>
    request("/assistant", {
      method: "POST",
      body: JSON.stringify({ question, mode }),
    }),
  listDocuments: () => request("/documents"),
  uploadDocument: (formData) =>
    fetch(`${API_URL}/api/documents/upload`, { method: "POST", body: formData }).then(
      async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Upload failed.");
        return data;
      }
    ),
  deleteDocument: (id) => request(`/documents/${id}`, { method: "DELETE" }),
  askDocuments: (question, documentId) =>
    request("/documents/ask", {
      method: "POST",
      body: JSON.stringify({ question, document_id: documentId }),
    }),
  generateQuiz: (subject, topic, difficulty, count) =>
    request("/quiz/generate", {
      method: "POST",
      body: JSON.stringify({ subject, topic, difficulty, count }),
    }),
  submitQuiz: (result) =>
    request("/quiz/submit", {
      method: "POST",
      body: JSON.stringify(result),
    }),
  generateFlashcards: (topic, count, text) =>
    request("/flashcards/generate", {
      method: "POST",
      body: JSON.stringify({ topic, count, text }),
    }),
  getProgress: () => request("/progress"),
};
