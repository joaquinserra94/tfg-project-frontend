import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { useAssignedCount } from '../hooks/useAssignedCount.js'

export default function Navbar() {
  const { isAuthenticated, isAdmin, currentUser, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  // Contador de tareas asignadas al usuario actual y aún no completadas.
  // Se calcula a partir de assignee == currentUser.email en localStorage.
  const assignedCount = useAssignedCount(currentUser?.email, isAuthenticated)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const themeIcon = theme === 'dark' ? '☀' : '☾'
  const themeTitle = theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'

  return (
    <nav className={`navbar ${isAdmin ? 'navbar-admin' : ''}`}>
      <div className="navbar-inner">
        <Link to="/dashboard" className="navbar-brand">
          TFG · Project API
          {isAdmin && <span className="navbar-admin-badge">admin</span>}
        </Link>

        <div className="navbar-links">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/projects">Proyectos</Link>
              <Link
                to="/tasks"
                className={assignedCount > 0 ? 'has-counter' : ''}
                title={
                  assignedCount > 0
                    ? `Tienes ${assignedCount} tarea${assignedCount === 1 ? '' : 's'} asignada${assignedCount === 1 ? '' : 's'}`
                    : 'Tareas'
                }
              >
                Tareas
                {assignedCount > 0 && (
                  <span className="nav-counter" aria-label={`${assignedCount} pendientes`}>
                    {assignedCount}
                  </span>
                )}
              </Link>
              <Link to="/board">Tablero</Link>
              <Link to="/reports">Informes</Link>
              {isAdmin && <Link to="/admin/users">Usuarios</Link>}
              <Link to="/about-api">Acerca de la API</Link>
              <button
                onClick={toggleTheme}
                className="btn-theme"
                title={themeTitle}
                aria-label={themeTitle}
              >
                {themeIcon}
              </button>
              {currentUser?.email && (
                <span className="navbar-user" title={currentUser.email}>
                  {currentUser.email}
                </span>
              )}
              <button onClick={handleLogout} className="btn btn-link">
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Registro</Link>
              <Link to="/about-api">Acerca de la API</Link>
              <button
                onClick={toggleTheme}
                className="btn-theme"
                title={themeTitle}
                aria-label={themeTitle}
              >
                {themeIcon}
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
