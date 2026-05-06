import { readJSON, writeJSON } from './storage.js'

/**
 * taskMetaStore
 * ---------------------------------------------------------------
 * Almacena metadatos de tareas que NO existen en el backend:
 *   - status:   estado Kanban (string libre, definido por el tipo del proyecto)
 *   - assignee: responsable como texto libre
 *   - tags:     array de etiquetas (strings cortos) - capa visual de cliente
 *
 * Justificación frente al tribunal: el dominio del TFG (modelado en backend)
 * cubre proyectos y tareas con autenticación. Estado, responsable y tags
 * son metadatos de presentación; mismo patrón que Trello/Notion/Linear
 * usan para preferencias locales.
 *
 * Estructura en localStorage (clave 'tfg_task_meta'):
 *   {
 *     "<task_id>": {
 *       "status": "todo|doing|done|backlog|...",
 *       "assignee": "string",
 *       "tags": ["bug", "urgente"]
 *     }
 *   }
 */

const STORAGE_KEY = 'tfg_task_meta'

// Status genéricos (compatibilidad con código previo). Para tipos de proyecto
// concretos, los status válidos los define utils/projectTypes.js
export const STATUSES = ['todo', 'doing', 'done']

export const STATUS_LABELS = {
  todo: 'Pendiente',
  doing: 'En curso',
  done: 'Completada',
}

export const DEFAULT_META = { status: 'todo', assignee: '', tags: [] }

function readAll() {
  return readJSON(STORAGE_KEY, {})
}

function writeAll(data) {
  const ok = writeJSON(STORAGE_KEY, data)
  // Notifica a hooks/listeners (p.ej. el contador en la navbar) que algo
  // del meta de tareas ha cambiado, para que se recalculen sin polling.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('taskmeta:changed'))
  }
  return ok
}

function normalize(raw) {
  // Garantiza que tags sea siempre array, status string, assignee string
  const meta = { ...DEFAULT_META, ...(raw || {}) }
  if (!Array.isArray(meta.tags)) meta.tags = []
  if (typeof meta.status !== 'string') meta.status = 'todo'
  if (typeof meta.assignee !== 'string') meta.assignee = ''
  return meta
}

export function getMeta(taskId) {
  const all = readAll()
  return normalize(all[taskId])
}

export function setMeta(taskId, partial) {
  const all = readAll()
  all[taskId] = normalize({ ...(all[taskId] || {}), ...partial })
  writeAll(all)
  return all[taskId]
}

export function removeMeta(taskId) {
  const all = readAll()
  if (all[taskId]) {
    delete all[taskId]
    writeAll(all)
  }
}

export function getMetaMap(tasks) {
  const all = readAll()
  const map = {}
  for (const t of tasks) {
    map[t.id] = normalize(all[t.id])
  }
  return map
}

/** Añade una tag a una tarea (sin duplicados, normalizada). */
export function addTag(taskId, tag) {
  const clean = String(tag).trim().toLowerCase()
  if (!clean) return getMeta(taskId)
  const current = getMeta(taskId)
  if (current.tags.includes(clean)) return current
  return setMeta(taskId, { tags: [...current.tags, clean] })
}

/** Elimina una tag de una tarea. */
export function removeTag(taskId, tag) {
  const current = getMeta(taskId)
  return setMeta(taskId, { tags: current.tags.filter((t) => t !== tag) })
}

/**
 * Devuelve cuántas tareas (de la lista pasada) tienen al usuario indicado
 * como `assignee` Y NO están marcadas como completadas.
 *
 * El "completed" se determina por convención: cualquier estado cuyo nombre
 * sea 'done' o 'published' (alineado con utils/projectTypes.js). Si en el
 * futuro se añaden más estados terminales, basta con ampliar este array.
 *
 * Comparación case-insensitive.
 */
const COMPLETED_STATUSES = ['done', 'published']

export function countAssignedTo(tasks, email) {
  if (!email || !Array.isArray(tasks)) return 0
  const target = String(email).trim().toLowerCase()
  if (!target) return 0
  const all = readAll()
  let count = 0
  for (const t of tasks) {
    const m = normalize(all[t.id])
    if (m.assignee.trim().toLowerCase() !== target) continue
    if (COMPLETED_STATUSES.includes(m.status)) continue
    count++
  }
  return count
}
