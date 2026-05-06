import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import * as projectApi from '../api/projectApi.js'
import * as taskApi from '../api/taskApi.js'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Loading from '../components/Loading.jsx'

/**
 * Dashboard con métricas calculadas en cliente a partir de los endpoints
 * existentes (no añade endpoints nuevos al backend del TFG).
 *
 * Métricas:
 *  - Total de proyectos
 *  - Total de tareas
 *  - Media de tareas por proyecto
 *  - Proyecto con más tareas
 *  - Tabla "tareas por proyecto" (top 5)
 */
export default function DashboardPage() {
  const { logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [projectsData, tasksData] = await Promise.all([
          projectApi.listProjects({ skip: 0, limit: 100 }),
          taskApi.listTasks(),
        ])
        if (cancelled) return
        setProjects(projectsData || [])
        setTasks(tasksData || [])
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Cálculo de métricas. useMemo evita recalcular en cada render.
  const stats = useMemo(() => {
    const totalProjects = projects.length
    const totalTasks = tasks.length

    // Conteo de tareas por project_id
    const tasksByProject = {}
    for (const t of tasks) {
      const key = t.project_id
      tasksByProject[key] = (tasksByProject[key] || 0) + 1
    }

    // Tabla enriquecida con nombres de proyecto, ordenada desc
    const breakdown = projects
      .map((p) => ({
        id: p.id,
        name: p.name,
        count: tasksByProject[p.id] || 0,
      }))
      .sort((a, b) => b.count - a.count)

    const topProject = breakdown[0] && breakdown[0].count > 0 ? breakdown[0] : null

    const avg =
      totalProjects > 0 ? (totalTasks / totalProjects).toFixed(2) : '0.00'

    return {
      totalProjects,
      totalTasks,
      avg,
      topProject,
      breakdown: breakdown.slice(0, 5),
    }
  }, [projects, tasks])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="muted">
        Sesión iniciada correctamente. Resumen del estado actual de la API.
      </p>

      {error && <ErrorMessage message={error} />}

      {loading ? (
        <Loading text="Calculando métricas…" />
      ) : (
        <>
          {/* ----- KPIs ----- */}
          <section className="stats-grid">
            <div className="stat">
              <span className="stat-label">Proyectos</span>
              <span className="stat-value">{stats.totalProjects}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Tareas</span>
              <span className="stat-value">{stats.totalTasks}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Media tareas/proyecto</span>
              <span className="stat-value">{stats.avg}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Proyecto más cargado</span>
              <span className="stat-value stat-value-sm">
                {stats.topProject
                  ? `${stats.topProject.name} (${stats.topProject.count})`
                  : '—'}
              </span>
            </div>
          </section>

          {/* ----- Desglose ----- */}
          {stats.breakdown.length > 0 && (
            <section className="panel">
              <h2>Tareas por proyecto (top 5)</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Proyecto</th>
                    <th>Tareas</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.breakdown.map((row) => (
                    <tr key={row.id}>
                      <td>{row.id}</td>
                      <td>{row.name}</td>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}

      {/* ----- Accesos rápidos ----- */}
      <section className="card-grid">
        <Link to="/projects" className="card">
          <h2>Proyectos</h2>
          <p>Listar y crear proyectos.</p>
        </Link>

        <Link to="/tasks" className="card">
          <h2>Tareas</h2>
          <p>Listar y crear tareas asociadas a un proyecto.</p>
        </Link>

        <Link to="/board" className="card">
          <h2>Tablero</h2>
          <p>Vista Kanban con drag & drop.</p>
        </Link>

        <Link to="/reports" className="card">
          <h2>Informes</h2>
          <p>Gráficas y exportación de informes.</p>
        </Link>

        <Link to="/about-api" className="card">
          <h2>Acerca de la API</h2>
          <p>Esquema OpenAPI generado por FastAPI.</p>
        </Link>

        {isAdmin && (
          <Link to="/admin/users" className="card card-admin">
            <h2>Usuarios</h2>
            <p>Gestión de usuarios y permisos. Solo administradores.</p>
          </Link>
        )}
      </section>

      <button onClick={handleLogout} className="btn btn-secondary">
        Cerrar sesión
      </button>
    </div>
  )
}
