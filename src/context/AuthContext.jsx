import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getToken, setToken, clearToken } from '../api/client.js'
import * as authApi from '../api/authApi.js'

const AuthContext = createContext(null)

/**
 * Provider de autenticación.
 *
 * Mantiene en estado el token y el usuario actual (con su rol is_admin).
 * Tras un login exitoso, llama a /users/me para conocer el rol.
 * Al cargar la app con un token persistido, también recupera el usuario.
 *
 * Escucha el evento global "auth:logout" que emite el cliente HTTP cuando
 * recibe un 401: limpia token y usuario.
 */
export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken())
  const [currentUser, setCurrentUser] = useState(null)
  const [loadingUser, setLoadingUser] = useState(false)

  // Recupera el usuario al inicio si ya hay token persistido
  useEffect(() => {
    if (!token) {
      setCurrentUser(null)
      return
    }
    let cancelled = false
    setLoadingUser(true)
    authApi
      .getMe()
      .then((u) => {
        if (!cancelled) setCurrentUser(u)
      })
      .catch(() => {
        // Si /me falla (token inválido), el cliente HTTP ya disparará auth:logout
        if (!cancelled) setCurrentUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingUser(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  // Escucha logout forzado desde el cliente HTTP (token inválido / expirado)
  useEffect(() => {
    const handleForcedLogout = () => {
      setTokenState(null)
      setCurrentUser(null)
    }
    window.addEventListener('auth:logout', handleForcedLogout)
    return () => window.removeEventListener('auth:logout', handleForcedLogout)
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password)
    if (!data?.access_token) {
      throw new Error('Respuesta de login inválida: falta access_token.')
    }
    setToken(data.access_token)
    setTokenState(data.access_token)
    // currentUser se actualizará en el useEffect de arriba
    return data
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setTokenState(null)
    setCurrentUser(null)
  }, [])

  const value = {
    token,
    currentUser,
    loadingUser,
    isAuthenticated: Boolean(token),
    isAdmin: Boolean(currentUser?.is_admin),
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
