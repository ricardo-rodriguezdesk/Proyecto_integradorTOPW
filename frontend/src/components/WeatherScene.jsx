import { useMemo } from 'react';

/**
 * Decide la "escena" visual según el clima guardado en la base:
 * condición (Rain, Clear…), si es de noche (ícono termina en "n"),
 * temperatura y viento.
 */
export function sceneFor(w) {
  if (!w) return { scene: 'cloudy', windy: false };
  const night = String(w.icon ?? '').endsWith('n');
  const temp = Number(w.temp_c);
  const windKmh = Number(w.wind_speed_ms ?? 0) * 3.6;
  let scene;
  switch (w.condition) {
    case 'Thunderstorm': scene = 'storm'; break;
    case 'Rain': case 'Drizzle': case 'Squall': scene = 'rain'; break;
    case 'Snow': scene = 'snow'; break;
    case 'Clear': scene = night ? 'night' : temp >= 30 ? 'hot' : 'sunny'; break;
    case 'Clouds': scene = night ? 'cloudy-night' : 'cloudy'; break;
    case undefined: case null: scene = 'cloudy'; break;
    default: scene = 'fog'; // Mist, Fog, Haze, Smoke, Dust…
  }
  // "Aire frío": se muestran ráfagas de viento si hace frío o sopla fuerte
  const windy = temp < 12 || windKmh >= 25;
  return { scene, windy };
}

const rand = (min, max) => min + Math.random() * (max - min);
const many = (n, make) => Array.from({ length: n }, (_, i) => make(i));

const CLOUDS = { sunny: 2, hot: 1, cloudy: 6, 'cloudy-night': 4, rain: 5, storm: 6, snow: 4, fog: 0, night: 0 };
const DROPS = { rain: 90, storm: 140 };

/** Capa animada de fondo (lluvia, nieve, sol, nubes, estrellas, niebla, viento). */
export default function WeatherScene({ scene, windy }) {
  const parts = useMemo(() => ({
    clouds: many(CLOUDS[scene] ?? 3, () => ({
      '--w': `${rand(160, 340)}px`, '--top': `${rand(2, 55)}%`,
      '--d': `${rand(45, 90)}s`, '--delay': `${-rand(0, 90)}s`, '--o': rand(0.55, 0.95),
    })),
    drops: many(DROPS[scene] ?? 0, () => ({
      '--x': `${rand(-5, 105)}%`, '--h': `${rand(40, 90)}px`,
      '--d': `${rand(0.45, 0.9)}s`, '--delay': `${-rand(0, 1)}s`,
    })),
    flakes: many(scene === 'snow' ? 70 : 0, () => ({
      '--x': `${rand(0, 100)}%`, '--s': `${rand(4, 9)}px`,
      '--d': `${rand(7, 14)}s`, '--delay': `${-rand(0, 14)}s`,
    })),
    stars: many(scene === 'night' || scene === 'cloudy-night' ? 70 : 0, () => ({
      '--x': `${rand(0, 100)}%`, '--y': `${rand(0, 70)}%`, '--s': `${rand(1, 3)}px`,
      '--d': `${rand(2, 5)}s`, '--delay': `${-rand(0, 5)}s`,
    })),
    gusts: many(windy ? 9 : 0, () => ({
      '--y': `${rand(10, 90)}%`, '--w': `${rand(120, 260)}px`,
      '--d': `${rand(2.2, 4)}s`, '--delay': `${-rand(0, 4)}s`,
    })),
  }), [scene, windy]);

  return (
    <div className={`wxs wxs-${scene}`} aria-hidden>
      {(scene === 'sunny' || scene === 'hot') && (
        <div className="wxs-sun"><span className="wxs-rays" /></div>
      )}
      {scene === 'hot' && <div className="wxs-heat" />}
      {(scene === 'night' || scene === 'cloudy-night') && <div className="wxs-moon" />}
      {parts.stars.map((s, i) => <span key={`s${i}`} className="wxs-star" style={s} />)}
      {parts.clouds.map((c, i) => <span key={`c${i}`} className="wxs-cloud" style={c} />)}
      {parts.drops.map((d, i) => <span key={`d${i}`} className="wxs-drop" style={d} />)}
      {parts.flakes.map((f, i) => <span key={`f${i}`} className="wxs-flake" style={f} />)}
      {scene === 'storm' && <div className="wxs-flash" />}
      {scene === 'fog' && <><span className="wxs-fog f1" /><span className="wxs-fog f2" /><span className="wxs-fog f3" /></>}
      {parts.gusts.map((g, i) => <span key={`g${i}`} className="wxs-gust" style={g} />)}
    </div>
  );
}
