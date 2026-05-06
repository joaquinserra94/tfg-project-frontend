import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import * as authApi from '../api/authApi.js'
import ErrorMessage from '../components/ErrorMessage.jsx'

export default function RegisterPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email || !password) {
      setError('Email y contraseña son obligatorios.')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      await authApi.register(email, password)
      setSuccess('Usuario creado correctamente. Redirigiendo al login…')
      setTimeout(() => navigate('/login'), 1200)
    } catch (err) {
      setError(err.message || 'No se pudo registrar el usuario.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card">
      <h1>Crear cuenta</h1>
      <p className="muted">Regístrate para acceder al panel de la API.</p>

      <form onSubmit={handleSubmit} className="form">
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>

        <label>
          Repite la contraseña
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>

        <ErrorMessage message={error} />
        {success && <div className="alert alert-success">{success}</div>}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creando…' : 'Crear cuenta'}
        </button>
      </form>

      <p className="muted small">
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </div>
  )
}
