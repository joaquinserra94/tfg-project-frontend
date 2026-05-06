import { request } from './client.js'

/**
 * Endpoints de gestión de usuarios.
 * Todos requieren rol de administrador en el backend (lanzan 403 si no).
 *
 *  GET   /users/                  -> lista todos los usuarios
 *  PATCH /users/{id}/admin        -> otorga / revoca rol admin
 */

export function listUsers() {
  return request('/users/', { method: 'GET', auth: true })
}

/**
 * El backend espera `is_admin` como query string, no en el body:
 *   PATCH /users/{user_id}/admin?is_admin=true
 */
export function setUserAdmin(userId, isAdmin) {
  const flag = isAdmin ? 'true' : 'false'
  return request(`/users/${userId}/admin?is_admin=${flag}`, {
    method: 'PATCH',
    auth: true,
  })
}
