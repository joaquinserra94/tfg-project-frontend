import { request } from './client.js'

/**
 * GET /openapi.json
 * FastAPI lo expone automáticamente. Devuelve el esquema completo de la API
 * (info, paths, schemas...). Lo usamos en la página "Acerca de la API".
 *
 * No requiere token.
 */
export function getOpenApi() {
  return request('/openapi.json', { method: 'GET' })
}
