import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import ProtectedAdminRoute from './components/ProtectedAdminRoute.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import ProjectsPage from './pages/ProjectsPage.jsx'
import TasksPage from './pages/TasksPage.jsx'
import BoardPage from './pages/BoardPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import AdminUsersPage from './pages/AdminUsersPage.jsx'
import AboutApiPage from './pages/AboutApiPage.jsx'

/**
 * Componente raíz: define la barra de navegación y las rutas.
 * Las rutas privadas se envuelven con <ProtectedRoute />.
 *
 * /about-api se deja PÚBLICA para que pueda mostrarse en la defensa
 * del TFG sin necesidad de loguearse.
 */
export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="container">
        <Routes>
          {/* Públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/about-api" element={<AboutApiPage />} />

          {/* Privadas */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <ProjectsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <TasksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/board"
            element={
              <ProtectedRoute>
                <BoardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedAdminRoute>
                <AdminUsersPage />
              </ProtectedAdminRoute>
            }
          />

          {/* Default: el ProtectedRoute mandará a /login si no hay sesión */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  )
}
