import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { readJSON, writeJSON } from '../utils/storage.js'

/**
 * ThemeContext
 * --------------------------------------------------------------
 * Gestiona el tema (light | dark).
 *  - Persiste en localStorage ('tfg_theme').
 *  - Si no hay preferencia, respeta prefers-color-scheme del sistema.
 *  - Aplica el tema añadiendo data-theme="dark" al <html> para que
 *    el CSS lo use mediante variables y selector de atributo.
 */

const STORAGE_KEY = 'tfg_theme'
const ThemeContext = createContext(null)

function detectSystemTheme() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
  return 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const stored = readJSON(STORAGE_KEY, null)
    return stored === 'light' || stored === 'dark' ? stored : detectSystemTheme()
  })

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme)
    }
    writeJSON(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>')
  return ctx
}
