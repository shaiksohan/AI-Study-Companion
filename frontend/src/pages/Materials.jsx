import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { api } from "../api.js";
import Spinner from "../components/Spinner.jsx";

export default function Materials() {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(""); // "" means search all docs
  const [question, setQuestion] = useState("");
  const [askLoading, setAskLoading] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [askError, setAskError] = useState(null);
  const fileInputRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.listDocuments();
      setDocuments(data.documents);
    } catch {
      // The status banner already tells the user if the backend is down.
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await api.uploadDocument(formData);
      await refresh();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteDocument(id);
      if (String(id) === selectedDoc) setSelectedDoc("");
      await refresh();
    } catch (err) {
      setUploadError(err.message);
    }
  }

  async function handleAsk() {
    if (!question.trim() || askLoading) return;
    setAskError(null);
    setAnswer(null);
    setAskLoading(true);
    try {
      const data = await api.askDocuments(question, selectedDoc || null);
      setAnswer(data);
    } catch (err) {
      setAskError(err.message);
    } finally {
      setAskLoading(false);
    }
  }

  return (
    <>
      <header className="page-header">
        <h1>PDF Notes</h1>
        <p>Upload your study materials, then ask questions about what is inside them.</p>
      </header>

      <div className="card">
        <h2>
          Upload notes
          <span className="sub">PDF only, up to 20 MB. Text-based PDFs work best.</span>
        </h2>

        <div
          style={{
            border: "2px dashed var(--border)",
            borderRadius: "var(--radius)",
            padding: "28px 18px",
            textAlign: "center",
            background: "var(--surface-alt)",
          }}
        >
          <div style={{ fontSize: 34, marginBottom: 6 }}>📤</div>
          <p style={{ color: "var(--text-muted)", margin: "0 0 12px" }}>
            Drag a PDF here, or browse for one
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleUpload}
            style={{ maxWidth: 260, margin: "0 auto" }}
          />
          {uploading && (
            <div style={{ marginTop: 12, justifyContent: "center" }}>
              <Spinner label="Uploading and reading PDF…" />
            </div>
          )}
        </div>

        {uploadError && <p className="error-text">{uploadError}</p>}
      </div>

      <div className="card">
        <h2>
          Your documents
          <span className="sub">{documents.length} uploaded</span>
        </h2>

        {documents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <p>No notes yet. Upload a PDF to get started.</p>
          </div>
        ) : (
          documents.map((doc) => (
            <div className="list-item" key={doc.id}>
              <span style={{ fontSize: 24 }}>📄</span>
              <div className="grow">
                <div className="title">{doc.filename}</div>
                <div className="meta">
                  {doc.page_count} pages · {doc.size_kb} KB · {doc.uploaded_at}
                </div>
              </div>
              <button className="btn small secondary" onClick={() => handleDelete(doc.id)}>
                Delete
              </button>
            </div>
          ))
        )}
      </div>

      {documents.length > 0 && (
        <div className="card">
          <h2>
            Ask about your notes
            <span className="sub">Answers are based only on the documents you uploaded.</span>
          </h2>

          <div className="field">
            <label>Search in</label>
            <select value={selectedDoc} onChange={(e) => setSelectedDoc(e.target.value)}>
              <option value="">All documents</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.filename}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Question</label>
            <textarea
              placeholder="e.g. What does the notes say about photosynthesis?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
            />
          </div>

          <button className="btn" onClick={handleAsk} disabled={askLoading || !question.trim()}>
            Ask about my notes
          </button>
          {askLoading && (
            <div style={{ marginTop: 12 }}>
              <Spinner label="Searching your notes and asking the model…" />
            </div>
          )}

          {askError && <p className="error-text">{askError}</p>}

          {answer && (
            <div className="chat-thread">
              <div className="message user">{question}</div>
              <div className="message assistant">
                <ReactMarkdown>{answer.answer}</ReactMarkdown>
                {answer.sources?.length > 0 && (
                  <p style={{ marginTop: 12, fontSize: 13, color: "var(--text-muted)" }}>
                    Sources:{" "}
                    {answer.sources.map((source, index) => (
                      <span key={source.document_id}>
                        {index > 0 && ", "}
                        📄 {source.filename}
                      </span>
                    ))}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
