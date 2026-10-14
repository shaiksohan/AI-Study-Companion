# 🎓 AI Study Companion

A modern, responsive web app that helps students understand difficult subjects, study
from their own notes, generate quizzes, and prepare for exams — **100% locally, with no
paid AI APIs and no API keys**.

| Layer    | Technology                  |
| -------- | --------------------------- |
| Frontend | React + Vite                |
| Backend  | Python Flask                |
| AI       | Ollama (`qwen2.5-coder:7b`) |
| Database | SQLite (built into Python)  |

Everything runs on your machine. The Flask backend is the only process that talks to
Ollama, so the browser never sees any secrets.

## Project structure

```
ai-study-companion/
├── backend/                 # Flask API
│   ├── app.py               # Entry point: python app.py
│   ├── config.py            # Reads all settings from environment variables
│   ├── ollama_client.py     # All Ollama HTTP calls live here
│   ├── database.py          # SQLite helpers (progress, documents)
│   ├── routes/              # One file per feature area
│   ├── services/            # PDF reading + keyword search
│   ├── uploads/             # Uploaded PDFs (created automatically)
│   ├── study.db             # SQLite database (created automatically)
│   └── requirements.txt
├── frontend/                # React app (Vite)
│   ├── src/
│   │   ├── components/      # Layout, status banner, spinner
│   │   ├── pages/           # Dashboard, Assistant, Materials, Quiz, Flashcards, Progress
│   │   ├── api.js           # All backend calls in one place
│   │   └── styles/          # global.css design system
│   ├── index.html
│   ├── package.json
│   └── vite.config.js       # Proxies /api to the Flask backend
└── README.md
```

## Prerequisites (Windows)

1. **Python 3.10+** — https://python.org (check "Add Python to PATH" during install)
2. **Node.js 18+** — https://nodejs.org
3. **Ollama** — https://ollama.com/download
4. The model used by default:
   ```bat
   ollama pull qwen2.5-coder:7b
   ```

Make sure the Ollama app is running (you should see a llama icon in the system tray).

## Setup — Backend (Flask)

Open a terminal in the project's `backend` folder:

```bat
cd backend

python -m venv venv
venv\Scripts\activate

pip install -r requirements.txt

python app.py
```

The API is now running at **http://localhost:5000**.

## Setup — Frontend (React)

Open a **second** terminal in the `frontend` folder:

```bat
cd frontend

npm install

npm run dev
```

Open **http://localhost:5173** in your browser. The dev server proxies `/api` requests
to the Flask backend automatically, so both servers must be running at the same time.

## Configuration (environment variables)

All settings are read from environment variables with safe defaults
(see `backend/config.py`). You never need API keys.

| Variable          | Default                  | Purpose                              |
| ----------------- | ------------------------ | ------------------------------------ |
| `OLLAMA_API_URL`  | `http://localhost:11434` | Address of your Ollama server        |
| `OLLAMA_MODEL`    | `qwen2.5-coder:7b`       | Model used for every AI feature      |
| `OLLAMA_TIMEOUT`  | `300`                    | Seconds to wait for a model reply    |
| `FLASK_HOST`      | `127.0.0.1`              | Backend bind address                 |
| `FLASK_PORT`      | `5000`                   | Backend port                         |
| `FLASK_DEBUG`     | `1`                      | Set to `0` to disable debug mode     |

Example on Windows (PowerShell) to use a different model:

```powershell
$env:OLLAMA_MODEL = "llama3.1:8b"
python app.py
```

Or in CMD:

```bat
set OLLAMA_MODEL=llama3.1:8b
python app.py
```

## When Ollama is unavailable

The app never pretends to work. The status banner at the top of every page shows
exactly what is wrong:

- 🔌 **Backend is not running** — start `python app.py` in `backend/`
- ⚠️ **Ollama is not running** — start the Ollama app, then click **Retry**
- 📦 **Model not installed** — run `ollama pull qwen2.5-coder:7b`

AI features return a clear error message (never fake answers) until Ollama is reachable.

## Features

- **Dashboard** — professional, responsive overview with stats and quick links.
- **AI Study Assistant** — explain concepts, summarize topics, or get worked examples.
  Answers render as markdown (headings, lists, code blocks).
- **PDF Notes** — upload PDF lecture notes; ask questions that are answered from the
  document text (simple keyword search picks the relevant sections).
- **Quiz Generator** — choose subject, topic, difficulty and question count; get
  4-option multiple-choice questions with scoring and per-question explanations.
- **Flashcards** — AI-generated or hand-written cards with flip, next/previous,
  shuffle and delete. Cards persist in your browser (localStorage).
- **Study Progress** — completed quizzes, scores and studied topics, stored in SQLite
  (`backend/study.db`).

## Troubleshooting

| Problem                        | Fix                                                                    |
| ------------------------------ | ---------------------------------------------------------------------- |
| Banner says Ollama not running | Start the Ollama desktop app, or run `ollama serve` in a terminal       |
| Slow responses                 | Normal on CPU with a 7B model; first reply is slowest while it loads    |
| `python` not found             | Try `py` instead of `python` on Windows                                |
| Port 5000 in use               | `set FLASK_PORT=5001` then restart `app.py`, and update the Vite proxy |
| Blank page in browser          | Make sure both `python app.py` and `npm run dev` are running           |

## Production build (optional)

```bat
cd frontend
npm run build
```

This creates `frontend/dist/`, which you can serve with any static file server.
Keep the Flask backend running — it is the API the built frontend still calls.

## Notes for beginners

- Start by reading `backend/app.py` — it is the whole backend in ~50 lines.
- Every AI call goes through `ollama_client.chat()` in `backend/ollama_client.py`.
- All frontend requests are in `frontend/src/api.js`.
- This project intentionally uses **no paid APIs**: only Ollama on your machine.
