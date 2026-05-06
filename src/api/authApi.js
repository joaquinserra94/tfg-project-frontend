import { request } from './client.js'

/**
 * POST /users/  -> registro de usuario.
 * Body esperado: { email, password }
 * Respuesta: { id, email, is_active, is_admin }
 */
export function register(email, password) {
  return request('/users/', {
    method: 'POST',
    body: { email, password },
  })
}

/**
 * POST /users/login -> autenticación.
 * El backend usa un schema JSON propio (UserLogin), NO OAuth2PasswordRequestForm.
 * Body esperado: { email, password }
 * Respuesta: { access_token, token_type }
 */
export function login(email, password) {
  return request('/users/login', {
    method: 'POST',
    body: { email, password },
  })
}

/**
 * GET /users/me -> devuelve el usuario autenticado actual.
 * Lo usamos tras el login para conocer si es admin.
 * Respuesta: { id, email, is_active, is_admin }
 */
export function getMe() {
  return request('/users/me', { method: 'GET', auth: true })
}
