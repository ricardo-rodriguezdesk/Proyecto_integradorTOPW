import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/Loader.jsx';
import '../styles/login.css';

const LABELS = { github: 'GitHub', google: 'Google', gitlab: 'GitLab', discord: 'Discord', azure: 'Microsoft' };
const PROVIDERS = (import.meta.env.VITE_OAUTH_PROVIDERS || 'github,google')
  .split(',').map((p) => p.trim().toLowerCase()).filter(Boolean);

export default function Login() {
  const { session, loading, signIn } = useAuth();
  const location = useLocation();
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);

  if (loading) return <Loader label="Verificando sesión…" fullscreen />;
  if (session) return <Navigate to={location.state?.from || '/'} replace />;

  const handle = async (provider) => {
    setError(null);
    setPending(provider);
    try {
      await signIn(provider); // redirige al proveedor
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión');
      setPending(null);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <span className="login-spark" aria-hidden>✦</span>
        <h1>Práctica integradora</h1>
        <p className="login-sub">Clima · Películas · Países · Star Wars</p>
        <p className="login-text">Inicia sesión con tu cuenta para explorar los datos guardados en Supabase.</p>
        <div className="login-buttons">
          {PROVIDERS.map((p) => (
            <button key={p} className={`btn btn-provider btn-${p}`} onClick={() => handle(p)} disabled={Boolean(pending)}>
              {pending === p ? 'Redirigiendo…' : `Continuar con ${LABELS[p] ?? p}`}
            </button>
          ))}
        </div>
        {error && <p className="login-error" role="alert">⚠ {error}</p>}
        <p className="login-foot">Autenticación OAuth mediante Supabase Auth</p>
      </div>
    </div>
  );
}
