import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

const FEATURES = [
  {
    to: "/assistant",
    icon: "💬",
    iconClass: "icon-purple",
    title: "AI Study Assistant",
    description: "Ask any question and get clear explanations, summaries, and worked examples.",
  },
  {
    to: "/materials",
    icon: "📄",
    iconClass: "icon-blue",
    title: "PDF Notes",
    description: "Upload your lecture notes and ask questions directly about their content.",
  },
  {
    to: "/quiz",
    icon: "📝",
    iconClass: "icon-amber",
    title: "Quiz Generator",
    description: "Generate multiple-choice quizzes on any subject, with scoring and explanations.",
  },
  {
    to: "/flashcards",
    icon: "🃏",
    iconClass: "icon-teal",
    title: "Flashcards",
    description: "Turn any topic into flashcards and test your memory with active recall.",
  },
  {
    to: "/progress",
    icon: "📈",
    iconClass: "icon-green",
    title: "Study Progress",
    description: "Track your completed quizzes, scores, and the topics you have studied.",
  },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api
      .getProgress()
      .then((data) => setStats(data.stats))
      .catch(() => setStats({ completed_quizzes: 0, average_score: 0, topics_studied: 0, total_correct: 0 }));
  }, []);

  return (
    <>
      <header className="page-header">
        <h1>Welcome back 👋</h1>
        <p>Everything you need to understand tough subjects and ace your exams.</p>
      </header>

      <section className="stat-grid" style={{ marginBottom: 26 }}>
        <div className="stat-card">
          <div className="stat-value">{stats ? stats.completed_quizzes : "—"}</div>
          <div className="stat-label">Quizzes completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats ? `${Math.round(stats.average_score)}%` : "—"}</div>
          <div className="stat-label">Average score</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats ? stats.topics_studied : "—"}</div>
          <div className="stat-label">Topics studied</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats ? stats.total_correct : "—"}</div>
          <div className="stat-label">Correct answers</div>
        </div>
      </section>

      <section className="feature-grid">
        {FEATURES.map((feature) => (
          <Link key={feature.to} to={feature.to} className="feature-card">
            <div className={`feature-icon ${feature.iconClass}`}>{feature.icon}</div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
            <span className="card-cta">Open →</span>
          </Link>
        ))}
      </section>
    </>
  );
}
