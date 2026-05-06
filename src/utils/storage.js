/**
 * Utilidad genérica para leer/escribir en localStorage con manejo de errores.
 * Centraliza el acceso para que el resto del código no tenga que preocuparse
 * de JSON.parse fallido o de quotas excedidas.
 */

export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    // Quota excedida o modo privado: no rompemos la app.
    return false
  }
}

export function removeKey(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* noop */
  }
}
