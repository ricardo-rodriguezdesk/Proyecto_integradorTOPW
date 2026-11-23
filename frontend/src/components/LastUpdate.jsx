import { useAsync } from '../hooks/useAsync.js';
import { getLastUpdate } from '../services/api.js';

/** Muestra cuándo se cargaron por última vez los datos de una fuente. */
export default function LastUpdate({ source, className = '' }) {
  const { data } = useAsync(() => getLastUpdate(source), [source]);
  if (!data?.finished_at) return <span className={`last-update ${className}`}>Sin cargas registradas</span>;
  const date = new Date(data.finished_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  return <span className={`last-update ${className}`}>Datos cargados el {date} · {data.records} registros</span>;
}
