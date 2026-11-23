import { useEffect, useState } from 'react';
import { useAsync, useDebounce } from '../hooks/useAsync.js';
import { getFeaturedMovie, getGenres, getMovie, getMovies, MOVIES_PAGE_SIZE } from '../services/api.js';
import Loader from '../components/Loader.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Pagination from '../components/Pagination.jsx';
import Modal from '../components/Modal.jsx';
import LastUpdate from '../components/LastUpdate.jsx';
import '../styles/movies.css';

const year = (m) => m.release_year ?? (m.release_date ? m.release_date.slice(0, 4) : 'S/F');

export default function Movies() {
  const [query, setQuery] = useState('');
  const search = useDebounce(query, 400);
  const [genreId, setGenreId] = useState(null);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => setPage(1), [search, genreId]);

  const genres = useAsync(getGenres, []);
  const featured = useAsync(getFeaturedMovie, []);
  const list = useAsync(() => getMovies({ search, genreId, page }), [search, genreId, page]);

  const totalPages = list.data ? Math.ceil(list.data.count / MOVIES_PAGE_SIZE) : 0;
  const showHero = !search && !genreId && page === 1 && featured.data;

  const changePage = (p) => {
    setPage(p);
    window.scrollTo({ top: showHero ? 420 : 0, behavior: 'smooth' });
  };

  return (
    <div className="mv">
      {showHero && (
        <section className="mv-hero" style={{ backgroundImage: `url(${featured.data.backdrop_url})` }}>
          <div className="mv-hero-shade">
            <p className="mv-badge">N.º 1 en popularidad</p>
            <h1>{featured.data.title}</h1>
            <p className="mv-hero-meta">{year(featured.data)} · ★ {featured.data.vote_average ?? '–'} · {featured.data.genres?.join(', ')}</p>
            <p className="mv-hero-overview">{featured.data.overview}</p>
            <button className="mv-btn" onClick={() => setSelectedId(featured.data.id)}>ⓘ Más información</button>
          </div>
        </section>
      )}

      <div className="mv-body">
        <div className="mv-toolbar">
          <div>
            <h2>{search ? `Resultados para «${search}»` : 'Películas populares'}</h2>
            <LastUpdate source="movies" />
          </div>
          <input
            className="mv-search"
            type="search"
            placeholder="🔍  Títulos, sagas…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar películas"
          />
        </div>

        {genres.data && (
          <div className="mv-genres" role="tablist" aria-label="Géneros">
            <button className={!genreId ? 'active' : ''} onClick={() => setGenreId(null)}>Todas</button>
            {genres.data.map((g) => (
              <button key={g.id} className={genreId === g.id ? 'active' : ''} onClick={() => setGenreId(g.id)}>{g.name}</button>
            ))}
          </div>
        )}

        {list.loading && <Loader label="Cargando películas…" className="mv-loader" />}
        <ErrorMessage error={list.error} onRetry={list.reload} />
        {!list.loading && list.data?.data.length === 0 && (
          <p className="mv-empty">No encontramos películas{search ? ` para «${search}»` : ''}.</p>
        )}

        {!list.loading && list.data && (
          <>
            <p className="mv-count">{list.data.count} películas · página {page} de {totalPages || 1}</p>
            <section className="mv-grid">
              {list.data.data.map((m, i) => (
                <button key={m.id} className="mv-card" style={{ '--i': i }} onClick={() => setSelectedId(m.id)}>
                  {m.poster_url
                    ? <img src={m.poster_url} alt={`Póster de ${m.title}`} loading="lazy" />
                    : <div className="mv-noposter">{m.title}</div>}
                  <div className="mv-card-info">
                    <strong>{m.title}</strong>
                    <span>{year(m)} · ★ {m.vote_average ?? '–'}</span>
                  </div>
                </button>
              ))}
            </section>
            <Pagination page={page} totalPages={totalPages} onChange={changePage} className="mv-pagination" />
          </>
        )}
      </div>

      <MovieDetail id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function MovieDetail({ id, onClose }) {
  const { data: m, loading, error } = useAsync(() => (id ? getMovie(id) : null), [id]);
  return (
    <Modal open={Boolean(id)} onClose={onClose} className="mv-modal" label="Detalle de la película">
      {loading && <Loader label="Cargando detalle…" className="mv-loader" />}
      <ErrorMessage error={error} />
      {!loading && m && (
        <>
          <div className="mv-modal-banner" style={{ backgroundImage: m.backdrop_url ? `url(${m.backdrop_url})` : 'none' }} />
          <div className="mv-modal-body">
            {m.poster_url && <img src={m.poster_url} alt={`Póster de ${m.title}`} className="mv-modal-poster" />}
            <div>
              <h2>{m.title}</h2>
              {m.original_title && m.original_title !== m.title && <p className="mv-original">{m.original_title}</p>}
              <p className="mv-meta">
                <span className="mv-score">★ {m.vote_average ?? '–'}</span>
                <span>{m.vote_count ?? 0} votos</span>
                <span>{m.release_date ? new Date(`${String(m.release_date).slice(0, 10)}T12:00:00`).toLocaleDateString('es-MX', { dateStyle: 'long' }) : 'Sin fecha'}</span>
                <span>{m.original_language?.toUpperCase()}</span>
              </p>
              <div className="mv-tags">{m.genres?.map((g) => <span key={g}>{g}</span>)}</div>
              <p className="mv-overview">{m.overview || 'Sin sinopsis disponible.'}</p>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
