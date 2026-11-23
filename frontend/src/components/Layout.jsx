import { NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const LINKS = [
  { to: '/clima', label: 'Clima' },
  { to: '/peliculas', label: 'Películas' },
  { to: '/paises', label: 'Países' },
  { to: '/star-wars', label: 'Star Wars' },
];

export default function Layout() {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="navbar">
        <NavLink to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark" aria-hidden>✦</span> Práctica integradora
        </NavLink>
        <button className="nav-toggle" aria-label="Abrir menú" aria-expanded={open} onClick={() => setOpen(!open)}>☰</button>
        <nav className={`nav-links ${open ? 'open' : ''}`}>
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)}>{l.label}</NavLink>
          ))}
          <div className="nav-user">
            {profile?.avatar
              ? <img src={profile.avatar} alt="" referrerPolicy="no-referrer" />
              : <span className="avatar-fallback">{profile?.name?.[0]?.toUpperCase() ?? '?'}</span>}
            <span className="nav-name" title={profile?.email}>{profile?.name}</span>
            <button className="btn btn-ghost" onClick={signOut}>Salir</button>
          </div>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
