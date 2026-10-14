import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";

/**
 * Checks whether the Flask backend and Ollama are reachable and shows a
 * friendly banner when they are not, instead of failing silently.
 */
export default function OllamaStatus() {
  const [status, setStatus] = useState({ loading: true, online: false, modelAvailable: false });
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const data = await api.health();
      setStatus({
        loading: false,
        online: data.ollama.online,
        modelAvailable: data.ollama.model_available,
        model: data.ollama.model,
        url: data.ollama.url,
      });
    } catch {
      setStatus({ loading: false, backendDown: true });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  if (status.loading) return null;

  if (status.backendDown) {
    return (
      <div className="status-banner error">
        <span className="banner-icon">🔌</span>
        <div className="banner-body">
          <strong>Backend is not running</strong>
          Start it with <code>python app.py</code> inside the <code>backend</code> folder.
        </div>
        <button className="btn small secondary" onClick={check} disabled={checking}>
          Retry
        </button>
      </div>
    );
  }

  if (!status.online) {
    return (
      <div className="status-banner error">
        <span className="banner-icon">⚠️</span>
        <div className="banner-body">
          <strong>Ollama is not running</strong>
          AI features are paused. Start the Ollama app (or run <code>ollama serve</code>),
          then press Retry.
        </div>
        <button className="btn small secondary" onClick={check} disabled={checking}>
          Retry
        </button>
      </div>
    );
  }

  if (!status.modelAvailable) {
    return (
      <div className="status-banner warning">
        <span className="banner-icon">📦</span>
        <div className="banner-body">
          <strong>Model not installed</strong>
          Run <code>ollama pull {status.model}</code> in a terminal to download it.
        </div>
        <button className="btn small secondary" onClick={check} disabled={checking}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="status-banner ok">
      <span className="banner-icon">✅</span>
      <div className="banner-body">
        <strong>Connected to Ollama</strong>
        Using model <code>{status.model}</code> at <code>{status.url}</code>.
      </div>
    </div>
  );
}
