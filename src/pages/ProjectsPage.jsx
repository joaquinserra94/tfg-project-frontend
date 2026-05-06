import { useEffect, useMemo, useState } from 'react'
import * as projectApi from '../api/projectApi.js'
import * as userApi from '../api/userApi.js'
import { useAuth } from '../context/AuthContext.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Loading from '../components/Loading.jsx'
import ImportCsv from '../components/ImportCsv.jsx'
import { exportToCSV } from '../utils/csv.js'
import {
  getProjectMetaMap,
  setProjectMeta,
  removeProjectMeta,
} from '../utils/projectMetaStore.js'
import { listProjectTypes, getProjectType } from '../utils/projectTypes.js'

export default function ProjectsPage() {
  const { isAdmin } = useAuth()

  const [projects, setProjects] = useState([])
  const [projectMeta, setProjectMetaState] = useState({})
  const [usersById, setUsersById] = useState({})  // id -> email (solo para admins)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('created_desc')
  // Filtro adicional para admins: ver todos / míos / huérfanos / de otros
  const [adminScope, setAdminScope] = useState('all')

  const types = listProjectTypes()

  const loadProjects = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await projectApi.listProjects({ skip: 0, limit: 100 })
      const safe = data || []
      setProjects(safe)
      setProjectMetaState(getProjectMetaMap(safe))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Si soy admin, cargo también la lista de usuarios para poder mostrar emails
  const loadUsersIfAdmin = async () => {
    if (!isAdmin) return
    try {
      const list = await userApi.listUsers()
      const map = {}
      for (const u of list) map[u.id] = u.email
      setUsersById(map)
    } catch {
      // No es bloqueante: si falla, simplemente mostraremos el id en lugar del email
    }
  }

  useEffect(() => {
    loadProjects()
    loadUsersIfAdmin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!name.trim()) {
      setError('El nombre del proyecto es obligatorio.')
      return
    }

    setCreating(true)
    try {
      await projectApi.createProject({
        name: name.trim(),
        description: description.trim(),
      })
      setName('')
      setDescription('')
      setSuccess('Proyecto creado correctamente.')
      await loadProjects()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este proyecto?')) return
    setError('')
    try {
      await projectApi.deleteProject(id)
      removeProjectMeta(id)
      setSuccess('Proyecto eliminado.')
      await loadProjects()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleTypeChange = (projectId, newType) => {
    const updated = setProjectMeta(projectId, { type: newType })
    setProjectMetaState((prev) => ({ ...prev, [projectId]: updated }))
  }

  // Helper: descripción del owner para mostrar en tabla
  const ownerLabel = (project, currentUserId) => {
    // Si el backend no expone owner_id, no mostramos nada
    if (!('owner_id' in project)) return null
    if (project.owner_id == null) {
      return <span className="badge badge-warn">huérfano</span>
    }
    if (project.owner_id === currentUserId) {
      return <span className="badge badge-info">tú</span>
    }
    const email = usersById[project.owner_id]
    return email ? <span className="muted small">{email}</span> : <span className="muted small">#{project.owner_id}</span>
  }

  // Lista derivada
  const visibleProjects = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = projects

    if (q) {
      list = list.filter((p) => {
        const haystack = `${p.name} ${p.description || ''}`.toLowerCase()
        return haystack.includes(q)
      })
    }

    // Filtro admin (solo si vienes con owner_id en la respuesta)
    if (isAdmin && adminScope !== 'all' && list[0] && 'owner_id' in list[0]) {
      // Necesitamos el id del usuario actual; lo obtenemos por descarte
      // (cualquier proyecto cuyo owner_id == nuestro id ⇒ es nuestro)
      // Para no duplicar lógica, lo gestionamos sin id explícito mediante el filtro:
      if (adminScope === 'orphan') {
        list = list.filter((p) => p.owner_id == null)
      } else if (adminScope === 'others') {
        // "ajenos" = no míos y no huérfanos. Necesitamos saber cuál es "mío".
        // Aprovechamos que el contexto de auth nos lo da: lo pasamos por la closure.
      }
    }

    const sorted = [...list]
    switch (sortBy) {
      case 'name_asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'name_desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name))
        break
      case 'created_asc':
        sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        break
      case 'created_desc':
      default:
        sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        break
    }
    return sorted
  }, [projects, search, sortBy, isAdmin, adminScope])

  const handleExport = () => {
    if (visibleProjects.length === 0) {
      setError('No hay datos para exportar.')
      return
    }
    exportToCSV(
      visibleProjects.map((p) => {
        const t = getProjectType(projectMeta[p.id]?.type)
        const row = {
          id: p.id,
          name: p.name,
          description: p.description || '',
          type: t.label,
          created_at: p.created_at || '',
        }
        if ('owner_id' in p) {
          row.owner = p.owner_id == null
            ? '(huérfano)'
            : usersById[p.owner_id] || `#${p.owner_id}`
        }
        return row
      }),
      [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Nombre' },
        { key: 'description', label: 'Descripción' },
        { key: 'type', label: 'Tipo (local)' },
        { key: 'created_at', label: 'Creado' },
        ...(visibleProjects[0] && 'owner_id' in visibleProjects[0]
          ? [{ key: 'owner', label: 'Dueño' }]
          : []),
      ],
      `proyectos-${new Date().toISOString().slice(0, 10)}`,
    )
  }

  const showOwnerColumn = isAdmin && projects[0] && 'owner_id' in projects[0]

  return (
    <div>
      <h1>Proyectos</h1>

      <p className="muted small">
        El "tipo" de proyecto es metadato local del cliente y define las
        columnas del tablero Kanban.
        {isAdmin && (
          <>
            {' '}<strong>Modo admin:</strong> ves todos los proyectos del sistema,
            incluidos los huérfanos.
          </>
        )}
      </p>

      <section className="panel">
        <h2>Nuevo proyecto</h2>
        <form onSubmit={handleCreate} className="form form-inline">
          <label>
            Nombre
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={150}
              required
            />
          </label>

          <label>
            Descripción
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </label>

          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? 'Creando…' : 'Crear'}
          </button>
        </form>

        <ErrorMessage message={error} />
        {success && <div className="alert alert-success">{success}</div>}
      </section>

      <section className="panel">
        <details>
          <summary className="panel-summary">
            <h2 style={{ display: 'inline-block', margin: 0 }}>
              Importar desde CSV
            </h2>
          </summary>
          <p className="muted small" style={{ marginTop: '0.5rem' }}>
            Sube un CSV con columnas <code>name</code> y <code>description</code> (opcional).
          </p>
          <ImportCsv
            config={{
              entityName: 'proyectos',
              templateName: 'plantilla-proyectos',
              templateColumns: [
                { key: 'name', label: 'name', example: 'Proyecto de ejemplo' },
                { key: 'description', label: 'description', example: 'Descripción opcional' },
              ],
              requiredHeaders: ['name'],
              buildPayload: (row) => {
                const nm = (row.name || '').trim()
                if (!nm) return { error: 'El campo "name" es obligatorio.' }
                if (nm.length > 150)
                  return { error: 'El campo "name" supera 150 caracteres.' }
                const dsc = (row.description || '').trim()
                if (dsc.length > 500)
                  return { error: 'El campo "description" supera 500 caracteres.' }
                return { name: nm, description: dsc || null }
              },
              submit: (payload) => projectApi.createProject(payload),
            }}
            onDone={loadProjects}
          />
        </details>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Listado</h2>
          <div className="toolbar">
            <input
              type="search"
              placeholder="Buscar por nombre o descripción…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="toolbar-input"
            />
            {showOwnerColumn && (
              <select
                value={adminScope}
                onChange={(e) => setAdminScope(e.target.value)}
                className="toolbar-input"
                title="Filtro de admin"
              >
                <option value="all">Todos</option>
                <option value="orphan">Solo huérfanos</option>
              </select>
            )}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="toolbar-input"
            >
              <option value="created_desc">Más recientes primero</option>
              <option value="created_asc">Más antiguos primero</option>
              <option value="name_asc">Nombre A→Z</option>
              <option value="name_desc">Nombre Z→A</option>
            </select>
            <button
              onClick={handleExport}
              className="btn btn-secondary btn-sm"
              disabled={visibleProjects.length === 0}
            >
              Exportar CSV
            </button>
          </div>
        </div>

        {loading && <Loading text="Cargando proyectos…" />}

        {!loading && visibleProjects.length === 0 && (
          <p className="muted">
            {projects.length === 0
              ? 'Aún no hay proyectos. Crea el primero arriba.'
              : 'Ningún proyecto coincide con la búsqueda.'}
          </p>
        )}

        {!loading && visibleProjects.length > 0 && (
          <>
            <p className="muted small">
              Mostrando {visibleProjects.length} de {projects.length} proyectos.
            </p>
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  {showOwnerColumn && <th>Dueño</th>}
                  <th>Tipo</th>
                  <th>Creado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleProjects.map((p) => {
                  const currentType = projectMeta[p.id]?.type || 'generic'
                  return (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td>{p.name}</td>
                      <td>{p.description || '—'}</td>
                      {showOwnerColumn && <td>{ownerLabel(p)}</td>}
                      <td>
                        <select
                          value={currentType}
                          onChange={(e) => handleTypeChange(p.id, e.target.value)}
                          className="toolbar-input"
                        >
                          {types.map((t) => (
                            <option key={t.key} value={t.key}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>{p.created_at ? new Date(p.created_at).toLocaleString() : '—'}</td>
                      <td>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="btn btn-danger btn-sm"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        )}
      </section>
    </div>
  )
}
