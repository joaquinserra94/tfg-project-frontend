import { useCallback, useEffect, useState } from 'react'
import * as taskApi from '../api/taskApi.js'
import { countAssignedTo } from '../utils/taskMetaStore.js'

/**
 * Hook que mantiene actualizado el número de tareas asignadas al usuario
 * actual y aún no completadas.
 *
 * Estrategia:
 *  - Al montarse, llama a /tasks/ una vez para cachear la lista.
 *  - Recalcula el contador cuando el meta de tareas cambia (evento global
 *    'taskmeta:changed' que disparan TasksPage / BoardPage / Drawer).
 *  - Recarga la lista de tareas cuando se dispara 'tasks:changed' (al crear
 *    o eliminar tareas vía API).
 *
 * No hace polling continuo: solo refresca cuando hay un cambio relevante.
 */
export function useAssignedCount(email, isAuthenticated) {
  const [tasks, setTasks] = useState([])
  const [count, setCount] = useState(0)

  // Recalcula el contador a partir de las tareas cacheadas y el meta actual
  const recompute = useCallback(
    (list) => {
      setCount(countAssignedTo(list || tasks, email))
    },
    [email, tasks],
  )

  const reloadTasks = useCallback(async () => {
    if (!isAuthenticated) {
      setTasks([])
      setCount(0)
      return
    }
    try {
      const data = await taskApi.listTasks()
      const list = data || []
      setTasks(list)
      setCount(countAssignedTo(list, email))
    } catch {
      // Silencioso: si falla, dejamos el contador como estaba.
      // 401 ya está manejado en client.js (cierra sesión).
    }
  }, [email, isAuthenticated])

  // Carga inicial cuando cambia el estado de autenticación o el email
  useEffect(() => {
    reloadTasks()
  }, [reloadTasks])

  // Recalcula al cambiar metadatos locales
  useEffect(() => {
    const handler = () => recompute()
    window.addEventListener('taskmeta:changed', handler)
    return () => window.removeEventListener('taskmeta:changed', handler)
  }, [recompute])

  // Recarga la lista al cambiar tareas en la API
  useEffect(() => {
    const handler = () => reloadTasks()
    window.addEventListener('tasks:changed', handler)
    return () => window.removeEventListener('tasks:changed', handler)
  }, [reloadTasks])

  return count
}
