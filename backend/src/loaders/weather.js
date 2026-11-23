import { fetchJson, sleep } from '../lib/http.js';
import { supabase, upsertInChunks, check } from '../lib/supabase.js';

// Ciudades extra (además de las capitales de todos los países)
const EXTRA_CITIES = [
  { name: 'Guadalajara', country_code: 'MX', lat: 20.6597, lon: -103.3496 },
  { name: 'Monterrey', country_code: 'MX', lat: 25.6866, lon: -100.3161 },
  { name: 'Puebla', country_code: 'MX', lat: 19.0414, lon: -98.2063 },
  { name: 'Querétaro', country_code: 'MX', lat: 20.5888, lon: -100.3899 },
  { name: 'Mérida', country_code: 'MX', lat: 20.9674, lon: -89.5926 },
  { name: 'Cancún', country_code: 'MX', lat: 21.1619, lon: -86.8515 },
  { name: 'Tijuana', country_code: 'MX', lat: 32.5149, lon: -117.0382 },
  { name: 'Oaxaca', country_code: 'MX', lat: 17.0732, lon: -96.7266 },
  { name: 'León', country_code: 'MX', lat: 21.1250, lon: -101.6860 },
  { name: 'Veracruz', country_code: 'MX', lat: 19.1738, lon: -96.1342 },
  { name: 'New York', country_code: 'US', lat: 40.7128, lon: -74.0060 },
  { name: 'Los Angeles', country_code: 'US', lat: 34.0522, lon: -118.2437 },
  { name: 'Barcelona', country_code: 'ES', lat: 41.3874, lon: 2.1686 },
  { name: 'São Paulo', country_code: 'BR', lat: -23.5558, lon: -46.6396 },
];

export async function loadWeather() {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) throw new Error('Falta OPENWEATHER_API_KEY en backend/.env');
  const limit = parseInt(process.env.WEATHER_LIMIT || '0', 10) || 0;
  const delay = parseInt(process.env.WEATHER_DELAY_MS || '1100', 10);

  // 1) Ciudades: capitales guardadas en la tabla countries (carga "countries" primero)
  const capitals = check(
    await supabase.from('countries')
      .select('cca2,capital,capital_lat,capital_lng')
      .not('capital', 'is', null).not('capital_lat', 'is', null),
    'Leer capitales',
  );
  if (capitals.length === 0) throw new Error('No hay países en la base. Ejecuta primero: npm run load:countries');

  const known = new Set(capitals.map((c) => c.cca2));
  let cities = [
    ...EXTRA_CITIES.filter((c) => known.has(c.country_code)),
    ...capitals.map((c) => ({ name: c.capital, country_code: c.cca2, lat: c.capital_lat, lon: c.capital_lng })),
  ];
  // Quitar repetidos por (nombre, país)
  cities = [...new Map(cities.map((c) => [`${c.name}|${c.country_code}`, c])).values()];
  if (limit > 0) cities = cities.slice(0, limit);

  await upsertInChunks('weather_cities', cities, { onConflict: 'name,country_code' });
  const saved = check(await supabase.from('weather_cities').select('id,name,country_code,lat,lon'), 'Leer ciudades');
  const wanted = new Set(cities.map((c) => `${c.name}|${c.country_code}`));
  const targets = saved.filter((c) => wanted.has(`${c.name}|${c.country_code}`));

  // 2) Clima actual de cada ciudad
  const conditions = new Map();
  const readings = [];
  const owmIds = [];
  let failed = 0;

  for (const [i, city] of targets.entries()) {
    try {
      const qs = new URLSearchParams({ lat: city.lat, lon: city.lon, units: 'metric', lang: 'es', appid: key });
      const w = await fetchJson(`https://api.openweathermap.org/data/2.5/weather?${qs}`);
      const cond = w.weather?.[0];
      if (cond) conditions.set(cond.id, { id: cond.id, main: cond.main, description: cond.description });
      readings.push({
        city_id: city.id,
        condition_id: cond?.id ?? null,
        icon: cond?.icon ?? null,
        temp_c: w.main?.temp ?? null,
        feels_like_c: w.main?.feels_like ?? null,
        temp_min_c: w.main?.temp_min ?? null,
        temp_max_c: w.main?.temp_max ?? null,
        humidity: w.main?.humidity ?? null,
        pressure_hpa: w.main?.pressure ?? null,
        wind_speed_ms: w.wind?.speed ?? null,
        wind_deg: w.wind?.deg ?? null,
        clouds: w.clouds?.all ?? null,
        observed_at: new Date((w.dt ?? Date.now() / 1000) * 1000).toISOString(),
      });
      if (w.id) owmIds.push({ id: city.id, owm_id: w.id });
    } catch (err) {
      failed++;
      console.warn(`  ⚠ ${city.name} (${city.country_code}): ${err.message}`);
      if (err.status === 401) throw new Error('OpenWeather rechazó la API key (401). Las llaves nuevas tardan hasta 2 h en activarse.');
    }
    if ((i + 1) % 25 === 0) console.log(`  … ${i + 1}/${targets.length} ciudades`);
    await sleep(delay);
  }

  // 3) Guardar: primero condiciones (llave foránea), luego lecturas
  await upsertInChunks('weather_conditions', [...conditions.values()], { onConflict: 'id' });
  await upsertInChunks('weather_readings', readings, { onConflict: 'city_id,observed_at', ignoreDuplicates: true });
  for (const { id, owm_id } of owmIds) {
    await supabase.from('weather_cities').update({ owm_id }).eq('id', id);
  }

  if (readings.length === 0) throw new Error('No se pudo obtener el clima de ninguna ciudad');
  return { records: readings.length, message: failed ? `${failed} ciudades con error` : null };
}
