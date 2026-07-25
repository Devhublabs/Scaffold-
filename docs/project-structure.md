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
│   │   │   ├── components/
│   │   │   │   └── Canvas.jsx              — main canvas component, brush switching, layer wiring
│   │   │   ├── history/                    — undo/redo stack (planned expansion)
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
│   │   │   ├── templates/                  — manga page/panel templates (planned)
│   │   │   └── tools/                      — planned tool modules
│   │   ├── assets/                         — static assets used within components (planned)
│   │   ├── components/                     — shared UI components
│   │   ├── constants/                      — app-wide constants
│   │   ├── context/
│   │   │   ├── layers-context.js           — stale duplicate of LayersContext.jsx, pending removal
│   │   │   └── LayersContext.jsx           — layer state, addLayer, toggleVisibility, addObjectToLayer
│   │   ├── hooks/                          — custom React hooks
│   │   ├── icons/                          — icon assets
│   │   ├── layouts/                        — shared page layout components
│   │   ├── pages/
│   │   │   ├── Auth/                       — Sign in / Sign up (Davis)
│   │   │   ├── Dashboard/                  — main dashboard (Davis)
│   │   │   ├── Export/                     — PNG/PDF export (Davis)
│   │   │   ├── Landing/                    — public landing page (Davis)
│   │   │   ├── Room/                       — room creation / join (Davis)
│   │   │   └── Workspace/                  — canvas workspace UI markup (Davis)
│   │   │       # Members, Projects, Settings, and Templates are planned
│   │   │       # pages but don't have folders yet
│   │   ├── services/                       — API service wrappers
│   │   ├── socket/
│   │   │   └── socket.js                   — singleton Socket.IO client
│   │   ├── styles/
│   │   │   ├── components/                 — component-scoped stylesheets (planned)
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
│   │   │   ├── auth_service.py             — JWT verification, shared with Socket.IO auth
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
│   │   ├── test_auth_service.py
│   │   ├── test_canvas_persistence.py
│   │   ├── test_canvas_service.py
│   │   ├── test_co_artist_service.py
│   │   ├── test_co_artist_skeleton_api.py
│   │   ├── test_fk.py
│   │   ├── test_proportions_resolver.py
│   │   ├── test_room_service.py
│   │   ├── test_silhouette.py
│   │   ├── test_skeleton_service.py
│   │   ├── test_socket_auth.py
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
│   ├── config/
│   │   ├── cors.js                         — CORS configuration
│   │   └── db.js                           — MongoDB connection setup
│   ├── controllers/
│   │   └── authController.js               — signup / login / me handlers
│   ├── exports/                            — export service (PNG/PDF, planned)
│   ├── middleware/
│   │   └── requireAuth.js                  — JWT-protected route guard
│   ├── models/
│   │   └── User.js                         — Mongoose user model
│   ├── routes/
│   │   └── authRoutes.js                   — /auth/signup, /auth/login, /auth/me
│   ├── services/
│   │   └── authService.js                  — auth business logic (hashing, token issuing)
│   ├── test/
│   │   └── auth.test.js                    — auth flow tests
│   ├── utils/
│   │   └── jwt.js                          — JWT sign/verify helpers
│   ├── app.js                              — Express app setup (middleware, routes)
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
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