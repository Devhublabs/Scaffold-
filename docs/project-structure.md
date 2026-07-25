# Scaffold — Project Structure

Full directory tree as of current development state.
Update this file when adding new modules or significant new files.

```
scaffold/
├── frontend/
│   ├── src/
│   │   ├── canvas/
│   │   │   ├── brushes/
│   │   │   │   ├── EraserBrush.js          — eraser (draws in bg color, v1 placeholder)
│   │   │   │   └── PressureBrush.js        — pressure-sensitive brush, pencil/pen factory methods
│   │   │   ├── collaboration/             — placeholder collaboration scaffolding
│   │   │   ├── components/
│   │   │   │   └── Canvas.jsx              — main canvas component, brush switching, layer wiring
│   │   │   ├── constants/                  — placeholder canvas constants
│   │   │   ├── events/                     — placeholder canvas event modules
│   │   │   ├── history/                    — undo/redo stack (planned expansion)
│   │   │   ├── selection/                  — placeholder selection modules
│   │   │   ├── serialization/              — placeholder serialization modules
│   │   │   ├── shapes/
│   │   │   │   ├── constants/
│   │   │   │   │   └── ShapeType.js        — shape type enum
│   │   │   │   ├── detectors/
│   │   │   │   │   ├── arrowDetector.js
│   │   │   │   │   ├── circleDetector.js
│   │   │   │   │   ├── ellipseDetector.js
│   │   │   │   │   ├── lineDetector.js
│   │   │   │   │   ├── polygonDetector.js
│   │   │   │   │   ├── rectangleDetector.js
│   │   │   │   │   ├── speechBubbleDetector.js
│   │   │   │   │   └── starDetector.js
│   │   │   │   ├── fitters/
│   │   │   │   │   ├── fitArrow.js
│   │   │   │   │   ├── fitCircle.js
│   │   │   │   │   ├── fitEllipse.js
│   │   │   │   │   ├── fitLine.js
│   │   │   │   │   ├── fitPolygon.js
│   │   │   │   │   ├── fitRectangle.js
│   │   │   │   │   ├── fitSpeechBubble.js
│   │   │   │   │   ├── fitStar.js
│   │   │   │   │   ├── fitters.test.js
│   │   │   │   │   └── fitUtils.js         — shared geometry helpers
│   │   │   │   ├── utils/
│   │   │   │   │   ├── angle.js
│   │   │   │   │   ├── boundingBox.js
│   │   │   │   │   ├── distance.js
│   │   │   │   │   ├── geometry.js
│   │   │   │   │   └── index.js
│   │   │   │   ├── ShapeFactory.js         — converts fitted geometry into Fabric objects
│   │   │   │   └── snapToShape.js          — orchestrates full snap-to-shape pipeline
│   │   │   ├── templates/                  — manga/comic/storyboard/helpers placeholders
│   │   │   │   ├── comic/
│   │   │   │   ├── helpers/
│   │   │   │   ├── manga/
│   │   │   │   └── storyboard/
│   │   │   └── tools/                      — planned tool modules
│   │   ├── components/                     — shared UI components and placeholder folders
│   │   │   ├── Avatar/
│   │   │   ├── Button/
│   │   │   ├── Card/
│   │   │   ├── Dialog/
│   │   │   ├── Dropdown/
│   │   │   ├── EmptyState/
│   │   │   ├── Input/
│   │   │   ├── Modal/
│   │   │   ├── Spinner/
│   │   │   ├── Tabs/
│   │   │   └── Tooltip/
│   │   ├── constants/                      — app-wide constants
│   │   ├── context/
│   │   │   └── LayersContext.jsx           — layer state, addLayer, toggleVisibility, addObjectToLayer
│   │   ├── hooks/                          — custom React hooks and placeholders
│   │   │   ├── useCanvas.js
│   │   │   ├── useLayers.js
│   │   │   ├── useSnapToShape.js
│   │   │   ├── useSocket.js
│   │   │   └── useUndoRedo.js
│   │   ├── icons/                          — icon assets
│   │   ├── layouts/                        — shared page layout components
│   │   │   ├── AppLayout/
│   │   │   ├── AuthLayout/
│   │   │   └── WorkspaceLayout/
│   │   ├── pages/
│   │   │   ├── Auth/                       — Sign in / Sign up (Davis)
│   │   │   ├── Dashboard/                  — main dashboard (Davis)
│   │   │   ├── Export/                     — PNG/PDF export (Davis)
│   │   │   ├── Help/                       — placeholder page scaffold
│   │   │   ├── Landing/                    — public landing page (Davis)
│   │   │   ├── Members/                    — workspace members (Davis)
│   │   │   ├── NotFound/                   — placeholder page scaffold
│   │   │   ├── Projects/                   — placeholder page scaffold
│   │   │   ├── Room/                       — room creation / join (Davis)
│   │   │   │   ├── components/
│   │   │   │   ├── Create/
│   │   │   │   ├── Invite/
│   │   │   │   ├── Join/
│   │   │   │   └── Settings/
│   │   │   ├── Settings/                   — user settings (Davis)
│   │   │   ├── Templates/                  — manga templates browser (Davis)
│   │   │   └── Workspace/                  — canvas workspace UI markup (Davis)
│   │   │       ├── components/
│   │   │       │   ├── CanvasViewport/
│   │   │       │   ├── CursorOverlay/
│   │   │       │   ├── FloatingMenus/
│   │   │       │   ├── LayersPanel/
│   │   │       │   ├── MembersPanel/
│   │   │       │   ├── Minimap/
│   │   │       │   ├── PropertiesPanel/
│   │   │       │   ├── Sidebar/
│   │   │       │   ├── StatusBar/
│   │   │       │   ├── Toolbar/
│   │   │       │   ├── Topbar/
│   │   │       │   └── VoicePanel/
│   │   │       ├── hooks/
│   │   │       └── utils/
│   │   ├── routes/                         — placeholder route wrappers
│   │   ├── services/                       — API service wrappers
│   │   │   ├── api/
│   │   │   ├── export/
│   │   │   └── storage/
│   │   ├── socket/
│   │   │   └── socket.js                   — singleton Socket.IO client
│   │   ├── styles/
│   │   │   ├── globals.css
│   │   │   └── variables.css               — design system CSS custom properties
│   │   ├── utils/                          — shared utility functions
│   │   ├── App.jsx                         — root component, wraps canvas in LayersProvider
│   │   └── main.jsx                        — React entry point
│   ├── public/                             — static assets (logo, favicon)
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   └── eslint.config.js
│
├── backend-python/
│   ├── app/
│   │   ├── api/
│   │   │   ├── co_artist.py                — Co-Artist REST endpoints (proportions, skeleton)
│   │   │   └── voice.py                    — Daily.co voice token endpoint
│   │   ├── database/
│   │   │   └── connection.py               — MongoDB Motor connection
│   │   ├── models/                         — data models (planned)
│   │   ├── services/
│   │   │   ├── canvas_service.py           — stroke persistence and replay
│   │   │   ├── co_artist_service.py        — Co-Artist orchestration
│   │   │   ├── room_service.py             — in-memory room membership
│   │   │   ├── skeleton_service.py         — skeleton pipeline entry point
│   │   │   ├── voice_service.py            — Daily.co integration
│   │   │   └── skeleton/
│   │   │       ├── fk.py                   — forward kinematics
│   │   │       ├── proportions_resolver.py — Groq response → proportion data
│   │   │       ├── rig.py                  — joint rig definition
│   │   │       ├── silhouette.py           — contour/silhouette generation
│   │   │       └── volumes.py              — body volume construction
│   │   ├── sockets/
│   │   │   └── events.py                   — Socket.IO event handlers
│   │   └── utils/                          — shared Python utilities
│   ├── tests/
│   │   ├── test_canvas_persistence.py
│   │   ├── test_canvas_service.py
│   │   ├── test_co_artist_service.py
│   │   ├── test_co_artist_skeleton_api.py
│   │   ├── test_fk.py
│   │   ├── test_proportions_resolver.py
│   │   ├── test_room_service.py
│   │   ├── test_silhouette.py
│   │   ├── test_skeleton_service.py
│   │   ├── test_sockets.py
│   │   └── test_volumes.py
│   ├── conftest.py
│   ├── Dockerfile
│   ├── main.py                             — FastAPI app + Socket.IO mount point
│   ├── pytest.ini
│   ├── requirements.txt
│   └── requirements-dev.txt
│
├── backend-node/
│   ├── config/                             — configuration modules
│   ├── controllers/                        — route controllers
│   ├── exports/                            — export service (PNG/PDF, planned)
│   ├── middleware/                         — auth middleware (JWT, planned)
│   ├── routes/                             — Express route definitions
│   ├── services/                           — business logic
│   ├── utils/                              — shared utilities
│   ├── Dockerfile
│   ├── package.json
│   └── server.js                           — Express entry point, health check on port 4000
│
├── docs/
│   ├── Scaffold_PRD.pdf                    — full product requirements document
│   ├── co-artist-mode1-plan.md             — Co-Artist backend design and implementation notes
│   └── project-structure.md               — this file
│
├── .env.example                            — environment variable template
├── docker-compose.yml                      — full stack orchestration
├── LICENSE                                 — TBD
└── README.md
```
