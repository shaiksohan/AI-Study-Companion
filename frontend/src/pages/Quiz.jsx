import { useState } from "react";
import { api } from "../api.js";
import Spinner from "../components/Spinner.jsx";

const DIFFICULTIES = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];

const LETTERS = ["A", "B", "C", "D"];

export default function Quiz() {
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(5);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [quiz, setQuiz] = useState(null); // { subject, topic, difficulty, questions }
  const [answers, setAnswers] = useState([]); // index of chosen option per question
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [saving, setSaving] = useState(false);

  async function generate() {
    if (!subject.trim() || !topic.trim() || generating) return;
    setError(null);
    setQuiz(null);
    setAnswers([]);
    setSubmitted(false);
    setScore(null);
    setGenerating(true);

    try {
      const data = await api.generateQuiz(subject, topic, difficulty, count);
      setQuiz(data.quiz);
      setAnswers(new Array(data.quiz.questions.length).fill(null));
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  function choose(questionIndex, optionIndex) {
    if (submitted) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[questionIndex] = optionIndex;
      return next;
    });
  }

  async function submit() {
    const correct = quiz.questions.reduce(
      (total, q, i) => total + (answers[i] === q.correct_index ? 1 : 0),
      0
    );
    setScore({ correct, total: quiz.questions.length });
    setSubmitted(true);

    setSaving(true);
    try {
      await api.submitQuiz({
        subject: quiz.subject,
        topic: quiz.topic,
        difficulty: quiz.difficulty,
        total_questions: quiz.questions.length,
        correct_answers: correct,
      });
    } catch {
      // Progress saving failed; the result is still shown above.
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setQuiz(null);
    setAnswers([]);
    setSubmitted(false);
    setScore(null);
    setError(null);
  }

  const allAnswered = quiz && answers.every((a) => a !== null);

  return (
    <>
      <header className="page-header">
        <h1>Quiz Generator</h1>
        <p>Pick a subject and topic, and the AI will build a multiple-choice quiz.</p>
      </header>

      <div className="card">
        <div className="form-row">
          <div className="field">
            <label>Subject</label>
            <input
              placeholder="e.g. Physics"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Topic</label>
            <input
              placeholder="e.g. Newton's laws of motion"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Difficulty</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {DIFFICULTIES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Questions: {count}</label>
            <input
              type="range"
              min="1"
              max="10"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </div>
        </div>

        <button
          className="btn"
          onClick={generate}
          disabled={generating || !subject.trim() || !topic.trim()}
        >
          Generate quiz
        </button>
        {generating && (
          <div style={{ marginTop: 12 }}>
            <Spinner label={`Writing ${count} ${difficulty} questions…`} />
          </div>
        )}
        {error && <p className="error-text">{error}</p>}
      </div>

      {quiz && (
        <div className="card">
          <h2>
            {quiz.subject}: {quiz.topic}
            <span className="sub">
              {quiz.questions.length} questions · {quiz.difficulty}
            </span>
          </h2>

          {submitted && score && (
            <div
              className={`status-banner ${score.correct / score.total >= 0.5 ? "ok" : "warning"}`}
            >
              <span className="banner-icon">
                {score.correct / score.total >= 0.5 ? "🎉" : "📖"}
              </span>
              <div className="banner-body">
                <strong>
                  You scored {score.correct} / {score.total} ({Math.round((score.correct / score.total) * 100)}%)
                </strong>
                Review the explanations below, then try again when ready.
              </div>
            </div>
          )}

          {quiz.questions.map((q, questionIndex) => (
            <div key={questionIndex} style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 15.5 }}>
                {questionIndex + 1}. {q.question}
              </h3>
              {q.options.map((option, optionIndex) => {
                let stateClass = "";
                if (submitted) {
                  if (optionIndex === q.correct_index) stateClass = "correct";
                  else if (answers[questionIndex] === optionIndex) stateClass = "wrong";
                } else if (answers[questionIndex] === optionIndex) {
                  stateClass = "selected";
                }
                return (
                  <div
                    key={optionIndex}
                    className={`option-row ${stateClass}`}
                    onClick={() => choose(questionIndex, optionIndex)}
                  >
                    <span className="option-letter">{LETTERS[optionIndex]}</span>
                    <span>{option}</span>
                  </div>
                );
              })}
              {submitted && (
                <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "6px 0 0" }}>
                  💡 {q.explanation}
                </p>
              )}
            </div>
          ))}

          {!submitted ? (
            <button className="btn" onClick={submit} disabled={!allAnswered}>
              {allAnswered ? "Submit answers" : `Answer all questions (${answers.filter((a) => a === null).length} left)`}
            </button>
          ) : (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button className="btn" onClick={generate} disabled={generating}>
                New quiz, same topic
              </button>
              <button className="btn secondary" onClick={reset}>
                Change settings
              </button>
              {saving && <Spinner label="Saving to progress…" />}
            </div>
          )}
        </div>
      )}
    </>
  );
}
