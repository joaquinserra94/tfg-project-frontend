import { useRef, useState } from 'react'
import { parseCSV } from '../utils/csvParser.js'
import { exportToCSV } from '../utils/csv.js'
import ErrorMessage from './ErrorMessage.jsx'

/**
 * <ImportCsv config={...} onDone={...} />
 *
 * Componente genérico de importación CSV. La página padre le pasa una
 * config que describe el "tipo" (proyectos, tareas...).
 *
 * Forma de la config:
 * {
 *   entityName: 'proyectos',                  // texto para los mensajes
 *   templateName: 'plantilla-proyectos',      // nombre del archivo CSV plantilla
 *   templateColumns: [                        // columnas de la plantilla descargable
 *     { key: 'name',        label: 'name',        example: 'Mi proyecto' },
 *     { key: 'description', label: 'description', example: 'Descripción opcional' },
 *   ],
 *   requiredHeaders: ['name'],                // headers obligatorios en el CSV subido
 *   buildPayload: (row) => ({...}) | { error: '...' },  // valida y devuelve payload o error
 *   submit: async (payload) => apiCall(payload),         // sube una fila a la API
 * }
 *
 * Estrategia ante errores: las filas válidas se suben; las inválidas se
 * recogen en un informe final. No aborta todo si una falla.
 */
export default function ImportCsv({ config, onDone }) {
  const fileInputRef = useRef(null)
  const [filename, setFilename] = useState('')
  const [parseError, setParseError] = useState('')
  const [preview, setPreview] = useState(null) // { headers, rows, valid, invalid }
  const [submitting, setSubmitting] = useState(false)
  const [report, setReport] = useState(null) // { ok, failed: [{row, reason}] }

  const reset = () => {
    setFilename('')
    setParseError('')
    setPreview(null)
    setReport(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDownloadTemplate = () => {
    // Generamos una fila de ejemplo en la plantilla para que el usuario vea el formato.
    const exampleRow = {}
    for (const c of config.templateColumns) {
      exampleRow[c.key] = c.example ?? ''
    }
    exportToCSV(
      [exampleRow],
      config.templateColumns.map((c) => ({ key: c.key, label: c.label })),
      config.templateName,
    )
  }

  const handleFileChange = async (e) => {
    setParseError('')
    setPreview(null)
    setReport(null)

    const file = e.target.files?.[0]
    if (!file) return

    setFilename(file.name)

    let text
    try {
      text = await file.text()
    } catch {
      setParseError('No se pudo leer el archivo.')
      return
    }

    const { headers, rows } = parseCSV(text)

    if (rows.length === 0) {
      setParseError('El CSV no contiene filas de datos.')
      return
    }

    // Comprobación de headers obligatorios (también acepta requiredEither: ['a','b'])
    const missing = config.requiredHeaders.filter((h) => !headers.includes(h))
    if (missing.length > 0 && !config.requiredEither) {
      setParseError(
        `Faltan columnas obligatorias: ${missing.join(', ')}. Descarga la plantilla para ver el formato esperado.`,
      )
      return
    }

    if (config.requiredEither) {
      // Al menos una de las cabeceras del array debe estar
      const hasOneOf = config.requiredEither.some((h) => headers.includes(h))
      if (!hasOneOf) {
        setParseError(
          `Falta al menos una de estas columnas: ${config.requiredEither.join(' o ')}.`,
        )
        return
      }
    }

    // Validación fila a fila → genera dos listas (válidas / inválidas)
    const valid = []
    const invalid = []
    rows.forEach((row, idx) => {
      const result = config.buildPayload(row)
      if (result && result.error) {
        invalid.push({
          rowNumber: idx + 2, // +2: 1 por header, 1 por base 1
          row,
          reason: result.error,
        })
      } else {
        valid.push({ rowNumber: idx + 2, row, payload: result })
      }
    })

    setPreview({ headers, rows, valid, invalid })
  }

  const handleSubmit = async () => {
    if (!preview) return
    setSubmitting(true)

    const failed = [...preview.invalid] // arranca con las que ya fallaron en validación
    let ok = 0

    for (const item of preview.valid) {
      try {
        await config.submit(item.payload)
        ok++
      } catch (err) {
        failed.push({
          rowNumber: item.rowNumber,
          row: item.row,
          reason: err.message || 'Error al enviar al servidor',
        })
      }
    }

    setReport({ ok, failed })
    setSubmitting(false)

    if (typeof onDone === 'function' && ok > 0) {
      onDone()
    }
  }

  return (
    <div className="import-csv">
      <div className="import-actions">
        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="btn btn-secondary btn-sm"
        >
          Descargar plantilla CSV
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="import-file-input"
        />
      </div>

      {filename && !parseError && (
        <p className="muted small">Archivo: {filename}</p>
      )}

      <ErrorMessage message={parseError} />

      {/* ---- Preview antes de subir ---- */}
      {preview && !report && (
        <div className="import-preview">
          <p>
            <strong>{preview.valid.length}</strong> {config.entityName} listas para subir
            {preview.invalid.length > 0 && (
              <>
                {' · '}
                <strong className="text-danger">
                  {preview.invalid.length} con errores
                </strong>{' '}
                (no se subirán)
              </>
            )}
            .
          </p>

          {preview.invalid.length > 0 && (
            <details className="import-errors">
              <summary>Ver filas con errores</summary>
              <table className="table table-compact">
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.invalid.map((it) => (
                    <tr key={it.rowNumber}>
                      <td>{it.rowNumber}</td>
                      <td className="text-danger">{it.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}

          <div className="import-actions">
            <button
              type="button"
              onClick={handleSubmit}
              className="btn btn-primary"
              disabled={submitting || preview.valid.length === 0}
            >
              {submitting
                ? 'Subiendo…'
                : `Subir ${preview.valid.length} ${config.entityName}`}
            </button>
            <button type="button" onClick={reset} className="btn btn-secondary btn-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ---- Informe final ---- */}
      {report && (
        <div className="import-report">
          <div className="alert alert-success">
            ✓ Subidos correctamente: <strong>{report.ok}</strong>
          </div>

          {report.failed.length > 0 && (
            <div className="alert alert-error">
              <strong>{report.failed.length}</strong> fila(s) no se pudieron subir:
              <table className="table table-compact" style={{ marginTop: '0.5rem' }}>
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {report.failed.map((it) => (
                    <tr key={it.rowNumber}>
                      <td>{it.rowNumber}</td>
                      <td>{it.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button type="button" onClick={reset} className="btn btn-secondary btn-sm">
            Importar otro archivo
          </button>
        </div>
      )}
    </div>
  )
}
