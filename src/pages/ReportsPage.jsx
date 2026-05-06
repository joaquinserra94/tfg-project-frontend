import { useEffect, useMemo, useState } from 'react'
import * as taskApi from '../api/taskApi.js'
import * as projectApi from '../api/projectApi.js'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Loading from '../components/Loading.jsx'
import { exportToCSV } from '../utils/csv.js'
import { getMetaMap } from '../utils/taskMetaStore.js'
import { getProjectMetaMap } from '../utils/projectMetaStore.js'
import { getProjectType, listProjectTypes } from '../utils/projectTypes.js'

/**
 * Página de informes y gráficas.
 *
 * Datos: API real (tareas + proyectos) y metadatos locales (status, tipo).
 * Gráficas: SVG construido a mano (sin librerías), defendible línea a línea.
 *
 * Tres vistas:
 *   1) Tareas por estado (barras horizontales) — del proyecto seleccionado o global
 *   2) Tareas por proyecto (barras verticales)
 *   3) Distribución de proyectos por tipo (dona)
 *
 * Exportación: CSV con datos agregados.
 * Para imprimir: el navegador (Ctrl+P), con reglas @media print que
 * ocultan navbar y toolbar.
 */
export default function ReportsPage() {
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [meta, setMetaState] = useState({})
  const [projectMeta, setProjectMetaState] = useState({})

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterProject, setFilterProject] = useState('all')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [t, p] = await Promise.all([
          taskApi.listTasks(),
          projectApi.listProjects({ skip: 0, limit: 100 }),
        ])
        if (cancelled) return
        const safeTasks = t || []
        const safeProjects = p || []
        setTasks(safeTasks)
        setProjects(safeProjects)
        setMetaState(getMetaMap(safeTasks))
        setProjectMetaState(getProjectMetaMap(safeProjects))
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

  // Tipo activo para la primera gráfica
  const activeType = useMemo(() => {
    if (filterProject === 'all') return getProjectType('generic')
    return getProjectType(projectMeta[Number(filterProject)]?.type)
  }, [filterProject, projectMeta])

  // Conjunto de tareas según filtro
  const scopedTasks = useMemo(() => {
    if (filterProject === 'all') return tasks
    const pid = Number(filterProject)
    return tasks.filter((t) => t.project_id === pid)
  }, [tasks, filterProject])

  // 1) Tareas por estado (según el tipo activo)
  const tasksByStatus = useMemo(() => {
    const counts = {}
    for (const s of activeType.statuses) counts[s.key] = 0
    const fallback = activeType.statuses[0]?.key

    for (const t of scopedTasks) {
      const status = meta[t.id]?.status || fallback
      if (counts[status] !== undefined) counts[status]++
      else if (fallback) counts[fallback]++
    }
    return activeType.statuses.map((s) => ({
      key: s.key,
      label: s.label,
      color: s.color,
      text: s.text,
      border: s.border,
      value: counts[s.key],
    }))
  }, [scopedTasks, meta, activeType])

  // 2) Tareas por proyecto (barras verticales)
  const tasksByProject = useMemo(() => {
    const counts = {}
    for (const p of projects) counts[p.id] = 0
    for (const t of tasks) {
      if (counts[t.project_id] !== undefined) counts[t.project_id]++
    }
    return projects
      .map((p) => ({ id: p.id, name: p.name, value: counts[p.id] }))
      .sort((a, b) => b.value - a.value)
  }, [projects, tasks])

  // 3) Proyectos por tipo
  const projectsByType = useMemo(() => {
    const counts = {}
    for (const t of listProjectTypes()) counts[t.key] = 0
    for (const p of projects) {
      const k = projectMeta[p.id]?.type || 'generic'
      if (counts[k] !== undefined) counts[k]++
    }
    return listProjectTypes().map((t) => ({
      key: t.key,
      label: t.label,
      value: counts[t.key],
    }))
  }, [projects, projectMeta])

  // ---- Exportación ----
  const handleExport = () => {
    const rows = []

    // Sección 1
    for (const r of tasksByStatus) {
      rows.push({
        section: 'Tareas por estado',
        scope:
          filterProject === 'all'
            ? 'Todos los proyectos'
            : projects.find((p) => p.id === Number(filterProject))?.name || '',
        item: r.label,
        value: r.value,
      })
    }
    // Sección 2
    for (const r of tasksByProject) {
      rows.push({
        section: 'Tareas por proyecto',
        scope: 'Global',
        item: r.name,
        value: r.value,
      })
    }
    // Sección 3
    for (const r of projectsByType) {
      rows.push({
        section: 'Proyectos por tipo',
        scope: 'Global',
        item: r.label,
        value: r.value,
      })
    }

    exportToCSV(
      rows,
      [
        { key: 'section', label: 'Sección' },
        { key: 'scope', label: 'Ámbito' },
        { key: 'item', label: 'Concepto' },
        { key: 'value', label: 'Valor' },
      ],
      `informe-${new Date().toISOString().slice(0, 10)}`,
    )
  }

  if (loading) return <Loading text="Generando informe…" />
  if (error) return <ErrorMessage message={error} />

  return (
    <div>
      <h1>Informes</h1>
      <p className="muted small">
        Gráficas calculadas a partir de los datos de la API y los metadatos
        locales. Usa <kbd>Ctrl/Cmd + P</kbd> para imprimir o guardar como PDF.
      </p>

      <section className="panel no-print">
        <div className="panel-header">
          <h2>Filtros</h2>
          <div className="toolbar">
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="toolbar-input"
            >
              <option value="all">Todos los proyectos</option>
              {projects.map((p) => {
                const t = getProjectType(projectMeta[p.id]?.type)
                return (
                  <option key={p.id} value={p.id}>
                    {p.name} · {t.label}
                  </option>
                )
              })}
            </select>
            <button onClick={handleExport} className="btn btn-secondary btn-sm">
              Exportar CSV
            </button>
            <button
              onClick={() => window.print()}
              className="btn btn-secondary btn-sm"
            >
              Imprimir / PDF
            </button>
          </div>
        </div>
      </section>

      {/* ---- KPIs globales ---- */}
      <section className="stats-grid">
        <div className="stat">
          <span className="stat-label">Proyectos</span>
          <span className="stat-value">{projects.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Tareas (ámbito)</span>
          <span className="stat-value">{scopedTasks.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Tareas totales</span>
          <span className="stat-value">{tasks.length}</span>
        </div>
      </section>

      {/* ---- 1) Tareas por estado ---- */}
      <section className="panel">
        <h2>
          Tareas por estado
          <span className="muted small">
            {' · '}
            {filterProject === 'all'
              ? `vista ${activeType.label.toLowerCase()}`
              : projects.find((p) => p.id === Number(filterProject))?.name}
          </span>
        </h2>
        <BarChartHorizontal data={tasksByStatus} />
      </section>

      {/* ---- 2) Tareas por proyecto ---- */}
      <section className="panel">
        <h2>Tareas por proyecto</h2>
        {tasksByProject.length === 0 ? (
          <p className="muted">No hay proyectos.</p>
        ) : (
          <BarChartVertical data={tasksByProject} />
        )}
      </section>

      {/* ---- 3) Proyectos por tipo ---- */}
      <section className="panel">
        <h2>Proyectos por tipo</h2>
        {projects.length === 0 ? (
          <p className="muted">No hay proyectos.</p>
        ) : (
          <DonutChart data={projectsByType} />
        )}
      </section>
    </div>
  )
}

/* =====================================================================
   Componentes de gráficos. SVG puro, sin librerías.
   ===================================================================== */

/**
 * Barras horizontales. Cada barra usa el color del estado al que representa.
 * Etiquetas a la izquierda, valor al final de la barra.
 */
function BarChartHorizontal({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const rowH = 32
  const labelW = 130
  const valueW = 40
  const innerW = 360
  const totalW = labelW + innerW + valueW
  const totalH = data.length * rowH + 10

  return (
    <svg
      viewBox={`0 0 ${totalW} ${totalH}`}
      className="chart"
      role="img"
      aria-label="Tareas por estado"
    >
      {data.map((d, idx) => {
        const y = idx * rowH + 10
        const w = (d.value / max) * innerW
        return (
          <g key={d.key}>
            <text x={labelW - 8} y={y + 16} textAnchor="end" className="chart-label">
              {d.label}
            </text>
            <rect
              x={labelW}
              y={y + 4}
              width={Math.max(2, w)}
              height={20}
              fill={d.color}
              stroke={d.border}
              rx="3"
            />
            <text
              x={labelW + Math.max(2, w) + 6}
              y={y + 18}
              className="chart-value"
            >
              {d.value}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/**
 * Barras verticales. Etiquetas X rotadas si el nombre del proyecto es largo.
 */
function BarChartVertical({ data }) {
  const w = Math.max(360, data.length * 60)
  const h = 220
  const padX = 24
  const padTop = 16
  const padBottom = 60
  const innerW = w - padX * 2
  const innerH = h - padTop - padBottom
  const max = Math.max(1, ...data.map((d) => d.value))
  const barW = Math.min(48, (innerW / data.length) * 0.7)
  const stepX = innerW / data.length

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="chart"
      role="img"
      aria-label="Tareas por proyecto"
    >
      {/* Eje Y referencia */}
      <line
        x1={padX}
        y1={padTop + innerH}
        x2={padX + innerW}
        y2={padTop + innerH}
        className="chart-axis"
      />

      {data.map((d, idx) => {
        const cx = padX + stepX * idx + stepX / 2
        const barH = (d.value / max) * innerH
        const y = padTop + innerH - barH
        const labelTrim = d.name.length > 18 ? d.name.slice(0, 17) + '…' : d.name
        return (
          <g key={d.id}>
            <rect
              x={cx - barW / 2}
              y={y}
              width={barW}
              height={Math.max(0, barH)}
              fill="#3b82f6"
              rx="3"
            />
            <text x={cx} y={y - 4} textAnchor="middle" className="chart-value">
              {d.value}
            </text>
            <text
              x={cx}
              y={padTop + innerH + 14}
              textAnchor="end"
              transform={`rotate(-30 ${cx} ${padTop + innerH + 14})`}
              className="chart-label"
            >
              {labelTrim}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/**
 * Donut chart. Proporción por tipo de proyecto.
 */
function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const size = 220
  const cx = size / 2
  const cy = size / 2
  const r = 80
  const inner = 50
  const palette = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444']

  if (total === 0) {
    return <p className="muted">Sin datos para representar.</p>
  }

  // Construye paths SVG para cada porción usando coordenadas polares.
  // Caso especial: si solo hay una porción no nula (porcentaje 100%),
  // un arco SVG de 360° degenera (start == end), así que dibujamos
  // dos círculos concéntricos.
  const nonZero = data.filter((d) => d.value > 0)
  if (nonZero.length === 1) {
    const d = nonZero[0]
    return (
      <div className="donut-wrapper">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="chart chart-donut"
          role="img"
          aria-label="Proyectos por tipo"
        >
          <circle cx={cx} cy={cy} r={r} fill={palette[0]} />
          <circle cx={cx} cy={cy} r={inner} fill="var(--bg-elev)" />
          <text
            x={cx}
            y={cy + 4}
            textAnchor="middle"
            className="chart-donut-total"
          >
            {total}
          </text>
        </svg>
        <ul className="donut-legend">
          <li>
            <span
              className="donut-legend-dot"
              style={{ background: palette[0] }}
            />
            {d.label} — {d.value} (100%)
          </li>
        </ul>
      </div>
    )
  }

  let acc = 0
  const slices = nonZero.map((d, idx) => {
      const startAngle = (acc / total) * Math.PI * 2 - Math.PI / 2
      acc += d.value
      const endAngle = (acc / total) * Math.PI * 2 - Math.PI / 2

      const x1 = cx + r * Math.cos(startAngle)
      const y1 = cy + r * Math.sin(startAngle)
      const x2 = cx + r * Math.cos(endAngle)
      const y2 = cy + r * Math.sin(endAngle)

      const xi1 = cx + inner * Math.cos(endAngle)
      const yi1 = cy + inner * Math.sin(endAngle)
      const xi2 = cx + inner * Math.cos(startAngle)
      const yi2 = cy + inner * Math.sin(startAngle)

      const largeArc = endAngle - startAngle > Math.PI ? 1 : 0

      const path = [
        `M ${x1} ${y1}`,
        `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${xi1} ${yi1}`,
        `A ${inner} ${inner} 0 ${largeArc} 0 ${xi2} ${yi2}`,
        'Z',
      ].join(' ')

      return {
        path,
        color: palette[idx % palette.length],
        label: d.label,
        value: d.value,
        pct: ((d.value / total) * 100).toFixed(0),
      }
    })

  return (
    <div className="donut-wrapper">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="chart chart-donut"
        role="img"
        aria-label="Proyectos por tipo"
      >
        {slices.map((s, idx) => (
          <path key={idx} d={s.path} fill={s.color} />
        ))}
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          className="chart-donut-total"
        >
          {total}
        </text>
      </svg>
      <ul className="donut-legend">
        {slices.map((s, idx) => (
          <li key={idx}>
            <span
              className="donut-legend-dot"
              style={{ background: s.color }}
            />
            {s.label} — {s.value} ({s.pct}%)
          </li>
        ))}
      </ul>
    </div>
  )
}
