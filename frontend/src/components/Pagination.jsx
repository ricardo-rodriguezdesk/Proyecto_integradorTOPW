/** Paginación numerada con "anterior" y "siguiente". */
export default function Pagination({ page, totalPages, onChange, className = '' }) {
  if (!totalPages || totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <nav className={`pagination ${className}`} aria-label="Paginación">
      <button onClick={() => onChange(page - 1)} disabled={page <= 1}>‹ Anterior</button>
      {start > 1 && <><button onClick={() => onChange(1)}>1</button>{start > 2 && <span>…</span>}</>}
      {pages.map((p) => (
        <button key={p} onClick={() => onChange(p)} className={p === page ? 'active' : ''} aria-current={p === page ? 'page' : undefined}>
          {p}
        </button>
      ))}
      {end < totalPages && <>{end < totalPages - 1 && <span>…</span>}<button onClick={() => onChange(totalPages)}>{totalPages}</button></>}
      <button onClick={() => onChange(page + 1)} disabled={page >= totalPages}>Siguiente ›</button>
    </nav>
  );
}
