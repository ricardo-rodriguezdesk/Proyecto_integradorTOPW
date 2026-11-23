import { fetchJson } from '../lib/http.js';
import { upsertInChunks } from '../lib/supabase.js';

// Si el servidor principal no responde, se prueba con un espejo idéntico.
const BASES = [process.env.SWAPI_BASE_URL || 'https://swapi.dev/api', 'https://swapi.py4e.com/api']
  .filter((v, i, a) => a.indexOf(v) === i);

const idFromUrl = (url) => {
  const m = /\/(\d+)\/?$/.exec(url ?? '');
  return m ? Number(m[1]) : null;
};
const toInt = (v) => {
  const n = parseInt(String(v).replace(/,/g, ''), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const toNum = (v) => {
  const n = parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const clean = (v) => (v && !['unknown', 'n/a', 'none'].includes(String(v).toLowerCase()) ? v : null);

/** Recorre todas las páginas de un recurso siguiendo el enlace "next". */
async function fetchAllPages(base, resource) {
  const items = [];
  let url = `${base}/${resource}/`;
  let pages = 0;
  while (url && pages < 50) {
    const data = await fetchJson(url.replace(/^http:/, 'https:'));
    items.push(...(data.results ?? []));
    url = data.next;
    pages++;
  }
  return items;
}

async function fetchFromAnyBase(resource) {
  let lastError;
  for (const base of BASES) {
    try {
      return await fetchAllPages(base, resource);
    } catch (err) {
      console.warn(`  ⚠ ${base} falló (${err.message}). Probando otro servidor…`);
      lastError = err;
    }
  }
  throw lastError;
}

export async function loadStarWars() {
  // Primero planetas, porque los personajes los referencian (llave foránea)
  const planets = await fetchFromAnyBase('planets');
  const planetRows = planets
    .map((p) => ({
      id: idFromUrl(p.url),
      name: p.name,
      climate: clean(p.climate),
      terrain: clean(p.terrain),
      population: clean(p.population),
      diameter_km: toInt(p.diameter),
      updated_at: new Date().toISOString(),
    }))
    .filter((p) => p.id);
  await upsertInChunks('sw_planets', planetRows, { onConflict: 'id' });
  const planetIds = new Set(planetRows.map((p) => p.id));

  const people = await fetchFromAnyBase('people');
  const peopleRows = people
    .map((p) => {
      const homeworld = idFromUrl(p.homeworld);
      return {
        id: idFromUrl(p.url),
        name: p.name,
        gender: clean(p.gender),
        birth_year: clean(p.birth_year),
        height_cm: toInt(p.height),
        mass_kg: toNum(p.mass),
        hair_color: clean(p.hair_color),
        eye_color: clean(p.eye_color),
        skin_color: clean(p.skin_color),
        homeworld_id: planetIds.has(homeworld) ? homeworld : null,
        updated_at: new Date().toISOString(),
      };
    })
    .filter((p) => p.id);
  await upsertInChunks('sw_people', peopleRows, { onConflict: 'id' });

  return { records: peopleRows.length, message: `${planetRows.length} planetas` };
}
