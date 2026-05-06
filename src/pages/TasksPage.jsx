import { useEffect, useMemo, useState } from 'react'
import * as taskApi from '../api/taskApi.js'
import * as projectApi from '../api/projectApi.js'
import { useAuth } from '../context/AuthContext.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Loading from '../components/Loading.jsx'
import ImportCsv from '../components/ImportCsv.jsx'
import TaskDetailDrawer from '../components/TaskDetailDrawer.jsx'
import { exportToCSV } from '../utils/csv.js'
import {
  getMetaMap,
  setMeta,
  removeMeta,
} from '../utils/taskMetaStore.js'
import { getProjectMetaMap } from '../utils/projectMetaStore.js'
import { getProjectType, statusLabel } from '../utils/projectTypes.js'

/**
 * Página de tareas.
 *
 * Backend: {id, title, description, project_id}.
 * Local (capa de presentación):
 *   - Estado por tarea (definido por el TIPO del proyecto al que pertenece)
 *   - Responsable (texto libre)
 *   - Tags
 *
 * Click en fila → abre drawer lateral con detalle.
 */
export default function TasksPage() {
  const { currentUser } = useAuth()
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [meta, setMetaState] = useState({})
  const [projectMeta, setProjectMetaState] = useState({})

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState('')

  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [search, setSearch] = useState('')
  const [filterProject, setFilterProject] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterAssignedToMe, setFilterAssignedToMe] = useState(false)
  const [sortBy, setSortBy] = useState('id_desc')

  const [selectedTask, setSelectedTask] = useState(null)

  const loadAll = async () => {
    setLoading(true)
    setError('')
    try {
      const [tasksData, projectsData] = await Promise.all([
        taskApi.listTasks(),
        projectApi.listProjects({ skip: 0, limit: 100 }),
      ])
      const safeTasks = tasksData || []
      const safeProjects = projectsData || []
      setTasks(safeTasks)
      setProjects(safeProjects)
      setMetaState(getMetaMap(safeTasks))
      setProjectMetaState(getProjectMetaMap(safeProjects))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!title.trim()) {
      setError('El título es obligatorio.')
      return
    }
    if (!projectId) {
      setError('Selecciona un proyecto.')
      return
    }

    setCreating(true)
    try {
      await taskApi.createTask({
        title: title.trim(),
        description: description.trim(),
        project_id: projectId,
      })
      setTitle('')
      setDescription('')
      setSuccess('Tarea creada correctamente.')
      await loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta tarea?')) return
    setError('')
    try {
      await taskApi.deleteTask(id)
      removeMeta(id)
      if (selectedTask?.id === id) setSelectedTask(null)
      setSuccess('Tarea eliminada.')
      await loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleStatusChange = (taskId, newStatus) => {
    const updated = setMeta(taskId, { status: newStatus })
    setMetaState((prev) => ({ ...prev, [taskId]: updated }))
  }

  const handleAssigneeChange = (taskId, value) => {
    const updated = setMeta(taskId, { assignee: value })
    setMetaState((prev) => ({ ...prev, [taskId]: updated }))
  }

  // Refresca el state local de meta tras cambios desde el drawer
  const refreshMetaForSelected = () => {
    if (!selectedTask) return
    setMetaState(getMetaMap(tasks))
  }

  const projectName = (id) => {
    const p = projects.find((x) => x.id === id)
    return p ? p.name : `#${id}`
  }

  const projectTypeKey = (taskProjectId) =>
    projectMeta[taskProjectId]?.type || 'generic'

  // Lista derivada
  const visibleTasks = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = tasks

    if (q) {
      list = list.filter((t) => {
        const tags = (meta[t.id]?.tags || []).join(' ')
        const haystack = `${t.title} ${t.description || ''} ${tags}`.toLowerCase()
        return haystack.includes(q)
      })
    }

    if (filterProject !== 'all') {
      const pid = Number(filterProject)
      list = list.filter((t) => t.project_id === pid)
    }

    if (filterStatus !== 'all') {
      list = list.filter((t) => (meta[t.id]?.status || 'todo') === filterStatus)
    }

    // Filtro "asignadas a mí": compara assignee con email del usuario actual,
    // case-insensitive y trim. Si no hay email (sesión aún cargando) se ignora.
    if (filterAssignedToMe && currentUser?.email) {
      const me = currentUser.email.trim().toLowerCase()
      list = list.filter((t) => {
        const assignee = (meta[t.id]?.assignee || '').trim().toLowerCase()
        return assignee === me
      })
    }

    const sorted = [...list]
    switch (sortBy) {
      case 'id_asc':
        sorted.sort((a, b) => a.id - b.id)
        break
      case 'title_asc':
        sorted.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'title_desc':
        sorted.sort((a, b) => b.title.localeCompare(a.title))
        break
      case 'id_desc':
      default:
        sorted.sort((a, b) => b.id - a.id)
        break
    }
    return sorted
  }, [tasks, meta, search, filterProject, filterStatus, filterAssignedToMe, currentUser, sortBy])

  const handleExport = () => {
    if (visibleTasks.length === 0) {
      setError('No hay datos para exportar.')
      return
    }
    exportToCSV(
      visibleTasks.map((t) => {
        const m = meta[t.id] || { status: 'todo', assignee: '', tags: [] }
        return {
          id: t.id,
          title: t.title,
          description: t.description || '',
          project: projectName(t.project_id),
          status: statusLabel(projectTypeKey(t.project_id), m.status),
          assignee: m.assignee || '',
          tags: (m.tags || []).join(' | '),
        }
      }),
      [
        { key: 'id', label: 'ID' },
        { key: 'title', label: 'Título' },
        { key: 'description', label: 'Descripción' },
        { key: 'project', label: 'Proyecto' },
        { key: 'status', label: 'Estado (local)' },
        { key: 'assignee', label: 'Responsable (local)' },
        { key: 'tags', label: 'Etiquetas (local)' },
      ],
      `tareas-${new Date().toISOString().slice(0, 10)}`,
    )
  }

  // Para el filtro global de estado, mostramos la unión de status de todos los tipos en uso
  const availableStatusesForFilter = useMemo(() => {
    const seen = new Map()
    for (const p of projects) {
      const t = getProjectType(projectMeta[p.id]?.type)
      for (const s of t.statuses) {
        if (!seen.has(s.key)) seen.set(s.key, s.label)
      }
    }
    return Array.from(seen.entries()).map(([key, label]) => ({ key, label }))
  }, [projects, projectMeta])

  const selectedProject = selectedTask
    ? projects.find((p) => p.id === selectedTask.project_id)
    : null

  return (
    <div>
      <h1>Tareas</h1>

      <p className="muted small">
        Estado, responsable y etiquetas son metadatos locales del cliente
        (capa de presentación, almacenados en este navegador).
      </p>

      <section className="panel">
        <h2>Nueva tarea</h2>

        {projects.length === 0 ? (
          <p className="muted">
            No hay proyectos disponibles. Crea uno desde la sección{' '}
            <strong>Proyectos</strong> para poder añadir tareas.
          </p>
        ) : (
          <form onSubmit={handleCreate} className="form form-inline">
            <label>
              Título
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </label>

            <label>
              Descripción
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            <label>
              Proyecto
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
              >
                <option value="">— Selecciona —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Creando…' : 'Crear'}
            </button>
          </form>
        )}

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
            Sube un CSV con columnas <code>title</code>, <code>description</code> (opcional)
            y <strong>una de estas dos</strong>: <code>project_id</code> o{' '}
            <code>project_name</code>. Si pones ambas, prevalece <code>project_id</code>.
          </p>
          <ImportCsv
            config={{
              entityName: 'tareas',
              templateName: 'plantilla-tareas',
              templateColumns: [
                { key: 'title', label: 'title', example: 'Tarea de ejemplo' },
                { key: 'description', label: 'description', example: 'Descripción opcional' },
                { key: 'project_id', label: 'project_id', example: '' },
                {
                  key: 'project_name',
                  label: 'project_name',
                  example: projects[0]?.name || 'Nombre del proyecto',
                },
              ],
              requiredHeaders: ['title'],
              requiredEither: ['project_id', 'project_name'],
              buildPayload: (row) => {
                const tt = (row.title || '').trim()
                if (!tt) return { error: 'El campo "title" es obligatorio.' }

                let pid = null
                const rawId = (row.project_id || '').trim()
                if (rawId) {
                  const n = Number(rawId)
                  if (!Number.isInteger(n) || n <= 0)
                    return { error: `"project_id" inválido: ${rawId}` }
                  if (!projects.some((p) => p.id === n))
                    return { error: `No existe ningún proyecto con id=${n}.` }
                  pid = n
                } else {
                  const rawName = (row.project_name || '').trim().toLowerCase()
                  if (!rawName)
                    return { error: 'Hay que indicar "project_id" o "project_name".' }
                  const found = projects.find((p) => p.name.toLowerCase() === rawName)
                  if (!found)
                    return {
                      error: `No se encontró un proyecto con nombre "${row.project_name}".`,
                    }
                  pid = found.id
                }

                const desc = (row.description || '').trim()
                return { title: tt, description: desc || null, project_id: pid }
              },
              submit: (payload) => taskApi.createTask(payload),
            }}
            onDone={loadAll}
          />
        </details>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Listado</h2>
          <div className="toolbar">
            <input
              type="search"
              placeholder="Buscar por título, descripción o tag…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="toolbar-input"
            />
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="toolbar-input"
            >
              <option value="all">Todos los proyectos</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setFilterAssignedToMe((v) => !v)}
              className={`btn btn-sm ${filterAssignedToMe ? 'btn-primary' : 'btn-secondary'}`}
              title={
                currentUser?.email
                  ? `Mostrar solo tareas asignadas a ${currentUser.email}`
                  : 'Necesitas estar autenticado'
              }
              disabled={!currentUser?.email}
            >
              {filterAssignedToMe ? '★ Mis asignadas' : '☆ Mis asignadas'}
            </button>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="toolbar-input"
            >
              <option value="all">Todos los estados</option>
              {availableStatusesForFilter.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="toolbar-input"
            >
              <option value="id_desc">ID descendente</option>
              <option value="id_asc">ID ascendente</option>
              <option value="title_asc">Título A→Z</option>
              <option value="title_desc">Título Z→A</option>
            </select>
            <button
              onClick={handleExport}
              className="btn btn-secondary btn-sm"
              disabled={visibleTasks.length === 0}
            >
              Exportar CSV
            </button>
          </div>
        </div>

        {loading && <Loading text="Cargando tareas…" />}

        {!loading && visibleTasks.length === 0 && (
          <p className="muted">
            {tasks.length === 0
              ? 'Aún no hay tareas registradas.'
              : 'Ninguna tarea coincide con los filtros.'}
          </p>
        )}

        {!loading && visibleTasks.length > 0 && (
          <>
            <p className="muted small">
              Mostrando {visibleTasks.length} de {tasks.length} tareas.
              Haz click en una fila para ver el detalle.
            </p>
            <table className="table table-clickable">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Título</th>
                  <th>Proyecto</th>
                  <th>Estado</th>
                  <th>Responsable</th>
                  <th>Tags</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleTasks.map((t) => {
                  const m = meta[t.id] || { status: 'todo', assignee: '', tags: [] }
                  const typeKey = projectTypeKey(t.project_id)
                  const validStatuses = getProjectType(typeKey).statuses
                  const isMine =
                    !!currentUser?.email &&
                    m.assignee.trim().toLowerCase() ===
                      currentUser.email.trim().toLowerCase()
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTask(t)}
                      className={`${selectedTask?.id === t.id ? 'is-selected' : ''} ${isMine ? 'is-mine' : ''}`}
                    >
                      <td>{t.id}</td>
                      <td>{t.title}</td>
                      <td>{projectName(t.project_id)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <select
                          value={m.status}
                          onChange={(e) => handleStatusChange(t.id, e.target.value)}
                          className={`status-select status-${m.status}`}
                        >
                          {validStatuses.map((s) => (
                            <option key={s.key} value={s.key}>
                              {s.label}
                            </option>
                          ))}
                          {!validStatuses.some((s) => s.key === m.status) && m.status && (
                            <option value={m.status}>{m.status} (otro)</option>
                          )}
                        </select>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={m.assignee}
                          onChange={(e) => handleAssigneeChange(t.id, e.target.value)}
                          placeholder="email / nombre"
                          className="inline-input"
                        />
                      </td>
                      <td>
                        {(m.tags || []).length === 0 ? (
                          <span className="muted small">—</span>
                        ) : (
                          <div className="tag-chips tag-chips-readonly">
                            {m.tags.map((tag) => (
                              <span key={tag} className="tag-chip tag-chip-sm">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDelete(t.id)}
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

      {/* Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        project={selectedProject}
        projectType={
          selectedTask ? projectTypeKey(selectedTask.project_id) : 'generic'
        }
        onClose={() => setSelectedTask(null)}
        onChange={refreshMetaForSelected}
        onDelete={(t) => handleDelete(t.id)}
      />
    </div>
  )
}
