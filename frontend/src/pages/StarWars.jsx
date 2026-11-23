import { useEffect, useState } from 'react';
import { useAsync, useDebounce } from '../hooks/useAsync.js';
import { getCharacter, getCharacters, SW_PAGE_SIZE } from '../services/api.js';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Pagination from '../components/Pagination.jsx';
import Modal from '../components/Modal.jsx';
import LastUpdate from '../components/LastUpdate.jsx';
import '../styles/starwars.css';

const GENDER = { male: 'Masculino', female: 'Femenino', hermaphrodite: 'Hermafrodita' };
const COLORS = {
  blue: 'azul', brown: 'café', black: 'negro', blond: 'rubio', blonde: 'rubio', yellow: 'amarillo', red: 'rojo',
  white: 'blanco', grey: 'gris', gray: 'gris', green: 'verde', orange: 'naranja', hazel: 'avellana', auburn: 'castaño rojizo',
  pink: 'rosa', gold: 'dorado', fair: 'clara', light: 'clara', dark: 'oscura', pale: 'pálida', tan: 'bronceada', silver: 'plateado',
};
const tr = (v) => {
  if (!v) return 'Desconocido';
  const t = v.split(/,\s*/).map((w) => w.split('-').map((x) => COLORS[x] ?? x).join(' ')).join(', ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const gender = (g) => (g ? GENDER[g] ?? g : 'No aplica');
const initials = (name) => name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export default function StarWars() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const search = useDebounce(query, 400);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => setPage(1), [search]);
  const list = useAsync(() => getCharacters({ page, search }), [page, search]);
  const totalPages = list.data ? Math.ceil(list.data.count / SW_PAGE_SIZE) : 0;

  return (
    <div className="sw">
      <div className="sw-stars" aria-hidden />
      <SpaceScene />
      <div className="container sw-inner">
        <header className="sw-header">
          <p className="sw-kicker">Hace mucho tiempo, en una galaxia muy, muy lejana…</p>
          <h1>Archivo de Personajes</h1>
          <LastUpdate source="starwars" className="sw-update" />
          <input
            className="sw-search"
            type="search"
            placeholder="Buscar personaje…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar personaje"
          />
        </header>

        {list.loading && <SwLoader />}
        <ErrorMessage error={list.error} onRetry={list.reload} title="Falló la transmisión" />
        {!list.loading && list.data?.data.length === 0 && <p className="sw-empty">Ningún registro coincide con «{search}».</p>}

        {!list.loading && list.data && (
          <>
            <section className="sw-grid">
              {list.data.data.map((p, i) => (
                <button key={p.id} className="sw-card" style={{ '--i': i, '--h': (p.id * 47) % 360 }} onClick={() => setSelectedId(p.id)}>
                  <span className="sw-avatar">{initials(p.name)}</span>
                  <strong>{p.name}</strong>
                  <dl>
                    <div><dt>Género</dt><dd>{gender(p.gender)}</dd></div>
                    <div><dt>Nacimiento</dt><dd title="BBY: antes de la Batalla de Yavin · ABY: después">{p.birth_year ?? 'Desconocido'}</dd></div>
                  </dl>
                  <span className="sw-more">Ver ficha →</span>
                </button>
              ))}
            </section>
            <Pagination page={page} totalPages={totalPages} onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="sw-pagination" />
          </>
        )}
      </div>

      <CharacterDetail id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CharacterDetail({ id, onClose }) {
  const { data: p, loading, error } = useAsync(() => (id ? getCharacter(id) : null), [id]);
  return (
    <Modal open={Boolean(id)} onClose={onClose} className="sw-modal" label="Ficha del personaje">
      {loading && <SwLoader />}
      <ErrorMessage error={error} />
      {!loading && p && (
        <>
          <Hologram name={p.name} planet={p.homeworld} hue={(p.id * 47) % 360} />
          <h2>{p.name}</h2>
          <p className="sw-sub">{gender(p.gender)} · Nacimiento: {p.birth_year ?? 'Desconocido'}</p>
          <div className="sw-facts">
            <Fact label="Altura" value={p.height_cm ? `${p.height_cm} cm` : 'Desconocida'} />
            <Fact label="Peso" value={p.mass_kg ? `${p.mass_kg} kg` : 'Desconocido'} />
            <Fact label="Color de ojos" value={tr(p.eye_color)} />
            <Fact label="Color de cabello" value={tr(p.hair_color)} />
            <Fact label="Color de piel" value={tr(p.skin_color)} />
            <Fact label="Planeta de origen" value={p.homeworld ?? 'Desconocido'} highlight />
          </div>
          {p.homeworld && (
            <p className="sw-planet">🪐 {p.homeworld}: clima {p.homeworld_climate ?? 'desconocido'}, terreno {p.homeworld_terrain ?? 'desconocido'}.</p>
          )}
        </>
      )}
    </Modal>
  );
}

function Fact({ label, value, highlight }) {
  return (
    <div className={`sw-fact ${highlight ? 'hl' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SwLoader() {
  return (
    <div className="sw-loader" role="status" aria-live="polite">
      <span className="sw-ring" aria-hidden />
      <span>Estableciendo conexión con el archivo galáctico…</span>
    </div>
  );
}

/** Medalla holográfica 3D que gira sobre un proyector. */
function Hologram({ name, planet, hue }) {
  return (
    <div className="holo" style={{ '--h': hue }} aria-hidden>
      <div className="holo-float">
        <div className="holo-coin">
          <div className="holo-face holo-front">{initials(name)}</div>
          <div className="holo-face holo-back">
            <small>Planeta</small>
            <span>{planet ?? 'Desconocido'}</span>
          </div>
        </div>
      </div>
      <span className="holo-beam" />
      <span className="holo-base" />
    </div>
  );
}

/** Nave de diseño propio (no pertenece a ninguna saga). */
function Ship({ variant = 'a' }) {
  const hull = variant === 'a' ? '#C9CED8' : '#9FA8B8';
  const accent = variant === 'a' ? '#FFD54A' : '#6FB1E8';
  return (
    <svg viewBox="0 0 120 40" className="ship-svg">
      <defs>
        <linearGradient id={`trail-${variant}`} x1="0" x2="1">
          <stop offset="0" stopColor={accent} stopOpacity="0" />
          <stop offset="1" stopColor={accent} stopOpacity=".9" />
        </linearGradient>
      </defs>
      <rect x="0" y="18" width="46" height="4" rx="2" fill={`url(#trail-${variant})`} />
      <circle cx="48" cy="20" r="4" fill={accent} opacity=".9" />
      <path d="M50 20 L74 12 L110 18 L114 20 L110 22 L74 28 Z" fill={hull} />
      <path d="M64 16 L80 2 L88 4 L78 16 Z" fill={hull} opacity=".85" />
      <path d="M64 24 L80 38 L88 36 L78 24 Z" fill={hull} opacity=".7" />
      <path d="M90 17 L102 18.5 L102 21.5 L90 23 Z" fill="#1B2433" />
      <rect x="70" y="19" width="22" height="2" fill={accent} opacity=".8" />
    </svg>
  );
}

/** Fondo: planeta con anillos, luna y naves (todo original). */
function SpaceScene() {
  return (
    <div className="space" aria-hidden>
      <div className="space-planet">
        <span className="ring ring-back" />
        <span className="globe" />
        <span className="ring ring-front" />
        <div className="orbit"><span className="orbiter"><Ship variant="b" /></span></div>
        <div className="orbit orbit-2"><span className="orbiter"><Ship variant="a" /></span></div>
      </div>
      <span className="space-moon" />
      <span className="flyer f1"><Ship variant="a" /></span>
      <span className="flyer f2"><Ship variant="b" /></span>
      <span className="flyer f3"><Ship variant="a" /></span>
    </div>
  );
}
