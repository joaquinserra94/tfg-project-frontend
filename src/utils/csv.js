/**
 * Exportador CSV genérico.
 *
 * - Acepta un array de objetos y una lista opcional de columnas.
 * - Escapa correctamente comas, comillas y saltos de línea.
 * - Usa BOM UTF-8 para que Excel lo abra con tildes.
 * - Dispara la descarga creando un <a> temporal.
 */

function escapeCell(value) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // Si el valor contiene comas, comillas o saltos de línea, hay que entrecomillar
  // y duplicar las comillas internas (RFC 4180).
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * @param {Array<object>} rows  Datos a exportar
 * @param {Array<{key: string, label: string}>} columns  Columnas y sus etiquetas
 * @param {string} filename  Nombre del archivo (sin extensión)
 */
export function exportToCSV(rows, columns, filename = 'export') {
  if (!Array.isArray(rows) || rows.length === 0) {
    return false
  }

  const header = columns.map((c) => escapeCell(c.label)).join(',')
  const body = rows
    .map((row) => columns.map((c) => escapeCell(row[c.key])).join(','))
    .join('\r\n')

  // BOM UTF-8 para que Excel detecte la codificación correctamente
  const csv = '\uFEFF' + header + '\r\n' + body

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  return true
}
