import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from './Loader.jsx';

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader label="Verificando sesión…" fullscreen />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}
