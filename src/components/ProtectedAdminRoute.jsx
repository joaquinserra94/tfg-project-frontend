import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Loading from './Loading.jsx'

/**
 * Envuelve rutas que solo pueden ver administradores.
 * - Si no hay sesión: redirige a /login.
 * - Si hay sesión pero el usuario aún no se ha cargado: muestra loading.
 * - Si hay sesión y NO es admin: redirige a /dashboard.
 * - Si es admin: renderiza children.
 */
export default function ProtectedAdminRoute({ children }) {
  const { isAuthenticated, currentUser, loadingUser, isAdmin } = useAuth()

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (loadingUser || !currentUser) return <Loading text="Verificando permisos…" />
  if (!isAdmin) return <Navigate to="/dashboard" replace />

  return children
}
