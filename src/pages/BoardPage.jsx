import { useEffect, useMemo, useState } from 'react'
import * as taskApi from '../api/taskApi.js'
import * as projectApi from '../api/projectApi.js'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Loading from '../components/Loading.jsx'
import TaskDetailDrawer from '../components/TaskDetailDrawer.jsx'
import { getMetaMap, setMeta } from '../utils/taskMetaStore.js'
import { getProjectMetaMap } from '../utils/projectMetaStore.js'
import { getProjectType } from '../utils/projectTypes.js'

/**
 * Tablero Kanban dinámico.
 *
 * - Las columnas dependen del TIPO del proyecto seleccionado.
 *   Si el filtro es "todos los proyectos", se usa el tipo "genérico".
 * - Drag & drop nativo HTML5.
 * - Click en tarjeta → drawer de detalle a la derecha.
 */
export default function BoardPage() {
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [meta, setMetaState] = useState({})
  const [projectMeta, setProjectMetaState] = useState({})

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [filterProject, setFilterProject] = useState('all')
  const [draggingId, setDraggingId] = useState(null)
  const [dragOverCol, setDragOverCol] = useState(null)

  const [selectedTask, setSelectedTask] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [tasksData, projectsData] = await Promise.all([
          taskApi.listTasks(),
          projectApi.listProjects({ skip: 0, limit: 100 }),
        ])
        if (cancelled) return
        const safeTasks = tasksData || []
        const safeProjects = projectsData || []
        setTasks(safeTasks)
        setProjects(safeProjects)
        setMetaState(getMetaMap(safeTasks))
        setProjectMetaState(getProjectMetaMap(safeProjects))
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

  const projectName = (id) => {
    const p = projects.find((x) => x.id === id)
    return p ? p.name : `#${id}`
  }

  // Tipo del proyecto seleccionado (o genérico si "todos")
  const activeType = useMemo(() => {
    if (filterProject === 'all') return getProjectType('generic')
    const pid = Number(filterProject)
    return getProjectType(projectMeta[pid]?.type)
  }, [filterProject, projectMeta])

  const visibleTasks = useMemo(() => {
    if (filterProject === 'all') return tasks
    const pid = Number(filterProject)
    return tasks.filter((t) => t.project_id === pid)
  }, [tasks, filterProject])

  // Agrupación por status. Tareas con status no presente en el tipo
  // activo caen en la primera columna (la primera de activeType.statuses).
  const grouped = useMemo(() => {
    const out = {}
    for (const s of activeType.statuses) out[s.key] = []
    const fallbackKey = activeType.statuses[0]?.key

    for (const t of visibleTasks) {
      const status = meta[t.id]?.status || fallbackKey
      if (out[status] !== undefined) {
        out[status].push(t)
      } else if (fallbackKey) {
        out[fallbackKey].push(t)
      }
    }
    return out
  }, [visibleTasks, meta, activeType])

  // ---- Drag & drop ----
  const onDragStart = (taskId) => (e) => {
    setDraggingId(taskId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(taskId))
  }

  const onDragEnd = () => {
    setDraggingId(null)
    setDragOverCol(null)
  }

  const onDragOver = (status) => (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverCol !== status) setDragOverCol(status)
  }

  const onDragLeave = (status) => () => {
    if (dragOverCol === status) setDragOverCol(null)
  }

  const onDrop = (newStatus) => (e) => {
    e.preventDefault()
    const id = Number(e.dataTransfer.getData('text/plain')) || draggingId
    if (!id) return
    const current = meta[id]?.status
    if (current !== newStatus) {
      const updated = setMeta(id, { status: newStatus })
      setMetaState((prev) => ({ ...prev, [id]: updated }))
    }
    setDraggingId(null)
    setDragOverCol(null)
  }

  const refreshMeta = () => setMetaState(getMetaMap(tasks))

  if (loading) return <Loading text="Cargando tablero…" />
  if (error) return <ErrorMessage message={error} />

  const selectedProject = selectedTask
    ? projects.find((p) => p.id === selectedTask.project_id)
    : null
  const selectedProjectType = selectedProject
    ? projectMeta[selectedProject.id]?.type || 'generic'
    : 'generic'

  return (
    <div>
      <h1>Tablero</h1>
      <p className="muted small">
        Arrastra las tarjetas entre columnas para cambiar el estado.
        Las columnas dependen del tipo del proyecto seleccionado.
      </p>

      <section className="panel">
        <div className="panel-header">
          <h2>
            Filtrar — <span className="muted small">tipo: {activeType.label}</span>
          </h2>
          <div className="toolbar">
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="toolbar-input"
            >
              <option value="all">Todos los proyectos (vista genérica)</option>
              {projects.map((p) => {
                const t = getProjectType(projectMeta[p.id]?.type)
                return (
                  <option key={p.id} value={p.id}>
                    {p.name} · {t.label}
                  </option>
                )
              })}
            </select>
          </div>
        </div>
      </section>

      <div
        className="board"
        style={{ '--board-cols': activeType.statuses.length }}
      >
        {activeType.statuses.map((statusDef) => {
          const tasksInCol = grouped[statusDef.key] || []
          return (
            <div
              key={statusDef.key}
              className={`board-col ${dragOverCol === statusDef.key ? 'is-dragover' : ''}`}
              style={{
                '--col-bg': statusDef.color,
                '--col-text': statusDef.text,
                '--col-border': statusDef.border,
              }}
              onDragOver={onDragOver(statusDef.key)}
              onDragLeave={onDragLeave(statusDef.key)}
              onDrop={onDrop(statusDef.key)}
            >
              <header className="board-col-header">
                <span>{statusDef.label}</span>
                <span className="board-count">{tasksInCol.length}</span>
              </header>

              <div className="board-col-body">
                {tasksInCol.length === 0 && (
                  <p className="muted small board-empty">Sin tareas.</p>
                )}

                {tasksInCol.map((t) => {
                  const m = meta[t.id] || { assignee: '', tags: [] }
                  return (
                    <article
                      key={t.id}
                      className={`board-card ${draggingId === t.id ? 'is-dragging' : ''}`}
                      draggable
                      onDragStart={onDragStart(t.id)}
                      onDragEnd={onDragEnd}
                      onClick={() => setSelectedTask(t)}
                    >
                      <h3 className="board-card-title">{t.title}</h3>
                      {t.description && (
                        <p className="board-card-desc">{t.description}</p>
                      )}
                      {(m.tags || []).length > 0 && (
                        <div className="tag-chips tag-chips-readonly board-card-tags">
                          {m.tags.map((tag) => (
                            <span key={tag} className="tag-chip tag-chip-sm">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <footer className="board-card-footer">
                        <span className="board-card-project">
                          {projectName(t.project_id)}
                        </span>
                        {m.assignee && (
                          <span className="board-card-assignee" title="Responsable">
                            👤 {m.assignee}
                          </span>
                        )}
                      </footer>
                    </article>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        project={selectedProject}
        projectType={selectedProjectType}
        onClose={() => setSelectedTask(null)}
        onChange={refreshMeta}
      />
    </div>
  )
}
