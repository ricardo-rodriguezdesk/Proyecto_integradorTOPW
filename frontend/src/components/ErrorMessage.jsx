export default function ErrorMessage({ error, onRetry, title = 'Algo salió mal' }) {
  if (!error) return null;
  return (
    <div className="error-box" role="alert">
      <strong>⚠ {title}</strong>
      <p>{error.message ?? String(error)}</p>
      {onRetry && <button className="btn" onClick={onRetry}>Reintentar</button>}
    </div>
  );
}
