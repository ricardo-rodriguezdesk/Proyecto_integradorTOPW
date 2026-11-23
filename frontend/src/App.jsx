import { Routes, Route, Navigate } from 'react-router-dom';
import { isConfigured } from './lib/supabase.js';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import Weather from './pages/Weather.jsx';
import Movies from './pages/Movies.jsx';
import Countries from './pages/Countries.jsx';
import StarWars from './pages/StarWars.jsx';

export default function App() {
  if (!isConfigured) {
    return (
      <div className="config-missing">
        <h1>Falta configurar Supabase</h1>
        <p>Crea el archivo <code>frontend/.env</code> a partir de <code>.env.example</code> con
          <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>, y reinicia <code>npm run dev</code>.</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Home />} />
        <Route path="clima" element={<Weather />} />
        <Route path="peliculas" element={<Movies />} />
        <Route path="paises" element={<Countries />} />
        <Route path="star-wars" element={<StarWars />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
