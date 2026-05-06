import { request } from './client.js'

/**
 * Endpoints de tareas según el backend del TFG.
 *
 *  GET    /tasks/         -> lista. Requiere token.
 *  POST   /tasks/         -> crea. Requiere token.
 *  GET    /tasks/{id}     -> detalle. Requiere token.
 *  DELETE /tasks/{id}     -> elimina. Requiere token.
 *
 * NOTA: el backend NO expone PUT para tareas, así que no incluimos update.
 *
 * Tras mutaciones (POST / DELETE) emitimos un evento global 'tasks:changed'
 * para que cualquier componente interesado (p.ej. el contador en la navbar)
 * se actualice sin necesidad de prop drilling.
 */

function emitTasksChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('tasks:changed'))
  }
}

export function listTasks() {
  return request('/tasks/', { method: 'GET', auth: true })
}

export async function createTask({ title, description, project_id }) {
  const result = await request('/tasks/', {
    method: 'POST',
    body: {
      title,
      description: description || null,
      project_id: Number(project_id),
    },
    auth: true,
  })
  emitTasksChanged()
  return result
}

export async function deleteTask(id) {
  const result = await request(`/tasks/${id}`, { method: 'DELETE', auth: true })
  emitTasksChanged()
  return result
}
