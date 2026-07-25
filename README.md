# Scaffold

> **Manga, together.**

Scaffold is a real-time collaborative drawing platform for manga, comic, and
digital artists. It allows multiple artists to draw on the same canvas
simultaneously while communicating through voice chat. Rather than generating
artwork with AI, Scaffold focuses on speeding up the creative process by
providing collaborative tools, geometry-based shape cleanup, and
artist-friendly workflows that preserve each user's unique style.

Built by DevHub Labs.

---

## Vision

Scaffold aims to become the collaborative workspace for comic and manga artists
— combining real-time collaboration, deterministic artistic assistance, and
professional drawing tools while ensuring artists remain in complete creative
control. Nothing in Scaffold generates finished art on a user's behalf. The
tool builds the scaffold; the artist builds the art.

---

## Features

### Drawing
- Mouse, touch, and stylus support via the Pointer Events API
- Pressure-sensitive drawing where hardware supports it
- Multiple brushes (pencil, pen, eraser)
- Layers
- Undo / Redo
- Select & Scale *(planned)*
- Manga page templates *(planned)*

### Collaboration
- Shared drawing rooms
- Live cursor tracking
- Real-time stroke synchronisation
- Voice communication via Daily.co
- Auto-save with MongoDB stroke persistence

### Snap-to-Shape
Automatically cleans rough strokes into precise geometric shapes using
geometry fitting — not AI generation:
- Circles
- Ellipses
- Lines
- Rectangles
- Polygons
- Arrows
- Speech bubbles
- Stars

---

## MVP Progress

### Core Canvas
- [x] Drawing (mouse, touch, stylus)
- [x] Pressure-sensitive brushes (pencil, pen)
- [x] Eraser brush
- [x] Brush switching
- [x] Layers
- [x] Undo / Redo
- [ ] Select & Scale
- [ ] Manga page templates

### Collaboration
- [x] Socket.IO room membership
- [x] Live cursors
- [x] Stroke synchronisation
- [x] Stroke persistence and replay (up to 1,000 strokes on join)
- [ ] Dynamic room creation and shareable room links
- [ ] Shared undo / redo semantics

### Snap-to-Shape
- [x] Detection engine (8 shape types)
- [x] Fitting engine
- [x] ShapeFactory
- [ ] Canvas integration (path:created hook)
- [ ] Confidence threshold tuning

### User Features
- [x] JWT authentication backend (signup, login, protected middleware) — `backend-node`
- [ ] JWT-protected rooms (Socket.IO auth integration and frontend wiring)
- [ ] Export (PNG / PDF)
- [ ] Voice UI
- [ ] Frontend Co-Artist workflows
- [ ] Frontend pages (page folders scaffolded, markup in progress)

---

## Tech Stack

**Frontend**
- React 19
- Fabric.js
- Pointer Events API
- Socket.IO Client

**Backend**
- Python, FastAPI, python-socketio
- Node.js, Express.js, JWT Authentication

**Database**
- MongoDB 7

**Voice**
- Daily.co (WebRTC)

**Co-Artist**
- Groq (character proportion extraction)
- Deterministic skeleton and construction-guide generation

---

## Engineering Principles

- **Separation of concerns** — geometry logic, canvas rendering, real-time
  transport, and UI state are kept in separate modules with clear boundaries
- **Pure geometry, no AI art** — snap-to-shape runs entirely client-side using
  mathematical fitting; no generative model produces or modifies artwork
- **Deterministic Co-Artist assistance** — the Co-Artist backend produces the
  same construction guides for the same input every time; it scaffolds
  proportions and structure, the artist draws the actual art
- **Canvas rendering isolated from geometry** — detectors and fitters know
  nothing about Fabric.js; ShapeFactory translates geometry results into Fabric
  objects, keeping the math independently testable
- **Real-time first** — local strokes render immediately before the server
  confirms them, keeping the drawing experience lag-free
- **Clear ownership boundaries** — each team member owns specific folders;
  cross-boundary changes require discussion before implementation

---

## Data Flow

### Drawing and synchronisation

```
Pointer Event (mouse / touch / stylus)
        │
        ▼
PressureBrush — records per-point pressure
        │
        ▼
Fabric Canvas — renders stroke locally (immediate)
        │
        ▼
Undo Stack — records committed path object
        │
        ▼
Socket.IO client — emits stroke + pressures array
        │
        ▼
Python backend (canvas_service) — persists to MongoDB, broadcasts to room
        │
        ▼
Other users' canvases — replay incoming stroke
```

### Snap-to-Shape pipeline

```
path:created fires (stroke committed to canvas)
        │
        ▼
Detector — classifies stroke (line / circle / rectangle / etc.)
        │
        ▼
Fitter — computes best-fit geometry from stroke points
        │
        ▼
ShapeFactory — creates a clean Fabric object from fitted parameters
        │
        ▼
Original freehand path removed, clean shape added to canvas
        │
        ▼
Clean shape recorded in layer state and emitted over Socket.IO
```

---

## Getting Started

The entire stack runs locally with Docker — you do not need Node, Python, or
MongoDB installed on your machine, only Docker Desktop.

### 1. Clone the repository

```bash
git clone https://github.com/Devhublabs/Scaffold-.git
cd Scaffold-
```

### 2. Environment variables

No `.env` file is required to boot — development defaults are baked into
`docker-compose.yml`. To override them (for example, to set a real
`JWT_SECRET` or add API keys), copy the example file and edit it:

```bash
cp .env.example .env
```

| Variable | Used by | Default |
| --- | --- | --- |
| `JWT_SECRET` | backend-node | `dev-secret-change-me` |
| `MONGO_URI` | backend-node, backend-python | `mongodb://mongo:27017/scaffold` |
| `DAILY_API_KEY` | backend-python | Required for voice token endpoint |
| `GROQ_API_KEY` | backend-python | Required for Co-Artist proportions |
| `GROQ_MODEL` | backend-python | `openai/gpt-oss-120b` |
| `VITE_SOCKET_URL` | frontend | `http://localhost:8000` |
| `PORT` | backend-node | `4000` |

`.env` is git-ignored so local secrets are never committed. The placeholder
Daily and Groq keys do not prevent the core drawing stack from starting —
replace them only when developing those integrations.

### 3. Start the stack

```bash
docker compose up --build
```

The first build takes a few minutes; later runs use the Docker layer cache and
are much faster. Run in the background with:

```bash
docker compose up --build -d
```

Stop with:

```bash
docker compose down
```

MongoDB data is stored in the `mongo-data` Docker volume. Running
`docker compose down -v` also deletes that local data.

### 4. Services and ports

| Service | URL | Port | Stack |
| --- | --- | --- | --- |
| Frontend | http://localhost:5173 | 5173 | React 19 + Vite |
| Python backend | http://localhost:8000 | 8000 | FastAPI + Socket.IO |
| Node backend | http://localhost:4000 | 4000 | Express (auth, JWT, export) |
| MongoDB | mongodb://localhost:27017 | 27017 | MongoDB 7 |

Quick sanity check: open http://localhost:8000/docs (FastAPI) and
http://localhost:4000/health (Express) to confirm both backends are up.

### Development notes

- Each service's source folder is mounted into its container, so saving a file
  triggers hot-reload (Vite HMR for frontend, nodemon for backend-node,
  `uvicorn --reload` for backend-python)
- `backend-node` currently exposes `/health`, `/auth/signup`, `/auth/login`,
  and the JWT-protected `/auth/me` endpoint via `authController.js` /
  `authRoutes.js`; requests are guarded with `middleware/requireAuth.js`
- `backend-node/exports` exists as a scaffold folder for the future PNG / PDF
  export service — no export logic has landed yet
- The Python backend does not define a route at `/`; use `/docs` to inspect it

---

## Run Services Without Docker

MongoDB must be running and reachable before using persistence.

### Python backend

```bash
cd backend-python
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
MONGO_URI=mongodb://localhost:27017/scaffold uvicorn main:socket_app --reload --host 0.0.0.0 --port 8000
```

Export `DAILY_API_KEY` and `GROQ_API_KEY` in the same shell when developing
those integrations.

### Node backend

```bash
cd backend-node
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

For a non-Docker frontend pointing at a separately-running Python server, set
`VITE_SOCKET_URL` in `frontend/.env`.

---

## Backend Interfaces

### REST API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/voice/token` | Create or reuse a Daily room and return a one-hour meeting token |
| `POST` | `/api/co-artist/proportions` | Convert a character description into proportion data via Groq |
| `POST` | `/api/co-artist/skeleton` | Convert proportion data into deterministic construction and contour shapes |
| `POST` | `/auth/signup`, `/auth/login` on port 4000 | Create an account / obtain a JWT (`authController.js`) |
| `GET` | `/auth/me` on port 4000 | JWT-protected — returns the current user (`requireAuth.js`) |
| `GET` | `/health` on port 4000 | Check the Node service |

Interactive request schemas for the Python service: http://localhost:8000/docs

### Socket.IO Events

| Direction | Event | Purpose |
| --- | --- | --- |
| Client → server | `join_room_event` | Join a room with `roomId` and `userId` |
| Client → server | `cursor` | Broadcast cursor position |
| Client → server | `stroke` | Persist and broadcast pressure-aware stroke data |
| Client → server | `co_artist_shapes` | Broadcast a Co-Artist shape payload |
| Server → client | `user_joined` | Send current room user list |
| Server → client | `canvas_state` | Replay persisted strokes to a joining user |
| Server → client | `cursor` | Receive another user's cursor |
| Server → client | `stroke` | Receive another user's stroke |
| Server → client | `co_artist_shapes` | Receive another user's Co-Artist payload |

Socket-level JWT validation is being built out (`app/services/auth_service.py`,
covered by `tests/test_socket_auth.py`) but is not yet enforced end-to-end —
see [Known Limitations](#known-limitations).

### Stroke data contract

```json
{
  "roomId": "abc123",
  "userId": "user_5",
  "points": [[x, y], [x, y]],
  "pressures": [0.4, 0.6],
  "color": "#000000",
  "width": 3
}
```

`pressures` is a parallel array to `points` — one value per point in the same
order. Do not change field names without updating both the frontend client and
the Python backend handler and notifying the team.

---

## Snap-to-Shape

Snap-to-Shape is one of Scaffold's flagship features. When a user finishes a
stroke, the pipeline detects whether it resembles a known geometric shape and,
if confident enough, replaces the freehand stroke with a mathematically clean
version — preserving the artist's proportions and intent without generating
anything new.

**Detection order** — detectors run in priority order: line first (simplest),
then rectangle, circle, ellipse, then compound shapes. The first detector that
exceeds the confidence threshold wins. If none are confident enough, the
original freehand stroke is kept untouched.

**Toggle** — snap-to-shape is toggleable per user. Artists who prefer pure
freehand can disable it without affecting other collaborators in the room.

**Module locations**

```
frontend/src/canvas/shapes/
├── constants/ShapeType.js       — shape type enum
├── detectors/                   — one file per shape
├── fitters/                     — one file per shape + fitUtils.js
├── ShapeFactory.js              — converts fitted geometry into Fabric objects
└── snapToShape.js               — orchestrates the full pipeline
```

`frontend/src/canvas/` also now has empty scaffold folders for adjacent work:
`history/` (planned home for a decoupled undo/redo history module),
`templates/` (manga page templates), and `tools/` (canvas tools beyond
brushes).

**Current status** — detectors, fitters, ShapeFactory, and the snapToShape
orchestrator all exist. The remaining step is canvas integration: wiring
`path:created` in Canvas.jsx to call snapToShape and adding the toggle to the
toolbar.

---

## Co-Artist Backend

The Co-Artist backend has grown from a single service into a dedicated
skeleton engine under `backend-python/app/services/`:

```
services/
├── auth_service.py         — JWT verification shared with Socket.IO auth
├── canvas_service.py       — stroke persistence and canvas replay
├── co_artist_service.py    — orchestrates the Co-Artist pipeline
├── room_service.py         — room membership and lifecycle
├── voice_service.py        — Daily.co room/token handling
├── skeleton_service.py     — top-level skeleton generation entry point
└── skeleton/
    ├── proportions_resolver.py — resolves Groq proportion output into a rig spec
    ├── rig.py                  — builds the deterministic construction rig
    ├── fk.py                   — forward-kinematics for joint positioning
    ├── silhouette.py           — derives silhouette/contour guides
    └── volumes.py              — computes body-part volumes for the guide
```

Each module is covered by its own unit test (`test_proportions_resolver.py`,
`test_fk.py`, `test_silhouette.py`, `test_volumes.py`,
`test_skeleton_service.py`), plus `test_co_artist_service.py` and
`test_co_artist_skeleton_api.py` for the pipeline and API layer respectively.
The philosophy is unchanged: Groq extracts proportions from a description, and
everything downstream — rig, silhouette, volumes — is deterministic geometry,
not generated art.

---

## Frontend Pages

Ten pages are planned for v1, all built in HTML/CSS matching the locked design
system. Folders currently scaffolded under `frontend/src/pages/` are `Auth`,
`Dashboard`, `Export`, `Landing`, `Room`, and `Workspace`; the remaining pages
below don't have a folder yet.

| Page | Owner | Status |
| --- | --- | --- |
| Landing | Davis | Folder scaffolded, markup in progress |
| Dashboard | Davis | Folder scaffolded, markup in progress |
| Projects | Davis | Not started |
| Export | Davis | Folder scaffolded, markup in progress |
| Settings | Davis | Not started |
| Members | Davis | Not started |
| Auth (Sign in / Sign up) | Davis | Folder scaffolded, markup in progress |
| Room Creation / Join | Davis | Folder scaffolded (`Room`), markup in progress |
| Templates | Davis | Not started |
| Canvas Workspace UI markup | Davis | Folder scaffolded (`Workspace`), markup in progress |

### Design system

```css
:root {
  --bg: #16171C;
  --panel: #1F2128;
  --border: #2E313A;
  --text-primary: #F2F2F0;
  --text-muted: #8B8D96;
  --accent: #3D7EDB;
  --accent-hover: #5A93E6;
  --radius: 6px;
  --font: 'Inter', system-ui, sans-serif;
}
```

Collaborator cursor colors (one per active user, cycled):
`#E8544E` `#3DB88C` `#E6B33D` `#A66DE0` `#3D7EDB` `#E67E3D`

---

## Code Ownership

Coordinate any changes that cross these boundaries before implementation. Do
not modify files outside your assigned area without discussing it with the team.

| Owner | Paths |
| --- | --- |
| Obi | `frontend/src/canvas/`, `frontend/src/socket/`, `frontend/src/components/` |
| Ronald | `backend-python/` |
| Testimony | `backend-node/` |
| Davis | `frontend/src/pages/`, `frontend/src/styles/` |

### Creating files

Each contributor is responsible for creating their own files inside the
appropriate folders. For example:

- Pages go inside `frontend/src/pages/`
- Shared UI goes inside `frontend/src/components/`
- Canvas logic goes inside `frontend/src/canvas/`
- Socket code goes inside `frontend/src/socket/`
- Styles go inside `frontend/src/styles/`

Do not create files outside your assigned area without discussing it with the
team.

---

## Team Responsibilities

### Obi — Canvas Engine and Real-Time Client

Works inside `frontend/src/canvas/`, `frontend/src/socket/`,
`frontend/src/components/`

- Pointer Events input (mouse, touch, stylus, pressure)
- PressureBrush and EraserBrush
- Brush switching
- Layer management and LayersContext
- Undo and redo
- Snap-to-shape canvas integration
- Select and scale
- Socket.IO client (join, cursor emit/receive, stroke emit/receive)
- Live cursor rendering

### Ronald — Python Real-Time Backend

Works inside `backend-python/`

- Room management and Socket.IO events (`room_service.py`, `sockets/events.py`)
- Stroke persistence and canvas replay (`canvas_service.py`)
- Voice backend (Daily.co) (`voice_service.py`)
- Co-Artist backend: pipeline orchestration (`co_artist_service.py`) and the
  skeleton engine (`skeleton_service.py` and the `skeleton/` package — FK,
  rig, silhouette, volumes, proportions resolver)
- Socket-level JWT validation (`auth_service.py`), in progress alongside
  `test_socket_auth.py`

### Testimony — Node Backend

Works inside `backend-node/`

- Authentication and JWT security — signup/login (`authController.js`,
  `authService.js`), protected routes (`requireAuth.js`), the `User` model,
  and token signing (`utils/jwt.js`)
- CORS and database configuration (`config/cors.js`, `config/db.js`)
- Export service (PNG / PDF) — folder scaffolded (`exports/`), not yet built
- Backend integration and glue layer
- Build-in-public content pipeline

### Davis — Frontend UI

Works inside `frontend/src/pages/`, `frontend/src/components/`,
`frontend/src/styles/`

- All ten frontend pages (`Auth`, `Dashboard`, `Export`, `Landing`, `Room`,
  and `Workspace` folders currently scaffolded)
- Shared application styling

---

## Git Workflow

```
main
  └── feature/your-feature-name
              │
              ▼
        Pull Request
              │
              ▼
           Review
              │
              ▼
        Merge to main
```

1. Pull the latest changes from main
2. Create a feature branch: `feature/`, `fix/`, or `chore/` prefix
3. Build your assigned feature
4. Commit with clear, descriptive commit messages
5. Push your branch
6. Open a Pull Request — write a clear description of what changed and why
7. After review, merge into main

**Never push directly to main.**

---

## Contributing

1. Branch off `main` using a `feature/`, `fix/`, or `chore/` prefix.
2. Keep changes scoped to your owned paths (see
   [Code Ownership](#code-ownership)); cross-boundary changes need a heads-up
   to the team first.
3. Add or update tests for any behavior you change — see
   [Testing and Quality Checks](#testing-and-quality-checks).
4. If your change affects features, architecture, APIs, Socket.IO events,
   folder layout, or environment variables, update this README in the same
   Pull Request (see [Maintaining this README](#maintaining-this-readme)).
5. Open a Pull Request with a clear description of what changed and why.
6. All PRs require review before merging — no direct pushes to `main`.
7. Do not merge with failing lint or test runs.

---

## Coding Standards

- ES Modules only (`import` / `export`) — no CommonJS `require`
- Named exports preferred over default exports, except for React components
- No `console.log` in committed code — remove before pushing
- Pure functions where possible, especially in detector and fitter modules
- No changes to the Socket.IO event contract without updating both frontend
  and backend and notifying the team
- Run `npm run lint` before opening a PR (frontend)
- Run `python -m pytest -m "not integration"` before opening a PR
  (backend-python)

---

## Testing and Quality Checks

### Frontend

```bash
cd frontend
npm run lint
npm run build
```

### Node backend

```bash
cd backend-node
npm test
```

Covers the auth flow (`test/auth.test.js`) — signup, login, and the
`requireAuth` middleware.

### Python unit tests

```bash
cd backend-python
python -m pytest -m "not integration"
```

Configuration lives in `pytest.ini` with shared fixtures in `conftest.py`.
The suite now covers auth, canvas persistence, room service, sockets and
socket auth, the Co-Artist pipeline and API, and each skeleton module (FK,
proportions resolver, silhouette, volumes).

### Python integration tests

Start the Docker stack first, then:

```bash
cd backend-python
python -m pytest -m integration
```

Integration tests connect to http://localhost:8000 and require MongoDB.

---

## Project Status

🚧 Active Development

Current milestones:
- ✅ React + Fabric.js canvas
- ✅ Basic drawing engine
- ✅ Pointer Events integration
- ✅ Pressure-sensitive brush
- ✅ Eraser brush
- ✅ Brush switching
- ✅ Logical layers v1
- ✅ Global undo / redo v1
- ✅ Socket.IO client (join, cursor, stroke emit/receive)
- ✅ Stroke persistence and replay (MongoDB)
- ✅ Daily.co voice token API
- ✅ Co-Artist backend (Groq proportions + deterministic skeleton engine:
  FK, rig, silhouette, volumes, proportions resolver)
- ✅ Snap-to-shape detectors and fitters
- ✅ Node auth backend (signup, login, JWT middleware, User model)
- 🚧 Socket.IO / room JWT integration (`auth_service.py`, `test_socket_auth.py`)
- 🚧 Snap-to-shape canvas integration
- 🚧 Frontend pages (page folders scaffolded, markup in progress — Davis)
- ⏳ Select & Scale
- ⏳ Manga page templates
- ⏳ Dynamic room creation and room links
- ⏳ Export (PNG / PDF) — `exports/` folder scaffolded, no implementation yet
- ⏳ Voice UI
- ⏳ Frontend Co-Artist workflows

---

## Frontend Progress Log

This section tracks completed frontend canvas milestones. Update it when a
significant piece of canvas or socket work lands.

### July 13, 2026

**Canvas and brushes**
- Pressure-sensitive pencil and pen brushes using Fabric.js and Pointer Events
- Eraser brush draws with the current canvas background color (v1 placeholder)
- Brush switching between pencil, pen, and eraser via toolbar state
- Logical layer tracking through LayersContext; drawing a stroke adds the
  Fabric object to the active layer's objects array
- Verified Sketch layer object tracking: objects array grows correctly with
  each committed stroke
- Basic global undo / redo stack (local only, v1)

**Socket.IO integration**
- Singleton Socket.IO client at `frontend/src/socket/socket.js`
- Canvas emits `join_room_event` to the Python backend on load
- Canvas emits throttled cursor events during pointer movement
- Canvas emits `stroke` events after Fabric fires `path:created`
- Canvas listens for `user_joined`, `cursor`, `stroke`, and `canvas_state`
- Incoming remote cursors render as labeled cursor dots in collaborator colors
- Incoming remote strokes replay onto the Fabric canvas

**Current development placeholders** (replace once room/auth flow is built)
- `roomId` is hardcoded as `abc123`
- `userId` is generated in sessionStorage as `user_xxxxx`
- `authToken` is currently `dev-token`

**Frontend stroke payload**

```json
{
  "type": "stroke",
  "roomId": "abc123",
  "userId": "user_xxxxx",
  "points": [[x, y], [x, y]],
  "pressures": [0.4, 0.6],
  "color": "#000000",
  "width": 3
}
```

**Integration note for Ronald** — the frontend sends `pressures` alongside
`points`. If `pressures` is missing from an incoming remote stroke, the
frontend falls back to `0.5` pressure so replay still works. Please confirm
the Python backend stores and broadcasts `pressures` on both `stroke` and
`canvas_state` events.

**Verification steps run**
- `npm run lint` — passed
- `npm run build` — passed
- Browser smoke test — drawing creates pixels on canvas with no runtime errors

---

## Repository Structure

See `docs/project-structure.md` for the full annotated directory tree.

Top-level layout:

```
Scaffold/
├── frontend/
├── backend-python/
├── backend-node/
├── docs/
├── docker-compose.yml
└── README.md
```

---

## Known Limitations

- JWT authentication now exists in `backend-node` (`authController.js`,
  `authService.js`, `requireAuth.js`, `User.js`, `utils/jwt.js`) but is not
  yet wired into Socket.IO room access or the frontend Auth pages
- The `authToken` sent by the development client is still hardcoded
  (`dev-token`) and not validated
- Socket-level JWT validation (`auth_service.py`, `test_socket_auth.py`) is
  in progress but not yet enforced end-to-end
- Export (PNG / PDF) has a placeholder `exports/` folder in `backend-node`
  but no implementation yet
- The Python Socket.IO server currently allows all CORS origins
- The eraser draws with the canvas background color; it is not a destructive
  Fabric object eraser
- Undo and redo are local canvas operations and are not synchronised as delete
  or restore events across collaborators
- Co-Artist guides are broadcast but are not persisted in MongoDB
- The frontend currently joins a fixed development room (`abc123`) with a
  temporary session-storage user ID; there is no dynamic room creation or join
  UI yet
- The frontend production build reports a bundle-size warning above 500 kB
- `frontend/src/context/layers-context.js` is a stale duplicate of
  `LayersContext.jsx` and should be deleted
- Most `frontend/src/pages/` folders (`Auth`, `Dashboard`, `Export`,
  `Landing`, `Room`, `Workspace`) are scaffolded but still empty; `Projects`,
  `Settings`, `Members`, and `Templates` don't have a folder yet

---

## Documentation

- `docs/Scaffold_PRD.pdf` — full product requirements, design system, and
  planned v1 scope
- `docs/co-artist-mode1-plan.md` — completed Co-Artist backend design and
  implementation notes
- `docs/project-structure.md` — full annotated directory tree

---

## Maintaining this README

This README should evolve alongside the project.

Whenever you:

- add a feature
- remove a feature
- change the architecture
- add APIs
- modify Socket.IO events
- reorganize folders
- change environment variables
- introduce new dependencies

update this README in the same Pull Request.

Documentation is considered part of the implementation.

---

## License

TBD