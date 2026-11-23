import { fetchJson, sleep } from '../lib/http.js';
import { upsertInChunks } from '../lib/supabase.js';

const BASE = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p';

function tmdb(path, params = {}) {
  const { TMDB_READ_TOKEN, TMDB_API_KEY } = process.env;
  const qs = new URLSearchParams({ language: 'es-MX', ...params });
  const headers = {};
  if (TMDB_READ_TOKEN) headers.Authorization = `Bearer ${TMDB_READ_TOKEN}`;
  else qs.set('api_key', TMDB_API_KEY);
  return fetchJson(`${BASE}${path}?${qs}`, { headers });
}

export async function loadMovies() {
  if (!process.env.TMDB_READ_TOKEN && !process.env.TMDB_API_KEY) {
    throw new Error('Falta TMDB_READ_TOKEN o TMDB_API_KEY en backend/.env');
  }
  const pages = Math.min(Math.max(parseInt(process.env.TMDB_PAGES || '10', 10) || 10, 1), 500);

  // 1) Catálogo de géneros
  const { genres = [] } = await tmdb('/genre/movie/list');
  await upsertInChunks('genres', genres.map((g) => ({ id: g.id, name: g.name })), { onConflict: 'id' });
  const genreIds = new Set(genres.map((g) => g.id));

  // 2) Películas populares, página por página
  const movies = new Map(); // id → película (evita duplicados entre páginas)
  for (let page = 1; page <= pages; page++) {
    const data = await tmdb('/movie/popular', { page: String(page) });
    for (const m of data.results ?? []) movies.set(m.id, m);
    if (page >= (data.total_pages ?? page)) break;
    await sleep(250);
  }

  const rows = [...movies.values()].map((m) => ({
    id: m.id,
    title: m.title || m.original_title || 'Sin título',
    original_title: m.original_title ?? null,
    overview: m.overview || null,
    release_date: m.release_date || null,
    poster_url: m.poster_path ? `${IMG}/w500${m.poster_path}` : null,
    backdrop_url: m.backdrop_path ? `${IMG}/w1280${m.backdrop_path}` : null,
    vote_average: typeof m.vote_average === 'number' ? Math.round(m.vote_average * 10) / 10 : null,
    vote_count: m.vote_count ?? null,
    popularity: m.popularity ?? null,
    original_language: m.original_language ?? null,
    updated_at: new Date().toISOString(),
  }));
  await upsertInChunks('movies', rows, { onConflict: 'id' });

  const links = [];
  for (const m of movies.values()) {
    for (const g of m.genre_ids ?? []) if (genreIds.has(g)) links.push({ movie_id: m.id, genre_id: g });
  }
  await upsertInChunks('movie_genres', links, { onConflict: 'movie_id,genre_id', ignoreDuplicates: true });

  return { records: rows.length, message: `${pages} páginas, ${genres.length} géneros` };
}
