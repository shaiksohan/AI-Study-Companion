import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import OllamaStatus from "./OllamaStatus.jsx";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "🏠", end: true },
  { to: "/assistant", label: "AI Study Assistant", icon: "💬" },
  { to: "/materials", label: "PDF Notes", icon: "📄" },
  { to: "/quiz", label: "Quiz Generator", icon: "📝" },
  { to: "/flashcards", label: "Flashcards", icon: "🃏" },
  { to: "/progress", label: "Study Progress", icon: "📈" },
];

export default function Layout() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="app-shell">
      <button
        className="nav-toggle"
        onClick={() => setNavOpen((open) => !open)}
        aria-label="Toggle navigation"
      >
        ☰
      </button>

      {navOpen && <div className="sidebar-backdrop" onClick={() => setNavOpen(false)} />}

      <aside className={`sidebar ${navOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">🎓</div>
          <span>AI Study Companion</span>
        </div>

        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
            onClick={() => setNavOpen(false)}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        <div className="sidebar-footer">
          Runs 100% locally with Ollama.
          <br />
          No accounts. No API keys.
        </div>
      </aside>

      <main className="main-content">
        <OllamaStatus />
        <Outlet />
      </main>
    </div>
  );
}
