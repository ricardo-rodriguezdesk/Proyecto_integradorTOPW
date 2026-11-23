import { fetchJson, sleep } from '../lib/http.js';
import { supabase, upsertInChunks, check } from '../lib/supabase.js';

// REST Countries v5 (la v3.1 fue dada de baja). Requiere una API key gratuita.
const BASE = 'https://api.restcountries.com/countries/v5';
const PAGE_SIZE = 100; // máximo permitido en el plan gratuito

/** Descarga todos los países recorriendo la paginación (limit + offset). */
async function fetchAllCountries(apiKey) {
  const all = [];
  let offset = 0;
  for (let guard = 0; guard < 20; guard++) {
    const url = `${BASE}?limit=${PAGE_SIZE}&offset=${offset}`;
    const body = await fetchJson(url, { headers: { Authorization: `Bearer ${apiKey}` } });

    if (body?.errors?.length) throw new Error(`REST Countries: ${body.errors.map((e) => e.message).join(' | ')}`);
    if (body?.data?._demo) throw new Error('REST Countries respondió en modo demo. Revisa RESTCOUNTRIES_API_KEY en backend/.env');

    const objects = body?.data?.objects ?? [];
    all.push(...objects);
    const meta = body?.data?.meta ?? {};
    if (!meta.more || objects.length === 0) break;
    offset += objects.length;
    await sleep(200);
  }
  return all;
}

const asArray = (v) => (Array.isArray(v) ? v : v && typeof v === 'object' ? Object.entries(v).map(([code, x]) => ({ code, ...x })) : []);

export async function loadCountries() {
  const apiKey = process.env.RESTCOUNTRIES_API_KEY;
  if (!apiKey) throw new Error('Falta RESTCOUNTRIES_API_KEY en backend/.env (créala gratis en restcountries.com)');

  const raw = await fetchAllCountries(apiKey);
  const countries = raw.filter((c) => c?.codes?.alpha_3 && c?.codes?.alpha_2);
  if (countries.length === 0) throw new Error('REST Countries no devolvió países');

  // 1) Regiones (catálogo sin repetidos)
  const regionNames = [...new Set(countries.map((c) => c.region).filter(Boolean))];
  await upsertInChunks('regions', regionNames.map((name) => ({ name })), { onConflict: 'name' });
  const regions = check(await supabase.from('regions').select('id,name'), 'Leer regiones');
  const regionId = new Map(regions.map((r) => [r.name, r.id]));

  // 2) Subregiones
  const subMap = new Map();
  for (const c of countries) {
    if (c.subregion && c.region) subMap.set(c.subregion, regionId.get(c.region));
  }
  await upsertInChunks('subregions', [...subMap].map(([name, region_id]) => ({ name, region_id })), { onConflict: 'name' });
  const subs = check(await supabase.from('subregions').select('id,name'), 'Leer subregiones');
  const subId = new Map(subs.map((s) => [s.name, s.id]));

  // 3) Países
  const rows = countries.map((c) => {
    const capital = (c.capitals ?? []).find((k) => k?.attributes?.primary) ?? c.capitals?.[0];
    const area = typeof c.area === 'object' ? c.area?.kilometers : c.area;
    return {
      cca3: c.codes.alpha_3,
      cca2: c.codes.alpha_2,
      common_name: c.names?.common ?? c.codes.alpha_3,
      official_name: c.names?.official ?? null,
      name_es: c.names?.translations?.spa?.common ?? null,
      region_id: regionId.get(c.region) ?? null,
      subregion_id: subId.get(c.subregion) ?? null,
      capital: capital?.name ?? null,
      capital_lat: capital?.coordinates?.lat ?? null,
      capital_lng: capital?.coordinates?.lng ?? null,
      population: Number.isFinite(c.population) ? c.population : null,
      area_km2: Number.isFinite(area) && area >= 0 ? area : null,
      flag_png: c.flag?.url_png ?? null,
      flag_svg: c.flag?.url_svg ?? null,
      flag_alt: c.flag?.description ?? null,
      maps_url: c.links?.google_maps ?? null,
      timezones: c.timezones ?? [],
      updated_at: new Date().toISOString(),
    };
  });
  await upsertInChunks('countries', rows, { onConflict: 'cca3' });

  // 4) Idiomas, monedas y fronteras (catálogos + tablas puente)
  const languages = new Map();
  const currencies = new Map();
  const countryLanguages = new Map();
  const countryCurrencies = new Map();
  const borders = new Map();
  const validCodes = new Set(rows.map((r) => r.cca3));

  for (const c of countries) {
    const cca3 = c.codes.alpha_3;
    for (const l of c.languages ?? []) {
      const code = l.iso639_3 || l.iso639_2t || l.iso639_1 || l.bcp47;
      if (!code) continue;
      languages.set(code, { code, name: l.name || l.native_name || code });
      countryLanguages.set(`${cca3}|${code}`, { country_cca3: cca3, language_code: code });
    }
    for (const m of asArray(c.currencies)) {
      if (!m?.code) continue;
      currencies.set(m.code, { code: m.code, name: m.name ?? m.code, symbol: m.symbol ?? null });
      countryCurrencies.set(`${cca3}|${m.code}`, { country_cca3: cca3, currency_code: m.code });
    }
    for (const b of c.borders ?? []) {
      if (validCodes.has(b) && b !== cca3) borders.set(`${cca3}|${b}`, { country_cca3: cca3, border_cca3: b });
    }
  }

  await upsertInChunks('languages', [...languages.values()], { onConflict: 'code' });
  await upsertInChunks('currencies', [...currencies.values()], { onConflict: 'code' });
  await upsertInChunks('country_languages', [...countryLanguages.values()], { onConflict: 'country_cca3,language_code', ignoreDuplicates: true });
  await upsertInChunks('country_currencies', [...countryCurrencies.values()], { onConflict: 'country_cca3,currency_code', ignoreDuplicates: true });
  await upsertInChunks('country_borders', [...borders.values()], { onConflict: 'country_cca3,border_cca3', ignoreDuplicates: true });

  return {
    records: rows.length,
    message: `${regionNames.length} regiones, ${languages.size} idiomas, ${currencies.size} monedas`,
  };
}