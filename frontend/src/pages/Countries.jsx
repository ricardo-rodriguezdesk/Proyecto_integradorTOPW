import { useState } from 'react';
import { useAsync, useDebounce } from '../hooks/useAsync.js';
import { getCountries, getCountry, getRegions } from '../services/api.js';
import Loader from '../components/Loader.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Modal from '../components/Modal.jsx';
import LastUpdate from '../components/LastUpdate.jsx';
import FlagWave from '../components/FlagWave.jsx';
import '../styles/countries.css';

export const REGION_ES = {
  Africa: 'África', Americas: 'América', Asia: 'Asia', Europe: 'Europa', Oceania: 'Oceanía', Antarctic: 'Antártida',
};
const fmt = (n) => (n === null || n === undefined ? '–' : Number(n).toLocaleString('es-MX'));

export default function Countries() {
  const [query, setQuery] = useState('');
  const search = useDebounce(query, 350);
  const [region, setRegion] = useState('');
  const [selected, setSelected] = useState(null);

  const regions = useAsync(getRegions, []);
  const list = useAsync(() => getCountries({ search, region }), [search, region]);

  return (
    <div className="ct container">
      <header className="ct-header">
        <div>
          <p className="eyebrow">Catálogo</p>
          <h1>Buscador de Países</h1>
          <LastUpdate source="countries" />
        </div>
        <input
          className="ct-search"
          type="search"
          placeholder="Buscar país… (ej. México, Japan)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar país"
        />
      </header>

      <div className="ct-filters" role="group" aria-label="Filtrar por región">
        <button className={!region ? 'active' : ''} onClick={() => setRegion('')}>Todas</button>
        {regions.data?.map((r) => (
          <button key={r.name} className={region === r.name ? 'active' : ''} onClick={() => setRegion(r.name)}>
            {REGION_ES[r.name] ?? r.name}
          </button>
        ))}
      </div>

      {list.loading && <Loader label="Cargando países…" />}
      <ErrorMessage error={list.error} onRetry={list.reload} />

      {!list.loading && list.data && (
        <>
          <p className="ct-count">{list.data.length} {list.data.length === 1 ? 'país' : 'países'}</p>
          {list.data.length === 0 && <p className="ct-empty">No encontramos países con esos filtros.</p>}
          <section className="ct-grid">
            {list.data.map((c, i) => (
              <button key={c.cca3} className="ct-card" style={{ '--i': Math.min(i, 20) }} onClick={() => setSelected(c.cca3)}>
                <div className="ct-flag"><img src={c.flag_png} alt={c.flag_alt || `Bandera de ${c.display_name}`} loading="lazy" /></div>
                <div className="ct-card-body">
                  <strong>{c.display_name}</strong>
                  <span className="ct-region">{REGION_ES[c.region] ?? c.region}</span>
                  {c.capital && <span className="ct-capital">Capital: {c.capital}</span>}
                </div>
              </button>
            ))}
          </section>
        </>
      )}

      <CountryPanel cca3={selected} onClose={() => setSelected(null)} onSelect={setSelected} />
    </div>
  );
}

function CountryPanel({ cca3, onClose, onSelect }) {
  const { data: c, loading, error } = useAsync(() => (cca3 ? getCountry(cca3) : null), [cca3]);

  return (
    <Modal open={Boolean(cca3)} onClose={onClose} variant="side" className="ct-panel" label="Detalle del país">
      {loading && <Loader label="Cargando país…" />}
      <ErrorMessage error={error} />
      {!loading && c && (
        <>
          <FlagWave key={c.cca3} src={c.flag_svg || c.flag_png} alt={c.flag_alt || `Bandera de ${c.display_name}`} />
          <h2>{c.display_name}</h2>
          <p className="ct-official">{c.official_name}</p>
          <dl className="ct-facts">
            <div><dt>Región</dt><dd>{REGION_ES[c.region] ?? c.region ?? '–'}</dd></div>
            <div><dt>Subregión</dt><dd>{c.subregion ?? '–'}</dd></div>
            <div><dt>Capital</dt><dd>{c.capital ?? '–'}</dd></div>
            <div><dt>Población</dt><dd>{fmt(c.population)}</dd></div>
            <div><dt>Superficie</dt><dd>{fmt(c.area_km2)} km²</dd></div>
            <div><dt>Código</dt><dd>{c.cca3} / {c.cca2}</dd></div>
          </dl>
          <h3>Idiomas</h3>
          <div className="ct-chips">{c.languages?.length ? c.languages.map((l) => <span key={l}>{l}</span>) : <span>–</span>}</div>
          <h3>Monedas</h3>
          <div className="ct-chips">
            {c.currencies?.length ? c.currencies.map((m) => <span key={m.code}>{m.name} {m.symbol && `(${m.symbol})`}</span>) : <span>–</span>}
          </div>
          <h3>Zonas horarias</h3>
          <div className="ct-chips">{c.timezones?.map((t) => <span key={t}>{t}</span>)}</div>
          <h3>Países vecinos</h3>
          <div className="ct-chips">
            {c.borderCountries?.length
              ? c.borderCountries.map((b) => (
                  <button key={b.cca3} onClick={() => onSelect(b.cca3)}>
                    <img src={b.flag_png} alt="" /> {b.display_name}
                  </button>
                ))
              : <span>Sin fronteras terrestres</span>}
          </div>
          {c.maps_url && <a className="btn ct-map" href={c.maps_url} target="_blank" rel="noreferrer">Ver en el mapa ↗</a>}
        </>
      )}
    </Modal>
  );
}
