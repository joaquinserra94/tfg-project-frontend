/**
 * Cliente HTTP centralizado.
 * - Lee la URL base desde la variable de entorno VITE_API_URL.
 * - Añade automáticamente el header Authorization si hay token.
 * - Normaliza los errores para que las páginas reciban siempre un mensaje legible.
 * - Si el backend devuelve 401, limpia el token y emite un evento global para
 *   que el AuthContext cierre la sesión.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const TOKEN_KEY = 'tfg_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * Convierte el cuerpo de error de FastAPI en un string legible.
 * FastAPI devuelve { "detail": "..." } o { "detail": [{loc, msg, ...}] } (422).
 */
function formatError(status, body) {
  if (!body) return `Error ${status}`

  if (typeof body.detail === 'string') {
    return body.detail
  }

  if (Array.isArray(body.detail)) {
    // Errores de validación 422
    return body.detail
      .map((e) => {
        const field = Array.isArray(e.loc) ? e.loc.slice(1).join('.') : ''
        return field ? `${field}: ${e.msg}` : e.msg
      })
      .join(' | ')
  }

  return `Error ${status}`
}

/**
 * Función genérica para llamadas HTTP.
 * @param {string} path  Ruta relativa, ej. "/projects/"
 * @param {object} opts  { method, body, auth }
 */
export async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' }

  if (auth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    // Errores de red: API caída, CORS bloqueado, sin conexión...
    throw new Error(
      'No se pudo conectar con la API. Comprueba que el backend esté en marcha y que la URL sea correcta.',
    )
  }

  // Intentamos parsear JSON; algunos endpoints (DELETE) pueden devolver objetos pequeños.
  let data = null
  const text = await response.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      // Token inválido o expirado: limpiamos y notificamos al AuthContext.
      clearToken()
      window.dispatchEvent(new Event('auth:logout'))
    }
    throw new Error(formatError(response.status, data))
  }

  return data
}
