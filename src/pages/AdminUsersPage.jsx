import { useEffect, useMemo, useState } from 'react'
import * as userApi from '../api/userApi.js'
import { useAuth } from '../context/AuthContext.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Loading from '../components/Loading.jsx'
import { exportToCSV } from '../utils/csv.js'

/**
 * Página de gestión de usuarios. Solo accesible para administradores.
 *
 * Funciona sobre los endpoints del backend:
 *   GET   /users/                 -> lista todos los usuarios
 *   PATCH /users/{id}/admin       -> otorga / revoca rol admin
 *
 * El propio backend protege estos endpoints con require_admin (403),
 * pero además ocultamos la página vía routing (ProtectedAdminRoute) y
 * navbar para evitar que un usuario no admin la vea.
 */
export default function AdminUsersPage() {
  const { currentUser } = useAuth()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [pendingId, setPendingId] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await userApi.listUsers()
      setUsers(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleToggleAdmin = async (user) => {
    const newValue = !user.is_admin
    const action = newValue ? 'otorgar' : 'revocar'
    if (
      !confirm(
        `¿${action[0].toUpperCase() + action.slice(1)} el rol de administrador a ${user.email}?`,
      )
    )
      return

    setError('')
    setSuccess('')
    setPendingId(user.id)
    try {
      const updated = await userApi.setUserAdmin(user.id, newValue)
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
      setSuccess(
        newValue
          ? `${user.email} ahora es administrador.`
          : `Se ha revocado el rol de administrador a ${user.email}.`,
      )
    } catch (err) {
      // El backend lanza 400 si revocas al último admin
      setError(err.message)
    } finally {
      setPendingId(null)
    }
  }

  const visibleUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => u.email.toLowerCase().includes(q))
  }, [users, search])

  const handleExport = () => {
    if (visibleUsers.length === 0) return
    exportToCSV(
      visibleUsers.map((u) => ({
        id: u.id,
        email: u.email,
        is_active: u.is_active ? 'Sí' : 'No',
        is_admin: u.is_admin ? 'Sí' : 'No',
      })),
      [
        { key: 'id', label: 'ID' },
        { key: 'email', label: 'Email' },
        { key: 'is_active', label: 'Activo' },
        { key: 'is_admin', label: 'Admin' },
      ],
      `usuarios-${new Date().toISOString().slice(0, 10)}`,
    )
  }

  // Stats útiles para el panel
  const totalAdmins = users.filter((u) => u.is_admin).length

  return (
    <div>
      <h1>Gestión de usuarios</h1>
      <p className="muted small">
        Sección administrativa. Aquí puedes ver todos los usuarios registrados
        y otorgar o revocar el rol de administrador.
      </p>

      {/* Stats */}
      <section className="stats-grid">
        <div className="stat">
          <span className="stat-label">Usuarios</span>
          <span className="stat-value">{users.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Administradores</span>
          <span className="stat-value">{totalAdmins}</span>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Listado</h2>
          <div className="toolbar">
            <input
              type="search"
              placeholder="Buscar por email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="toolbar-input"
            />
            <button
              onClick={handleExport}
              className="btn btn-secondary btn-sm"
              disabled={visibleUsers.length === 0}
            >
              Exportar CSV
            </button>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}
        {success && <div className="alert alert-success">{success}</div>}

        {loading && <Loading text="Cargando usuarios…" />}

        {!loading && visibleUsers.length === 0 && (
          <p className="muted">
            {users.length === 0
              ? 'No hay usuarios registrados.'
              : 'Ningún usuario coincide con la búsqueda.'}
          </p>
        )}

        {!loading && visibleUsers.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Activo</th>
                <th>Rol</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((u) => {
                const isMe = u.id === currentUser?.id
                return (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>
                      {u.email}{' '}
                      {isMe && (
                        <span className="badge badge-info">tú</span>
                      )}
                    </td>
                    <td>
                      {u.is_active ? (
                        <span className="badge badge-success">activo</span>
                      ) : (
                        <span className="badge badge-muted">inactivo</span>
                      )}
                    </td>
                    <td>
                      {u.is_admin ? (
                        <span className="badge badge-admin">admin</span>
                      ) : (
                        <span className="badge badge-muted">usuario</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleAdmin(u)}
                        className="btn btn-secondary btn-sm"
                        disabled={pendingId === u.id}
                      >
                        {pendingId === u.id
                          ? '…'
                          : u.is_admin
                          ? 'Revocar admin'
                          : 'Hacer admin'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
