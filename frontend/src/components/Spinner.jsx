export default function Spinner({ label = "Working…", large = false }) {
  return (
    <div className="loading-row">
      <div className={`spinner ${large ? "large" : ""}`} />
      <span>{label}</span>
    </div>
  );
}
