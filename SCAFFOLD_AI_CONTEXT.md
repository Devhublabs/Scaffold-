# Scaffold — AI Agent Context File

This file gives an AI coding assistant (Claude Code, Codex, etc.) the full
context needed to work on Scaffold immediately without exploration overhead.
Read this entire file before writing or suggesting any code.

---

## What Scaffold Is

Scaffold is a real-time collaborative drawing web app for manga and comic
artists. Multiple users draw on the same canvas simultaneously via mouse,
touch, or stylus. The app handles geometric groundwork (construction shapes,
proportion guides, panel layout) while leaving all actual artistic decisions
to the artist. Nothing in Scaffold generates finished art — it scaffolds
structure, the artist creates the art.

**GitHub:** https://github.com/Devhublabs/Scaffold-
**Team:** DevHub Labs (student team, FUTO Nigeria)
**Slogan:** Manga, together.
**Status:** Active development, v1 in progress

---

## Codebase Orientation

Before anything else, run these to orient yourself:

```bash
# See every file in the project
find . -not -path './node_modules*' -not -path './.git*' -not -path '*/dist/*' -not -path '*/__pycache__/*' -type f | sort

# Read the main README
cat README.md

# Read the full project structure with annotations
cat docs/project-structure.md

# See what's currently in Canvas.jsx (Obi's main file)
cat frontend/src/canvas/components/Canvas.jsx

# See the brush implementations
cat frontend/src/canvas/brushes/PressureBrush.js
cat frontend/src/canvas/brushes/EraserBrush.js

# See the layers context
cat frontend/src/context/LayersContext.jsx

# See the socket client
cat frontend/src/socket/socket.js

# See the snap-to-shape pipeline
cat frontend/src/canvas/shapes/snapToShape.js
cat frontend/src/canvas/shapes/ShapeFactory.js

# See Ronald's socket events
cat backend-python/app/sockets/events.py
cat backend-python/main.py
```

---

## CRITICAL: Fabric.js Import Rule

**This is the single most important thing to get right. Violations cause
silent runtime crashes.**

✅ CORRECT — always use namespace-style import:
```js
import { fabric } from "fabric";
const canvas = new fabric.Canvas(el);
```

❌ WRONG — do NOT use named exports for canvas/brush creation:
```js
import { Canvas, PencilBrush } from "fabric"; // breaks freeDrawingBrush
```

**Exception:** `PressureBrush.js` and `EraserBrush.js` extend `PencilBrush`
directly using named imports — that specific pattern works and must not be
changed. Everything else uses the namespace style.

**Fabric version:** 7.4.0
**Why this matters:** named Canvas import causes `freeDrawingBrush` to return
`undefined`, breaking the entire drawing pipeline with no obvious error.

---

## Tech Stack

### Frontend
- React 19 + Vite
- Fabric.js 7.4.0 (see import rule above)
- Pointer Events API (unified mouse/touch/stylus input)
- Socket.IO Client

### Backend Python (Ronald's domain)
- FastAPI + python-socketio
- Motor (async MongoDB driver)
- Groq API (Co-Artist proportion extraction)
- Daily.co (voice rooms)

### Backend Node (Testimony's domain)
- Express.js
- JWT authentication (fully implemented)
- Export service (PNG/PDF, planned)

### Database
- MongoDB 7

### Infrastructure
- Docker Compose (full stack: `docker compose up --build`)
- Services: frontend :5173, python :8000, node :4000, mongo :27017

---

## What Has Been Built (as of July 2026)

### Canvas engine (Obi — fully working)
- Full-screen Fabric.js canvas with Pointer Events API
- Mouse, touch, and stylus input unified through one event model
- Pressure-sensitive line weight (thinner with less pressure, thicker with more)
- PressureBrush — custom class extending PencilBrush, outline polygon approach
  for variable-width strokes, `static pencil(canvas)` and `static pen(canvas)`
  factory methods
- EraserBrush — extends PencilBrush, reads `canvas.backgroundColor` at stroke
  start (v1 placeholder, not a destructive eraser)
- Brush switching via `activeTool` state + second useEffect watching it
- Draw vs. pan/zoom gesture disambiguation on touch
- Basic palm rejection
- Canvas resizes correctly on window resize and orientation change

### Layers (Obi — fully working)
- `LayersContext.jsx` in `frontend/src/context/` — React Context
- State: `layers` array, `activeLayerId`
- Functions: `addLayer(name)`, `toggleLayerVisibility(id)`,
  `setActiveLayer(id)`, `addObjectToLayer(obj, layerId)`
- Each layer: `{ id, name, visible, objects: [] }`
- Stale closure fix: `activeLayerIdRef = useRef(null)` kept in sync with
  `activeLayerId` via a dedicated useEffect; `path:created` listener reads
  `activeLayerIdRef.current` not the state value directly
- Default "Sketch" layer created on canvas init via `addLayer("Sketch")`
- `App.jsx` wraps `DrawingCanvas` in `<LayersProvider>`
- **Known stale file:** `frontend/src/context/layers-context.js` is a duplicate
  and should be deleted

### Undo / Redo (Obi — fully working)
- Global shared stack (not per-user for v1)
- Local canvas operations only, not synchronised over socket

### Snap-to-Shape (Obi — fully working, recently integrated)
- Detectors for: line, rectangle, circle, ellipse, polygon, arrow,
  speech bubble, star
- Fitters for all 8 shapes + shared `fitUtils.js`
- `ShapeFactory.js` converts fitted geometry into Fabric objects
- `snapToShape.js` orchestrates the full pipeline
- Wired into `path:created` in Canvas.jsx
- Toggleable per user
- Runs entirely client-side, no server call, no AI

### Socket.IO (Obi — fully working)
- Singleton at `frontend/src/socket/socket.js`
- Connects to Python backend at `http://localhost:8000`
  (env: `VITE_SOCKET_URL`)
- Emits: `join_room_event`, `cursor` (throttled), `stroke`
- Listens: `user_joined`, `cursor`, `stroke`, `canvas_state`
- Incoming remote cursors render as labeled colored dots
- Incoming remote strokes replay onto the Fabric canvas
- `canvas_state` replays up to 1,000 persisted strokes on room join

### Python Backend (Ronald — largely complete)
- Room management and Socket.IO event handling
- Stroke persistence in MongoDB + replay on join (`canvas_state` event)
- Voice token endpoint via Daily.co
- Co-Artist: Groq proportion extraction → deterministic skeleton/contour
  generation → `co_artist_shapes` Socket.IO broadcast
- Full pytest suite (unit + integration)
- Docker image ready

### Node Backend (Testimony — auth complete)
- JWT authentication fully implemented
- `authController.js`, `authService.js`, `authRoutes.js`
- `requireAuth.js` middleware
- `User.js` model
- `jwt.js` utility
- `test/auth.test.js`
- Export service not yet implemented

---

## What Is NOT Done Yet

### Obi's remaining work
- **Select & Scale** — Fabric.js built-in object transforms; user selects a
  drawn object and gets resize handles
- **Manga panel/page templates** — pre-drawn border shapes on canvas for
  standard manga layouts (A4, double page, 4-koma, webtoon, etc.)
- **Toolbar UI** — brush switching, colour picker, size slider, snap toggle,
  undo/redo buttons all need real UI (currently temporary text buttons)
- **Layer visibility UI** — LayersContext supports it but no UI exists
- **Co-Artist shape rendering** — socket listens for `co_artist_shapes` but
  doesn't render them on canvas yet
- **Replace dev placeholders:**
  - `roomId` hardcoded as `abc123`
  - `userId` generated as `user_xxxxx` in sessionStorage
  - `authToken` is `dev-token`
  These need real values once Testimony's auth is integrated

### Testimony's remaining work
- Export service (PNG/PDF)
- Frontend auth integration (swap dev placeholders for real JWT flow)

### Davis's work (all in progress)
- 10 frontend pages in HTML/CSS:
  Landing, Dashboard, Projects, Export, Settings, Members,
  Auth, Room Creation/Join, Templates, Canvas Workspace UI markup
- All pages go in `frontend/src/pages/` in their own subfolder

### Not in v1 scope (do not add)
- Redis
- Per-user undo isolation
- AI-generated finished artwork
- Native mobile app
- Blockchain / decentralization
- Per-user isolated undo

---

## Socket.IO Data Contract

**Do not change field names without updating both frontend and Python backend.**

```json
// stroke (client → server → other clients)
{
  "roomId": "abc123",
  "userId": "user_5",
  "points": [[x, y], [x, y]],
  "pressures": [0.4, 0.6],
  "color": "#000000",
  "width": 3
}

// cursor (client → server → other clients, throttled ~16ms)
{
  "roomId": "abc123",
  "userId": "user_5",
  "x": 240,
  "y": 118
}

// join-room (client → server)
{
  "roomId": "abc123",
  "userId": "user_5",
  "authToken": "dev-token"
}
```

`pressures` is a parallel array to `points` — one value per point, same order.
If `pressures` is missing from an incoming stroke, fall back to `0.5` per point.

---

## Design System (locked — do not change)

```css
:root {
  --bg: #16171C;           /* main background */
  --panel: #1F2128;        /* toolbar, sidebar, panel backgrounds */
  --border: #2E313A;       /* dividers, outlines */
  --text-primary: #F2F2F0; /* main text */
  --text-muted: #8B8D96;   /* secondary text, labels */
  --accent: #3D7EDB;       /* buttons, active states, links */
  --accent-hover: #5A93E6;
  --radius: 6px;
  --font: 'Inter', system-ui, sans-serif;
}
```

Collaborator cursor colors (cycle through, one per user):
`#E8544E` `#3DB88C` `#E6B33D` `#A66DE0` `#3D7EDB` `#E67E3D`

---

## Code Ownership

Do not modify files outside the assigned owner's area without discussing first.

| Owner | Paths |
| --- | --- |
| Obi | `frontend/src/canvas/`, `frontend/src/socket/`, `frontend/src/components/` |
| Ronald | `backend-python/` |
| Testimony | `backend-node/` |
| Davis | `frontend/src/pages/`, `frontend/src/styles/` |

---

## Engineering Principles

These are the decisions behind the architecture. Respect them when suggesting
changes.

- **No AI-generated art** — snap-to-shape and Co-Artist are geometry/structure
  only; finished artwork is always the artist's own
- **Deterministic Co-Artist** — same input always produces same output;
  no randomness in construction guides
- **Canvas rendering isolated from geometry** — detectors and fitters have zero
  Fabric.js knowledge; ShapeFactory is the only place geometry becomes a Fabric
  object
- **Real-time first** — local strokes render immediately before server confirms
- **Separation of concerns** — geometry, rendering, transport, and UI state
  are separate layers with clean interfaces between them
- **Stale closure awareness** — any value read inside a `useEffect` with `[]`
  that might change over time must be accessed via a `useRef`, not the state
  directly (see `activeLayerIdRef` pattern in Canvas.jsx)

---

## Known Issues / Gotchas

- `frontend/src/context/layers-context.js` is a stale duplicate of
  `LayersContext.jsx` — delete it
- `frontend/dist/` is committed to the repo and should be in `.gitignore`
- The eraser is a v1 placeholder — it draws in the canvas background color,
  it does not delete Fabric objects
- Undo/redo are local only — not synchronised across collaborators
- Co-Artist guides are broadcast but not persisted in MongoDB
- The Python Socket.IO server allows all CORS origins (development only)
- Frontend production build has a bundle-size warning above 500kB
- `authToken` is not validated by the Python server yet (development only)

---

## How to Run

```bash
# Full stack (recommended)
docker compose up --build

# Frontend only
cd frontend && npm install && npm run dev

# Python backend only
cd backend-python
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
MONGO_URI=mongodb://localhost:27017/scaffold uvicorn main:socket_app --reload --host 0.0.0.0 --port 8000

# Node backend only
cd backend-node && npm install && npm run dev
```

---

## Current Task Context

**Who you are helping:** Obi — canvas engine and real-time client owner.
React beginner, learning as he builds. Prefers to understand code before
writing it. Does not want vibe-coded solutions he doesn't understand.

**Preferred working style:**
- Explain the approach/mental model before suggesting code
- Ask before making large structural changes
- Flag when something touches another team member's ownership area
- When Obi writes code and it has a bug, explain why it's wrong before
  suggesting the fix — don't just replace it

**What was just completed:**
- Snap-to-Shape fully integrated into Canvas.jsx and working

**What to work on next (in order):**
1. Select & Scale (Fabric.js object transforms)
2. Manga panel/page templates
3. Toolbar UI (colour picker, brush size slider, tool icons, snap toggle)
4. Layer visibility UI
5. Co-Artist shape rendering on canvas
6. Replace dev placeholders with real auth/room values once Testimony's
   integration is ready
