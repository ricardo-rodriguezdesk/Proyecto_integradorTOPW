import { useEffect, useState } from 'react';
import { useAsync, useDebounce } from '../hooks/useAsync.js';
import { searchWeather } from '../services/api.js';
import Loader from '../components/Loader.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import LastUpdate from '../components/LastUpdate.jsx';
import WeatherScene, { sceneFor } from '../components/WeatherScene.jsx';
import '../styles/weather.css';

// Las imágenes de los iconos vienen del código guardado en la base (no se consulta la API).
const iconUrl = (code, size = 4) => (code ? `https://openweathermap.org/img/wn/${code}@${size}x.png` : null);
const round = (n) => (n === null || n === undefined ? '–' : Math.round(Number(n)));
const kmh = (ms) => (ms === null || ms === undefined ? '–' : Math.round(Number(ms) * 3.6));
const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
const cardinal = (deg) => (deg === null || deg === undefined ? '' : DIRS[Math.round(deg / 45) % 8]);
const CONDITION_ES = {
  Clear: 'Despejado', Clouds: 'Nublado', Rain: 'Lluvia', Drizzle: 'Llovizna', Thunderstorm: 'Tormenta', Snow: 'Nieve',
  Mist: 'Neblina', Fog: 'Niebla', Haze: 'Bruma', Smoke: 'Humo', Dust: 'Polvo', Sand: 'Arena', Ash: 'Ceniza', Squall: 'Ráfagas', Tornado: 'Tornado',
};
const capitalize = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

export default function Weather() {
  const [query, setQuery] = useState('');
  const search = useDebounce(query, 400);
  const [selectedId, setSelectedId] = useState(null);

  const { data: cities, loading, error, reload } = useAsync(() => searchWeather(search, 24), [search]);

  // Al cambiar los resultados, seleccionar la Ciudad de México o la primera ciudad
  useEffect(() => {
    if (!cities?.length) return;
    if (!cities.some((c) => c.city_id === selectedId)) {
      const def = cities.find((c) => /mexico city/i.test(c.city)) ?? cities[0];
      setSelectedId(def.city_id);
    }
  }, [cities, selectedId]);

  const current = cities?.find((c) => c.city_id === selectedId);
  const notFound = !loading && !error && search && cities?.length === 0;

  // El fondo animado sigue a la ciudad seleccionada (se conserva mientras se busca)
  const [sky, setSky] = useState({ scene: 'cloudy', windy: false });
  useEffect(() => { if (current) setSky(sceneFor(current)); }, [current]);

  return (
    <div className="wx-page" data-scene={sky.scene}>
    <WeatherScene scene={sky.scene} windy={sky.windy} />
    <div className="wx container">
      <header className="wx-header">
        <div>
          <h1>Dashboard de Clima</h1>
          <LastUpdate source="weather" />
        </div>
        <form className="wx-search" onSubmit={(e) => e.preventDefault()} role="search">
          <input
            type="search"
            placeholder="Buscar ciudad… (ej. Madrid, Tokyo, Monterrey)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar ciudad"
          />
        </form>
      </header>

      {loading && <Loader label="Consultando el clima…" />}
      <ErrorMessage error={error} onRetry={reload} title="No se pudo cargar el clima" />
      {notFound && (
        <div className="error-box">
          <strong>Ciudad no encontrada</strong>
          <p>No hay datos de «{search}» en la base. Prueba con una capital (en inglés, ej. «Mexico City») o una ciudad de México.</p>
        </div>
      )}
      {!loading && !error && !search && cities?.length === 0 && (
        <div className="error-box"><strong>Sin datos</strong><p>Ejecuta la carga de clima en el backend: <code>npm run load:weather</code></p></div>
      )}

      {!loading && current && (
        <>
          <section className="wx-dashboard">
            <article className="wx-main card">
              <div className="wx-place">
                {current.flag_png && <img src={current.flag_png} alt="" className="wx-flag" />}
                <div>
                  <h2>{current.city}</h2>
                  <p>{current.country}</p>
                </div>
              </div>
              <div className="wx-now">
                {current.icon && <img src={iconUrl(current.icon)} alt={current.description ?? 'Clima'} className="wx-icon" />}
                <span className="wx-temp">{round(current.temp_c)}°</span>
              </div>
              <p className="wx-desc">{capitalize(current.description)}</p>
              <p className="wx-range">Máx {round(current.temp_max_c)}° · Mín {round(current.temp_min_c)}°</p>
              <p className="wx-observed">
                Observado: {new Date(current.observed_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </article>

            <div className="wx-stats">
              <Stat icon="🌡️" label="Sensación térmica" value={`${round(current.feels_like_c)}°C`} />
              <Stat icon="💧" label="Humedad" value={`${current.humidity ?? '–'}%`} bar={current.humidity} />
              <Stat icon="💨" label="Viento" value={`${kmh(current.wind_speed_ms)} km/h`} sub={cardinal(current.wind_deg)} />
              <Stat icon="☁️" label="Nubosidad" value={`${current.clouds ?? '–'}%`} bar={current.clouds} />
              <Stat icon="⏲️" label="Presión" value={`${current.pressure_hpa ?? '–'} hPa`} />
              <Stat icon="🌤️" label="Condición" value={CONDITION_ES[current.condition] ?? current.condition ?? '–'} />
            </div>
          </section>

          <h3 className="wx-subtitle">{search ? `Resultados para «${search}»` : 'Ciudades de México'}</h3>
          <section className="wx-grid">
            {cities.map((c) => (
              <button
                key={c.city_id}
                className={`wx-city card ${c.city_id === selectedId ? 'active' : ''}`}
                onClick={() => setSelectedId(c.city_id)}
              >
                <div>
                  <strong>{c.city}</strong>
                  <span>{c.country}</span>
                </div>
                {c.icon && <img src={iconUrl(c.icon, 2)} alt={c.description ?? ''} />}
                <span className="wx-city-temp">{round(c.temp_c)}°</span>
              </button>
            ))}
          </section>
        </>
      )}
    </div>
    </div>
  );
}

function Stat({ icon, label, value, sub, bar }) {
  return (
    <article className="wx-stat card">
      <span className="wx-stat-icon" aria-hidden>{icon}</span>
      <p className="wx-stat-label">{label}</p>
      <p className="wx-stat-value">{value} {sub && <small>{sub}</small>}</p>
      {typeof bar === 'number' && <div className="wx-bar"><span style={{ width: `${bar}%` }} /></div>}
    </article>
  );
}
