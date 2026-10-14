import { useState } from "react";
import { api } from "../api.js";
import Spinner from "../components/Spinner.jsx";

const STORAGE_KEY = "study-companion-flashcards";

function loadCards() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCards(cards) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export default function Flashcards() {
  const [cards, setCards] = useState(loadCards);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(8);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Manual card creation
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");

  function updateCards(next) {
    setCards(next);
    saveCards(next);
    setCurrent((index) => Math.min(index, Math.max(0, next.length - 1)));
  }

  async function generate() {
    if (!topic.trim() || generating) return;
    setError(null);
    setGenerating(true);
    try {
      const data = await api.generateFlashcards(topic, count, "");
      updateCards([...cards, ...data.flashcards]);
      setTopic("");
      setCurrent(cards.length); // jump to the first new card
      setFlipped(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  function addManualCard(event) {
    event.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    updateCards([...cards, { question: newQuestion.trim(), answer: newAnswer.trim() }]);
    setNewQuestion("");
    setNewAnswer("");
  }

  function deleteCard(index) {
    updateCards(cards.filter((_, i) => i !== index));
  }

  function shuffle() {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    updateCards(shuffled);
    setCurrent(0);
    setFlipped(false);
  }

  const card = cards[current];

  return (
    <>
      <header className="page-header">
        <h1>Flashcards</h1>
        <p>Generate cards with AI or write your own, then flip through them.</p>
      </header>

      <div className="card">
        <h2>
          Generate with AI
          <span className="sub">The model writes question-and-answer cards for your topic.</span>
        </h2>
        <div className="form-row">
          <div className="field">
            <label>Topic</label>
            <input
              placeholder="e.g. Photosynthesis"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
            />
          </div>
          <div className="field">
            <label>Cards: {count}</label>
            <input
              type="range"
              min="1"
              max="20"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </div>
        </div>
        <button className="btn" onClick={generate} disabled={generating || !topic.trim()}>
          Generate flashcards
        </button>
        {generating && (
          <div style={{ marginTop: 12 }}>
            <Spinner label="Writing flashcards…" />
          </div>
        )}
        {error && <p className="error-text">{error}</p>}
      </div>

      <div className="card">
        <h2>
          Your deck
          <span className="sub">
            {cards.length} cards
            {cards.length > 0 && ` · card ${current + 1} of ${cards.length}`}
          </span>
        </h2>

        {cards.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🃏</div>
            <p>No flashcards yet. Generate some above or write one below.</p>
          </div>
        ) : (
          <>
            <div className="flashcard" onClick={() => setFlipped((f) => !f)}>
              <div className={`flashcard-inner ${flipped ? "flipped" : ""}`}>
                <div className="flashcard-face front">
                  <span className="face-label">Question</span>
                  <div className="face-text">{card.question}</div>
                  <span style={{ marginTop: 14, fontSize: 13, color: "var(--text-muted)" }}>
                    Click to reveal the answer
                  </span>
                </div>
                <div className="flashcard-face back">
                  <span className="face-label">Answer</span>
                  <div className="face-text">{card.answer}</div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              <button
                className="btn secondary"
                onClick={() => {
                  setCurrent((i) => Math.max(0, i - 1));
                  setFlipped(false);
                }}
                disabled={current === 0}
              >
                ← Previous
              </button>
              <button
                className="btn secondary"
                onClick={() => {
                  setCurrent((i) => Math.min(cards.length - 1, i + 1));
                  setFlipped(false);
                }}
                disabled={current === cards.length - 1}
              >
                Next →
              </button>
              <button className="btn secondary" onClick={shuffle}>
                🔀 Shuffle
              </button>
              <button className="btn danger-ghost" onClick={() => deleteCard(current)}>
                Delete this card
              </button>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2>
          Write your own card
          <span className="sub">Add a manual flashcard to your deck.</span>
        </h2>
        <form onSubmit={addManualCard}>
          <div className="field">
            <label>Question (front)</label>
            <input
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="e.g. What is the powerhouse of the cell?"
            />
          </div>
          <div className="field">
            <label>Answer (back)</label>
            <input
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="e.g. The mitochondria"
            />
          </div>
          <button className="btn" type="submit" disabled={!newQuestion.trim() || !newAnswer.trim()}>
            Add card
          </button>
        </form>
      </div>
    </>
  );
}
