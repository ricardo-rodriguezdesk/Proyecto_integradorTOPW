import { runEtl } from './lib/etl.js';
import { loadCountries } from './loaders/countries.js';
import { loadStarWars } from './loaders/starwars.js';
import { loadMovies } from './loaders/movies.js';
import { loadWeather } from './loaders/weather.js';

// El orden importa: el clima usa las capitales de la tabla countries.
const LOADERS = {
  countries: loadCountries,
  starwars: loadStarWars,
  movies: loadMovies,
  weather: loadWeather,
};

const arg = (process.argv[2] || 'all').toLowerCase();
const selected = arg === 'all' ? Object.keys(LOADERS) : [arg];

if (!selected.every((s) => LOADERS[s])) {
  console.error(`Uso: node src/index.js [all|${Object.keys(LOADERS).join('|')}]`);
  process.exit(1);
}

const results = [];
for (const source of selected) {
  results.push(await runEtl(source, LOADERS[source]));
}

console.log('\nResumen:');
console.table(results.map((r) => ({ fuente: r.source, estado: r.ok ? 'OK' : 'ERROR', registros: r.records ?? 0 })));
process.exit(results.every((r) => r.ok) ? 0 : 1);
