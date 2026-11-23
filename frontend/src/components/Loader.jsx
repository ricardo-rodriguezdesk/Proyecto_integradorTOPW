export default function Loader({ label = 'Cargando…', fullscreen = false, className = '' }) {
  return (
    <div className={`loader ${fullscreen ? 'loader-full' : ''} ${className}`} role="status" aria-live="polite">
      <span className="spinner" aria-hidden />
      <span>{label}</span>
    </div>
  );
}
