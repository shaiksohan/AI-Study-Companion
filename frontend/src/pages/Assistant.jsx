import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { api } from "../api.js";
import Spinner from "../components/Spinner.jsx";

const MODES = [
  { id: "explain", label: "Explain concept" },
  { id: "summarize", label: "Summarize" },
  { id: "examples", label: "Give examples" },
];

const EXAMPLE_PROMPTS = [
  "How does binary search work?",
  "Explain Newton's second law with an example",
  "Summarize the causes of World War I",
];

export default function Assistant() {
  const [mode, setMode] = useState("explain");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  async function ask(question) {
    const text = (question ?? input).trim();
    if (!text || loading) return;

    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const data = await api.askAssistant(text, mode);
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <>
      <header className="page-header">
        <h1>AI Study Assistant</h1>
        <p>Ask a question and choose how you want it answered.</p>
      </header>

      <div className="card">
        <div className="segmented" style={{ marginBottom: 14 }}>
          {MODES.map((m) => (
            <button
              key={m.id}
              className={mode === m.id ? "active" : ""}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="field">
          <textarea
            placeholder="e.g. Explain how neural networks learn, with a simple analogy…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask();
              }
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn" onClick={() => ask()} disabled={loading || !input.trim()}>
            Ask
          </button>
          {loading && <Spinner label="Thinking, this can take a while on CPU…" />}
        </div>

        {error && <p className="error-text">{error}</p>}

        {messages.length === 0 && !loading && (
          <div className="empty-state">
            <div className="empty-icon">💡</div>
            <p>Try one of these:</p>
            {EXAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                className="btn small secondary"
                style={{ margin: 4 }}
                onClick={() => ask(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
      </div>

      {messages.length > 0 && (
        <div className="card">
          <div className="chat-thread">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`message ${message.role}`}
              >
                {message.role === "assistant" ? (
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                ) : (
                  message.content
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>
      )}
    </>
  );
}
