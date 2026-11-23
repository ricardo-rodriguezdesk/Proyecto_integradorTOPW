/**
 * "API propia" del frontend.
 * Todas las consultas van EXCLUSIVAMENTE a Supabase (tablas y vistas).
 * El frontend nunca llama a OpenWeather, TMDb, REST Countries ni SWAPI.
 */
import { supabase } from '../lib/supabase.js';

export class ApiError extends Error {}

function friendly(error, context) {
  const msg = error?.message ?? '';
  if (/failed to fetch|network/i.test(msg)) return 'No hay conexión con el servidor. Revisa tu internet.';
  if (error?.code === 'PGRST301' || /jwt/i.test(msg)) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  if (error?.code === '42P01') return 'La tabla no existe. ¿Ejecutaste supabase/schema.sql?';
  return `${context}: ${msg || 'error desconocido'}`;
}

function unwrap({ data, error, count }, context) {
  if (error) throw new ApiError(friendly(error, context));
  return count === null || count === undefined ? data : { data, count };
}

// Quita caracteres que rompen los filtros de PostgREST
const clean = (s = '') => s.trim().replace(/[%,()*\\]/g, ' ').trim();

/* ----------------------------- Bitácora ----------------------------- */
export async function getLastUpdate(source) {
  return unwrap(
    await supabase.from('etl_runs')
      .select('finished_at,records')
      .eq('source', source).eq('status', 'success')
      .order('finished_at', { ascending: false }).limit(1).maybeSingle(),
    'No se pudo leer la última carga',
  );
}

/* ------------------------------ Clima ------------------------------- */
export async function searchWeather(search = '', limit = 24) {
  const term = clean(search);
  let q = supabase.from('weather_latest').select('*').order('city').limit(limit);
  q = term ? q.ilike('city', `%${term}%`) : q.eq('country_code', 'MX');
  return unwrap(await q, 'No se pudo consultar el clima');
}

/* ----------------------------- Películas ---------------------------- */
export const MOVIES_PAGE_SIZE = 20;

export async function getMovies({ search = '', genreId = null, page = 1 } = {}) {
  const from = (page - 1) * MOVIES_PAGE_SIZE;
  let q = supabase.from('movies_view')
    .select('id,title,poster_url,release_year,vote_average', { count: 'exact' })
    .order('popularity', { ascending: false })
    .range(from, from + MOVIES_PAGE_SIZE - 1);
  const term = clean(search);
  if (term) q = q.ilike('title', `%${term}%`);
  if (genreId) q = q.contains('genre_ids', [genreId]);
  return unwrap(await q, 'No se pudieron cargar las películas');
}

export async function getFeaturedMovie() {
  return unwrap(
    await supabase.from('movies_view').select('*')
      .not('backdrop_url', 'is', null).order('popularity', { ascending: false })
      .limit(1).maybeSingle(),
    'No se pudo cargar la película destacada',
  );
}

export async function getMovie(id) {
  return unwrap(await supabase.from('movies_view').select('*').eq('id', id).single(), 'No se encontró la película');
}

export async function getGenres() {
  return unwrap(await supabase.from('genres').select('id,name').order('name'), 'No se pudieron cargar los géneros');
}

/* ------------------------------ Países ------------------------------ */
export async function getRegions() {
  return unwrap(await supabase.from('regions').select('name').order('name'), 'No se pudieron cargar las regiones');
}

export async function getCountries({ search = '', region = '' } = {}) {
  let q = supabase.from('countries_view')
    .select('cca3,display_name,common_name,region,capital,flag_png,flag_alt')
    .order('display_name');
  const term = clean(search);
  if (term) q = q.or(`display_name.ilike.*${term}*,common_name.ilike.*${term}*`);
  if (region) q = q.eq('region', region);
  return unwrap(await q, 'No se pudieron cargar los países');
}

export async function getCountry(cca3) {
  const country = unwrap(
    await supabase.from('countries_view').select('*').eq('cca3', cca3).single(),
    'No se encontró el país',
  );
  // Nombres de los países vecinos (también desde la base de datos)
  if (country.borders?.length) {
    country.borderCountries = unwrap(
      await supabase.from('countries_view').select('cca3,display_name,flag_png').in('cca3', country.borders).order('display_name'),
      'No se pudieron cargar los países vecinos',
    );
  } else {
    country.borderCountries = [];
  }
  return country;
}

/* ---------------------------- Star Wars ----------------------------- */
export const SW_PAGE_SIZE = 12;

export async function getCharacters({ page = 1, search = '' } = {}) {
  const from = (page - 1) * SW_PAGE_SIZE;
  let q = supabase.from('sw_people_view')
    .select('id,name,gender,birth_year,homeworld', { count: 'exact' })
    .order('id')
    .range(from, from + SW_PAGE_SIZE - 1);
  const term = clean(search);
  if (term) q = q.ilike('name', `%${term}%`);
  return unwrap(await q, 'No se pudieron cargar los personajes');
}

export async function getCharacter(id) {
  return unwrap(await supabase.from('sw_people_view').select('*').eq('id', id).single(), 'No se encontró el personaje');
}
