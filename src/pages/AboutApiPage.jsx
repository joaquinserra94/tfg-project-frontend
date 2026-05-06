import { useEffect, useMemo, useState } from 'react'
import * as metaApi from '../api/metaApi.js'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Loading from '../components/Loading.jsx'

/**
 * "Acerca de la API": consume /openapi.json (FastAPI lo expone solo)
 * y muestra:
 *  - Info de la API (título, versión, descripción)
 *  - KPIs (nº de endpoints, nº de schemas, nº de tags)
 *  - Tabla de endpoints agrupados por tag, con método y resumen
 *  - Lista de schemas Pydantic
 *  - Toggle para ver el JSON crudo
 *
 * No añade endpoints nuevos: todo viene del esquema OpenAPI estándar.
 */
export default function AboutApiPage() {
  const [spec, setSpec] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showRaw, setShowRaw] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await metaApi.getOpenApi()
        if (!cancelled) setSpec(data)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Aplanamos paths -> [{method, path, summary, tags}, ...]
  const endpoints = useMemo(() => {
    if (!spec?.paths) return []
    const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete']
    const list = []
    for (const path of Object.keys(spec.paths)) {
      const item = spec.paths[path]
      for (const method of HTTP_METHODS) {
        if (item[method]) {
          list.push({
            method: method.toUpperCase(),
            path,
            summary: item[method].summary || '',
            tags: item[method].tags || ['(sin tag)'],
          })
        }
      }
    }
    return list
  }, [spec])

  // Agrupamos por tag para mostrar tabla bonita
  const groupedByTag = useMemo(() => {
    const groups = {}
    for (const ep of endpoints) {
      for (const tag of ep.tags) {
        if (!groups[tag]) groups[tag] = []
        groups[tag].push(ep)
      }
    }
    return groups
  }, [endpoints])

  const schemas = useMemo(() => {
    return spec?.components?.schemas
      ? Object.keys(spec.components.schemas).sort()
      : []
  }, [spec])

  if (loading) return <Loading text="Cargando esquema OpenAPI…" />
  if (error) return <ErrorMessage message={error} />
  if (!spec) return null

  return (
    <div>
      <h1>Acerca de la API</h1>
      <p className="muted">
        Información obtenida en tiempo real desde <code>/openapi.json</code>,
        el esquema que FastAPI genera automáticamente.
      </p>

      {/* ----- Info general ----- */}
      <section className="panel">
        <h2>{spec.info?.title || 'API'}</h2>
        <p className="muted small">
          Versión <strong>{spec.info?.version || '—'}</strong> · OpenAPI{' '}
          <strong>{spec.openapi || '—'}</strong>
        </p>
        {spec.info?.description && (
          <p style={{ whiteSpace: 'pre-line' }}>{spec.info.description}</p>
        )}
      </section>

      {/* ----- KPIs ----- */}
      <section className="stats-grid">
        <div className="stat">
          <span className="stat-label">Endpoints</span>
          <span className="stat-value">{endpoints.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Tags</span>
          <span className="stat-value">{Object.keys(groupedByTag).length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Schemas</span>
          <span className="stat-value">{schemas.length}</span>
        </div>
      </section>

      {/* ----- Endpoints por tag ----- */}
      {Object.keys(groupedByTag).map((tag) => (
        <section key={tag} className="panel">
          <h2>{tag}</h2>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '90px' }}>Método</th>
                <th>Ruta</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {groupedByTag[tag].map((ep, idx) => (
                <tr key={`${ep.method}-${ep.path}-${idx}`}>
                  <td>
                    <span className={`method method-${ep.method.toLowerCase()}`}>
                      {ep.method}
                    </span>
                  </td>
                  <td>
                    <code>{ep.path}</code>
                  </td>
                  <td>{ep.summary || <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      {/* ----- Schemas ----- */}
      {schemas.length > 0 && (
        <section className="panel">
          <h2>Schemas Pydantic</h2>
          <ul className="tag-list">
            {schemas.map((s) => (
              <li key={s}>
                <code>{s}</code>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ----- JSON crudo ----- */}
      <section className="panel">
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setShowRaw((v) => !v)}
        >
          {showRaw ? 'Ocultar JSON crudo' : 'Ver JSON crudo'}
        </button>
        {showRaw && (
          <pre className="code-block">{JSON.stringify(spec, null, 2)}</pre>
        )}
      </section>
    </div>
  )
}
