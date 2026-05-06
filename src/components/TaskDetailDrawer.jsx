import { useEffect, useState } from 'react'
import { addTag, removeTag, setMeta, getMeta } from '../utils/taskMetaStore.js'
import { getProjectType } from '../utils/projectTypes.js'

/**
 * Drawer lateral de detalle de tarea.
 *
 * Muestra:
 *  - Datos de la API: id, title, description, project_id
 *  - Metadatos locales (capa de presentación):
 *      · status (con select de los disponibles según el tipo de proyecto)
 *      · assignee (texto libre)
 *      · tags (añadir/eliminar)
 *
 * NO muestra creador, fecha de creación, comentarios ni subtareas porque
 * el backend no expone esos datos (el alcance del TFG no los modela).
 *
 * Props:
 *   task        - objeto tarea de la API o null
 *   project     - proyecto al que pertenece (para el nombre y el tipo)
 *   projectType - clave del tipo (generic|software|marketing) → define los status válidos
 *   onClose     - callback al cerrar
 *   onChange    - callback tras modificar metadatos (para refrescar el padre)
 *   onDelete    - callback opcional para borrar la tarea desde el drawer
 */
export default function TaskDetailDrawer({
  task,
  project,
  projectType,
  onClose,
  onChange,
  onDelete,
}) {
  const [meta, setMetaState] = useState({ status: 'todo', assignee: '', tags: [] })
  const [tagInput, setTagInput] = useState('')

  // Cuando cambia la tarea seleccionada, recargamos su meta
  useEffect(() => {
    if (task) {
      setMetaState(getMeta(task.id))
      setTagInput('')
    }
  }, [task])

  // ESC para cerrar
  useEffect(() => {
    if (!task) return
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [task, onClose])

  if (!task) return null

  const type = getProjectType(projectType)
  const validStatuses = type.statuses

  const update = (partial) => {
    const updated = setMeta(task.id, partial)
    setMetaState(updated)
    onChange?.()
  }

  const handleAddTag = (e) => {
    e.preventDefault()
    const clean = tagInput.trim()
    if (!clean) return
    const updated = addTag(task.id, clean)
    setMetaState(updated)
    setTagInput('')
    onChange?.()
  }

  const handleRemoveTag = (tag) => {
    const updated = removeTag(task.id, tag)
    setMetaState(updated)
    onChange?.()
  }

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} aria-hidden="true" />
      <aside className="drawer" role="dialog" aria-label="Detalle de tarea">
        <header className="drawer-header">
          <div>
            <p className="drawer-eyebrow">Tarea #{task.id}</p>
            <h2 className="drawer-title">{task.title}</h2>
          </div>
          <button
            type="button"
            className="drawer-close"
            onClick={onClose}
            aria-label="Cerrar detalle"
          >
            ×
          </button>
        </header>

        <div className="drawer-body">
          {/* ----- Datos de la API (fuente: backend) ----- */}
          <section className="drawer-section">
            <h3>Información</h3>
            <dl className="drawer-dl">
              <dt>Descripción</dt>
              <dd>{task.description || <span className="muted">Sin descripción</span>}</dd>

              <dt>Proyecto</dt>
              <dd>
                {project ? (
                  <>
                    {project.name} <span className="muted">(#{project.id})</span>
                  </>
                ) : (
                  <span className="muted">#{task.project_id}</span>
                )}
              </dd>

              <dt>Tipo de proyecto</dt>
              <dd>
                <span className="muted">{type.label}</span>
              </dd>
            </dl>
          </section>

          {/* ----- Metadatos locales ----- */}
          <section className="drawer-section">
            <h3>
              Estado y responsable
              <span className="drawer-local-badge" title="Datos almacenados localmente en este navegador">
                local
              </span>
            </h3>

            <label className="drawer-field">
              <span>Estado</span>
              <select
                value={meta.status}
                onChange={(e) => update({ status: e.target.value })}
                className={`status-select status-${meta.status}`}
              >
                {validStatuses.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
                {/* Si el status actual no está en el tipo, lo mostramos para no perderlo */}
                {!validStatuses.some((s) => s.key === meta.status) && meta.status && (
                  <option value={meta.status}>{meta.status} (otro)</option>
                )}
              </select>
            </label>

            <label className="drawer-field">
              <span>Responsable</span>
              <input
                type="text"
                value={meta.assignee}
                onChange={(e) => update({ assignee: e.target.value })}
                placeholder="email / nombre"
              />
            </label>
          </section>

          {/* ----- Tags ----- */}
          <section className="drawer-section">
            <h3>
              Etiquetas
              <span className="drawer-local-badge" title="Datos almacenados localmente en este navegador">
                local
              </span>
            </h3>

            <div className="tag-chips">
              {meta.tags.length === 0 && (
                <span className="muted small">Sin etiquetas.</span>
              )}
              {meta.tags.map((tag) => (
                <span key={tag} className="tag-chip">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    aria-label={`Eliminar etiqueta ${tag}`}
                    className="tag-chip-remove"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <form onSubmit={handleAddTag} className="drawer-tag-form">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Añadir etiqueta…"
                maxLength={30}
              />
              <button type="submit" className="btn btn-secondary btn-sm">
                Añadir
              </button>
            </form>
          </section>

          {/* ----- Datos no expuestos ----- */}
          <section className="drawer-section drawer-section-disabled">
            <h3>No disponible en el backend del TFG</h3>
            <ul className="drawer-disabled-list">
              <li>Creador y fecha de creación</li>
              <li>Comentarios</li>
              <li>Subtareas</li>
            </ul>
            <p className="muted small">
              Quedan identificadas como líneas de trabajo futuras. El alcance
              actual del backend modela solo proyectos y tareas.
            </p>
          </section>
        </div>

        {onDelete && (
          <footer className="drawer-footer">
            <button
              type="button"
              onClick={() => onDelete(task)}
              className="btn btn-danger btn-sm"
            >
              Eliminar tarea
            </button>
          </footer>
        )}
      </aside>
    </>
  )
}
