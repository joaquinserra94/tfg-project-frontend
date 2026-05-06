import { request } from './client.js'

/**
 * Endpoints de proyectos según el backend del TFG.
 *
 *  GET    /projects/         -> lista paginada (skip, limit). Pública.
 *  POST   /projects/         -> crea un proyecto. Requiere token.
 *  GET    /projects/{id}     -> detalle. Pública.
 *  PUT    /projects/{id}     -> actualiza. Requiere token.
 *  DELETE /projects/{id}     -> elimina. Requiere token.
 */

export function listProjects({ skip = 0, limit = 50 } = {}) {
  return request(`/projects/?skip=${skip}&limit=${limit}`, {
    method: 'GET',
    auth: true, // Aunque el GET no exige token, lo enviamos por consistencia.
  })
}

export function createProject({ name, description }) {
  return request('/projects/', {
    method: 'POST',
    body: { name, description: description || null },
    auth: true,
  })
}

export function deleteProject(id) {
  return request(`/projects/${id}`, {
    method: 'DELETE',
    auth: true,
  })
}
