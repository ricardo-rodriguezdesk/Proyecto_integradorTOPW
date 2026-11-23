import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LastUpdate from '../components/LastUpdate.jsx';
import '../styles/home.css';

const MODULES = [
  { to: '/clima', source: 'weather', icon: '⛅', title: 'Dashboard de Clima', text: 'Temperatura, humedad y viento de capitales del mundo y ciudades de México.', className: 'm-weather' },
  { to: '/peliculas', source: 'movies', icon: '🎬', title: 'Explorador de Películas', text: 'Busca entre las películas más populares y consulta su detalle.', className: 'm-movies' },
  { to: '/paises', source: 'countries', icon: '🌎', title: 'Buscador de Países', text: 'Catálogo de países con bandera, región, idiomas y monedas.', className: 'm-countries' },
  { to: '/star-wars', source: 'starwars', icon: '🪐', title: 'Personajes de Star Wars', text: 'Galería de personajes con su planeta de origen y características.', className: 'm-starwars' },
];

export default function Home() {
  const { profile } = useAuth();
  return (
    <div className="home container">
      <section className="home-hero">
        <p className="eyebrow">Bienvenido{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}</p>
        <h1>¿Qué quieres explorar hoy?</h1>
        <p>Los datos se obtienen de APIs públicas, se guardan en Supabase y esta aplicación los consulta solo desde ahí.</p>
      </section>
      <section className="home-grid">
        {MODULES.map((m, i) => (
          <Link key={m.to} to={m.to} className={`home-card ${m.className}`} style={{ '--i': i }}>
            <span className="home-icon" aria-hidden>{m.icon}</span>
            <h2>{m.title}</h2>
            <p>{m.text}</p>
            <LastUpdate source={m.source} />
          </Link>
        ))}
      </section>
    </div>
  );
}
