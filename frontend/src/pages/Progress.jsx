import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import Spinner from "../components/Spinner.jsx";

function scoreBadge(percentage) {
  if (percentage >= 75) return <span className="badge green">{percentage}%</span>;
  if (percentage >= 50) return <span className="badge amber">{percentage}%</span>;
  return <span className="badge red">{percentage}%</span>;
}

export default function Progress() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setData(await api.getProgress());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (error) return <p className="error-text">{error}</p>;
  if (!data) return <Spinner label="Loading your progress…" />;

  const { stats, quizzes, topics } = data;

  return (
    <>
      <header className="page-header">
        <h1>Study Progress</h1>
        <p>Your quiz history and topics, stored locally in SQLite.</p>
      </header>

      <section className="stat-grid" style={{ marginBottom: 22 }}>
        <div className="stat-card">
          <div className="stat-value">{stats.completed_quizzes}</div>
          <div className="stat-label">Quizzes completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.round(stats.average_score)}%</div>
          <div className="stat-label">Average score</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.topics_studied}</div>
          <div className="stat-label">Topics studied</div>
        </div>
      </section>

      {stats.completed_quizzes > 0 && (
        <div className="card">
          <h2>
            Overall performance
            <span className="sub">
              {stats.total_correct} correct answers across {stats.completed_quizzes} quizzes
            </span>
          </h2>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${Math.min(100, stats.average_score)}%` }} />
          </div>
        </div>
      )}

      <div className="card">
        <h2>Quiz history</h2>
        {quizzes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🗂️</div>
            <p>No quizzes yet. Take your first quiz from the Quiz Generator.</p>
          </div>
        ) : (
          quizzes.map((quiz) => (
            <div className="list-item" key={quiz.id}>
              <div className="grow">
                <div className="title">
                  {quiz.subject}: {quiz.topic}
                </div>
                <div className="meta">
                  {quiz.correct_answers}/{quiz.total_questions} correct · {quiz.difficulty} ·{" "}
                  {quiz.created_at}
                </div>
              </div>
              {scoreBadge(quiz.percentage)}
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h2>Topics studied</h2>
        {topics.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            <p>Topics you study will appear here automatically.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {topics.map((topic) => (
              <span key={topic.id} className="badge purple">
                {topic.subject} · {topic.topic}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
