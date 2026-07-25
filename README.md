# Scaffold

> **Manga, together.**

Scaffold is a real-time collaborative drawing platform for manga, comic, and
digital artists. It is designed to speed up technical groundwork such as
construction guides, proportions, and panel layout while leaving the final
linework and artistic decisions entirely to the artist.

The project is under active development by DevHub Labs.

---

## Vision

Scaffold aims to become the collaborative workspace for comic and manga artists
— combining real-time collaboration, deterministic artistic assistance, and
professional drawing tools while ensuring artists remain in complete creative
control. Nothing in Scaffold generates finished art on a user's behalf. The
tool builds the scaffold; the artist builds the art.

---

## MVP Progress

### Core Canvas
- [x] Drawing (mouse, touch, stylus)
- [x] Pressure-sensitive brushes (pencil, pen)
- [x] Eraser brush
- [x] Layers
- [x] Undo / Redo
- [ ] Select & Scale
- [ ] Manga page templates

### Collaboration
- [x] Socket.IO room membership
- [x] Live cursors
- [x] Stroke synchronisation
- [x] Stroke persistence and replay
- [ ] Dynamic room creation and room links
### Notes for development

- Each service's source folder is mounted into its container, so saving a file hot-reloads that service (Vite HMR for the frontend, `nodemon` for backend-node, `uvicorn --reload` for backend-python).
- `backend-node` exposes `/health`, `/auth/signup`, `/auth/login`, and the protected `/auth/me` JWT verification endpoint. Export remains to be implemented.

## Repository Structure

See [docs/project-structure.md](docs/project-structure.md) for the full directory tree and folder descriptions. The project structure document is the canonical reference for the repository layout.

---

## Snap-to-Shape

Snap-to-Shape is one of Scaffold's flagship features. When a user finishes a
stroke, the pipeline detects whether it resembles a known geometric shape and,
if confident enough, replaces the freehand stroke with a mathematically clean
version of the same shape — preserving the artist's proportions and intent
without generating anything new.

### Shapes supported

Line, rectangle, circle, ellipse, polygon, arrow, speech bubble, star.

### Detection order

Detectors run in priority order — line first (simplest to detect), then
rectangle, circle, ellipse, then the compound shapes. The first detector that
exceeds the confidence threshold wins. If no detector is confident enough, the
original freehand stroke is kept untouched.

### Toggle

Snap-to-Shape is toggleable per user. Artists who prefer pure freehand can
disable it without affecting other collaborators in the same room.

### Module locations

```
frontend/src/canvas/shapes/
├── constants/ShapeType.js       — shape type enum
├── detectors/                   — one detector per shape
├── fitters/                     — one fitter per shape + shared fitUtils.js
├── ShapeFactory.js              — converts fitted geometry into Fabric objects
└── snapToShape.js               — orchestrates the full pipeline
```

### Current status

Detectors, fitters, ShapeFactory, and the snapToShape orchestrator all exist.
Canvas integration (wiring `path:created` in Canvas.jsx to call snapToShape,
and adding the toggle to the toolbar) is the remaining step.

---

## Architecture

| Component | Responsibility | Technology |
| --- | --- | --- |
| `frontend` | Canvas UI, drawing tools, local history, real-time client | React, Vite, Fabric.js, Socket.IO Client |
| `backend-python` | Real-time rooms, stroke persistence, voice API, Co-Artist services | FastAPI, python-socketio, Motor |
| `backend-node` | Authentication and export services | Node.js, Express |
| `mongo` | Persistent room stroke storage | MongoDB 7 |

---

## Quick Start With Docker

### Prerequisites

- Docker Engine or Docker Desktop
- Docker Compose v2 (`docker compose`)

### 1. Create the environment file

```bash
cp .env.example .env
```

| Variable      | Used by        | Default                        |
| ------------- | -------------- | ------------------------------ |
| `JWT_SECRET`  | backend-node   | `dev-secret-change-me`         |
| `MONGO_URI`   | backend-node   | `mongodb://mongo:27017/ucdp`   |

`.env` is git-ignored, so local secrets are never committed.

### Notes for development

- Each service's source folder is mounted into its container, so saving a file hot-reloads that service (Vite HMR for the frontend, `nodemon` for backend-node, `uvicorn --reload` for backend-python).
- `backend-node` currently ships a **minimal Express server** exposing only `/health`. Build authentication, JWT, and the export service on top of `backend-node/server.js`.

## Team Responsibilities

### Obi — Canvas Engine and Real-Time Client

- Pointer Events input (mouse, touch, stylus, pressure)
- PressureBrush and EraserBrush
- Layer management and LayersContext
- Undo and redo
- Snap-to-shape canvas integration
- Select and scale
- Socket.IO client (join, cursor emit/receive, stroke emit/receive)

### Ronald — Python Real-Time Backend

- Room management and Socket.IO events
- Stroke persistence and canvas replay
- Voice backend (Daily.co)
- Co-Artist backend (Groq, skeleton, construction guides, contours)

### Testimony — Node Backend

- Authentication and JWT security
- Export service (PNG / PDF)
- Backend integration and glue layer
- Build-in-public content pipeline

### Davis — Frontend UI

- All ten frontend pages
- Shared application styling

---

## Testing and Quality Checks

### Frontend

```bash
cd frontend
npm run lint
npm run build
```

### Python unit tests

```bash
cd backend-python
python -m pytest -m "not integration"
```

### Python integration tests

Start the Docker stack first, then:

```bash
cd backend-python
python -m pytest -m integration
```

Integration tests connect to http://localhost:8000 and require MongoDB.

---

## Documentation Policy

- README.md documents the project.
- docs/project-structure.md documents the filesystem.
- Both must be updated whenever implementation changes.
- Documentation changes should be included in the same commit or PR as the code whenever applicable.

---

## Known Limitations

- Authentication and JWT validation are present in the Node backend, but export flows and full integration remain incomplete.
- The `authToken` sent by the development client is not validated
- The Python Socket.IO server currently allows all CORS origins
- The eraser draws with the canvas background color; it is not a destructive
  Fabric object eraser
- Undo and redo are local canvas operations and are not synchronised as
  delete or restore events across collaborators
- Co-Artist guides are broadcast but are not persisted in MongoDB
- The frontend currently joins a fixed development room (`abc123`) with a
  temporary session-storage user ID; there is no dynamic room creation or
  join UI yet
- The frontend production build reports a bundle-size warning above 500 kB
- `frontend/src/context/layers-context.js` is a stale duplicate of
  `LayersContext.jsx` and should be deleted

---

## Documentation

- `docs/Scaffold_PRD.pdf` — full product requirements, design system, and
  planned v1 scope
- `docs/co-artist-mode1-plan.md` — completed backend skeleton and
  construction-guide pipeline documentation
- `docs/project-structure.md` — full directory tree (see separate file)

---

## License

The repository license has not been finalized. `LICENSE` currently contains
`License: TBD`.