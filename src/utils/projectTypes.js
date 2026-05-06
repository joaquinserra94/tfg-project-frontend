/**
 * Tipos de proyecto predefinidos.
 *
 * Cada tipo define un conjunto de columnas Kanban con su clave (status),
 * etiqueta visible y color. La clave del tipo se guarda en localStorage
 * por proyecto (clave 'tfg_project_type'). El backend solo conoce el
 * proyecto en sí; el "tipo" es metadato de cliente, igual que el resto
 * de capa de presentación.
 *
 * Las CLAVES de status son arbitrarias por tipo, pero deben ser únicas
 * dentro de un mismo tipo. El taskMetaStore guarda el status como string
 * sin asumir nada, así que un cambio de tipo implica que las tareas con
 * status "huérfano" (que no existe en el nuevo tipo) caen a la primera
 * columna del tipo nuevo cuando se renderiza el board.
 */

export const PROJECT_TYPES = {
  generic: {
    key: 'generic',
    label: 'Genérico',
    description: 'Tres estados básicos.',
    statuses: [
      { key: 'todo',  label: 'Pendiente',   color: '#fef3c7', text: '#92400e', border: '#fde68a' },
      { key: 'doing', label: 'En curso',    color: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
      { key: 'done',  label: 'Completada',  color: '#dcfce7', text: '#166534', border: '#bbf7d0' },
    ],
  },
  software: {
    key: 'software',
    label: 'Software',
    description: 'Flujo de desarrollo: Backlog → PR → Review → Done.',
    statuses: [
      { key: 'backlog',  label: 'Backlog',    color: '#f3f4f6', text: '#374151', border: '#e5e7eb' },
      { key: 'doing',    label: 'En curso',   color: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
      { key: 'pr',       label: 'PR abierta', color: '#ede9fe', text: '#5b21b6', border: '#ddd6fe' },
      { key: 'review',   label: 'Review',     color: '#fef3c7', text: '#92400e', border: '#fde68a' },
      { key: 'done',     label: 'Done',       color: '#dcfce7', text: '#166534', border: '#bbf7d0' },
    ],
  },
  marketing: {
    key: 'marketing',
    label: 'Marketing',
    description: 'Producción de contenido y campañas.',
    statuses: [
      { key: 'idea',       label: 'Idea',          color: '#fae8ff', text: '#86198f', border: '#f5d0fe' },
      { key: 'brief',      label: 'Brief',         color: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
      { key: 'production', label: 'En producción', color: '#fef3c7', text: '#92400e', border: '#fde68a' },
      { key: 'review',     label: 'Revisión',      color: '#fed7aa', text: '#9a3412', border: '#fdba74' },
      { key: 'published',  label: 'Publicado',     color: '#dcfce7', text: '#166534', border: '#bbf7d0' },
    ],
  },
}

export const DEFAULT_PROJECT_TYPE = 'generic'

/** Devuelve el tipo dado su key, con fallback al genérico. */
export function getProjectType(typeKey) {
  return PROJECT_TYPES[typeKey] || PROJECT_TYPES[DEFAULT_PROJECT_TYPE]
}

/** Lista de todos los tipos para selectores. */
export function listProjectTypes() {
  return Object.values(PROJECT_TYPES)
}

/** Etiqueta legible para una clave de status dentro de un tipo. */
export function statusLabel(typeKey, statusKey) {
  const type = getProjectType(typeKey)
  const found = type.statuses.find((s) => s.key === statusKey)
  if (found) return found.label
  // Status huérfano: lo mostramos tal cual con un asterisco
  return statusKey ? `${statusKey} (*)` : 'Sin estado'
}
