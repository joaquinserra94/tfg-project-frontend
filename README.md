# TFG · Frontend — Project Management API

Frontend MVP en React + Vite que consume la API REST del TFG
(`https://github.com/joaquinserra94/tfg-project-api`).

## Requisitos

- Node.js 18+ y npm
- Backend del TFG corriendo (en local o desplegado en Render)

## Instalación

```bash
npm install
cp .env.example .env
# Edita .env y pon la URL de tu API
npm run dev
```

La app arranca en `http://localhost:5173`.

## Variables de entorno

| Variable        | Descripción                              | Ejemplo                                       |
| --------------- | ---------------------------------------- | --------------------------------------------- |
| `VITE_API_URL`  | URL base del backend (sin barra final)   | `http://localhost:8000`                       |
|                 |                                          | `https://tfg-project-api.onrender.com`        |

## Build de producción

```bash
npm run build      # genera /dist
npm run preview    # sirve /dist en local para validar
```

## Despliegue en Vercel

1. Sube este frontend a un repo de GitHub.
2. En vercel.com, importa el repo.
3. Framework preset: **Vite**.
4. Variable de entorno: `VITE_API_URL` con la URL de Render.
5. Deploy.

## Estructura

```
frontend/
├── package.json
├── vite.config.js
├── index.html
├── .env.example
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── api/         # cliente HTTP y un módulo por recurso
    ├── context/     # AuthContext, ThemeContext
    ├── components/  # Navbar, ProtectedRoute, ErrorMessage, Loading,
    │                #  ImportCsv, TaskDetailDrawer
    ├── pages/       # Login, Register, Dashboard, Projects, Tasks,
    │                #  Board, Reports, AboutApi
    ├── utils/       # storage, csv, csvParser, taskMetaStore,
    │                #  projectMetaStore, projectTypes
    └── styles/global.css
```

## Funcionalidades

### Sobre la API real (sin tocar el backend)

- Registro y login con JWT.
- CRUD parcial de proyectos (listar, crear, eliminar).
- CRUD parcial de tareas (listar, crear, eliminar) asociadas a un proyecto.
- Dashboard con métricas calculadas en cliente (total proyectos, total
  tareas, media tareas/proyecto, top 5).
- Vista *Acerca de la API* leyendo `/openapi.json` en directo.
- Búsqueda, filtros (por proyecto y estado) y ordenación.
- **Importación masiva desde CSV** en proyectos y tareas, con
  descarga de plantilla, validación fila a fila e informe de errores.
  Para tareas, el proyecto se puede indicar por `project_id` o por
  `project_name` (case-insensitive).
- **Exportación a CSV** (con BOM UTF-8 para que Excel respete las tildes).
- **Página de informes** con tres gráficas SVG hechas a mano (sin
  dependencias): tareas por estado, tareas por proyecto y proyectos
  por tipo. Soporte de impresión (`window.print()`) con `@media print`
  para ocultar UI no relevante.

### Capa de presentación local (datos en localStorage, NO en el backend)

- **Tipos de proyecto predefinidos**: Genérico, Software (Backlog →
  En curso → PR → Review → Done), Marketing (Idea → Brief → Producción
  → Revisión → Publicado). El tipo se elige inline en la tabla de
  proyectos y determina las columnas del Kanban.
- **Estado por tarea** alineado con las columnas del tipo del proyecto
  al que pertenece.
- **Responsable por tarea** como texto libre.
- **Etiquetas (tags)** por tarea.
- **Tablero Kanban** (`/board`) con drag & drop nativo HTML5 y columnas
  dinámicas según el tipo del proyecto seleccionado.
- **Drawer lateral de detalle de tarea**: se abre al hacer click en una
  tarea o tarjeta. Permite editar status, responsable y tags.
- **Modo oscuro** con persistencia en localStorage. Detecta
  `prefers-color-scheme` la primera vez. Se conmuta desde el icono ☾/☀
  en la navbar.

> Estos datos son metadatos del cliente, justificados como capa de
> presentación. El backend modela el dominio del TFG (proyectos y
> tareas con autenticación). Mismo patrón usado por Trello, Notion o
> Linear para preferencias locales.

## Filosofía técnica

- Cero dependencias innecesarias: sin Tailwind, sin Redux, sin
  librerías de gráficos, sin librerías de drag & drop. Solo React,
  React Router y nada más.
- Las gráficas son SVG generado a mano y defendible línea a línea.
- El parser CSV cumple RFC 4180 en lo esencial (comillas, escape,
  CRLF, BOM) y está testeado contra round-trip de la propia exportación.
