import { readJSON, writeJSON } from './storage.js'
import { DEFAULT_PROJECT_TYPE } from './projectTypes.js'

/**
 * projectMetaStore
 * ---------------------------------------------------------------
 * Guarda metadatos de proyecto que no existen en el backend:
 *   - type: clave del tipo de proyecto (generic | software | marketing)
 *
 * Estructura en localStorage (clave 'tfg_project_meta'):
 *   { "<project_id>": { "type": "software" } }
 */

const STORAGE_KEY = 'tfg_project_meta'

function readAll() {
  return readJSON(STORAGE_KEY, {})
}
function writeAll(data) {
  return writeJSON(STORAGE_KEY, data)
}

export function getProjectMeta(projectId) {
  const all = readAll()
  return { type: DEFAULT_PROJECT_TYPE, ...(all[projectId] || {}) }
}

export function setProjectMeta(projectId, partial) {
  const all = readAll()
  all[projectId] = {
    type: DEFAULT_PROJECT_TYPE,
    ...(all[projectId] || {}),
    ...partial,
  }
  writeAll(all)
  return all[projectId]
}

export function removeProjectMeta(projectId) {
  const all = readAll()
  if (all[projectId]) {
    delete all[projectId]
    writeAll(all)
  }
}

export function getProjectMetaMap(projects) {
  const all = readAll()
  const map = {}
  for (const p of projects) {
    map[p.id] = { type: DEFAULT_PROJECT_TYPE, ...(all[p.id] || {}) }
  }
  return map
}
