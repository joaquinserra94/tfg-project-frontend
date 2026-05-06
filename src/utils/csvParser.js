/**
 * Parser CSV minimalista pero robusto.
 *
 * Soporta:
 *  - Campos entrecomillados con "..."
 *  - Escape de comillas dobles ("" -> ")
 *  - Comas dentro de campos entrecomillados
 *  - Saltos de línea \n y \r\n
 *  - Líneas vacías ignoradas
 *  - BOM UTF-8 al inicio (limpia automáticamente)
 *
 * Devuelve { headers: [...], rows: [{header1: value1, ...}, ...] }
 *
 * No depende de librerías externas para mantener el bundle pequeño y
 * facilitar la defensa del TFG (cero dependencias mágicas).
 */

export function parseCSV(text) {
  if (typeof text !== 'string') {
    return { headers: [], rows: [] }
  }

  // Limpia BOM UTF-8 si existe
  let input = text.replace(/^\uFEFF/, '')

  const records = []
  let field = ''
  let record = []
  let inQuotes = false
  let i = 0

  while (i < input.length) {
    const c = input[i]

    if (inQuotes) {
      if (c === '"') {
        // ¿Comilla escapada ""?
        if (input[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        // Cierre de comilla
        inQuotes = false
        i++
        continue
      }
      field += c
      i++
      continue
    }

    // Fuera de comillas
    if (c === '"') {
      inQuotes = true
      i++
      continue
    }
    if (c === ',') {
      record.push(field)
      field = ''
      i++
      continue
    }
    if (c === '\r') {
      // \r\n -> tratar como un único salto
      if (input[i + 1] === '\n') i++
      record.push(field)
      records.push(record)
      record = []
      field = ''
      i++
      continue
    }
    if (c === '\n') {
      record.push(field)
      records.push(record)
      record = []
      field = ''
      i++
      continue
    }
    field += c
    i++
  }

  // Último campo / línea (si el archivo no termina en \n)
  if (field.length > 0 || record.length > 0) {
    record.push(field)
    records.push(record)
  }

  // Filtra líneas totalmente vacías
  const cleaned = records.filter(
    (r) => !(r.length === 1 && r[0].trim() === ''),
  )

  if (cleaned.length === 0) {
    return { headers: [], rows: [] }
  }

  // Primera fila = headers (normalizamos a minúsculas y trim)
  const headers = cleaned[0].map((h) => h.trim().toLowerCase())

  const rows = cleaned.slice(1).map((arr) => {
    const obj = {}
    headers.forEach((h, idx) => {
      obj[h] = (arr[idx] ?? '').trim()
    })
    return obj
  })

  return { headers, rows }
}
