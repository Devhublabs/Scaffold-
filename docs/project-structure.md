# Project structure

This document is the canonical reference for Scaffold's directory structure and must be updated whenever folders or files are added, removed or renamed.

This guide describes the repository layout and the purpose of each major area. It complements [README.md](../README.md) without repeating the project overview.

Whenever files or folders are added, removed, renamed or reorganized, this document must be updated in the same commit or pull request.

## Repository tree

```text
Scaffold/
├── backend-node/
│   ├── app.js
│   ├── config/
│   │   ├── cors.js
│   │   └── db.js
│   ├── controllers/
│   │   └── authController.js
│   ├── Dockerfile
│   ├── exports/
│   ├── middleware/
│   │   └── requireAuth.js
│   ├── models/
│   │   └── User.js
│   ├── package.json
│   ├── package-lock.json
│   ├── routes/
│   │   └── authRoutes.js
│   ├── server.js
│   ├── services/
│   │   └── authService.js
│   ├── test/
│   │   └── auth.test.js
│   └── utils/
│       └── jwt.js
├── backend-python/
│   ├── app/
│   │   ├── api/
│   │   │   ├── co_artist.py
│   │   │   ├── __init__.py
│   │   │   └── voice.py
│   │   ├── database/
│   │   │   └── connection.py
│   │   ├── models/
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── canvas_service.py
│   │   │   ├── co_artist_service.py
│   │   │   ├── room_service.py
│   │   │   ├── skeleton_service.py
│   │   │   ├── voice_service.py
│   │   │   └── skeleton/
│   │   │       ├── fk.py
│   │   │       ├── proportions_resolver.py
│   │   │       ├── rig.py
│   │   │       ├── silhouette.py
│   │   │       └── volumes.py
│   │   ├── sockets/
│   │   │   └── events.py
│   │   └── utils/
│   ├── conftest.py
│   ├── Dockerfile
│   ├── main.py
│   ├── pytest.ini
│   ├── requirements-dev.txt
│   ├── requirements.txt
│   └── tests/
│       ├── test_auth_service.py
│       ├── test_canvas_persistence.py
│       ├── test_canvas_service.py
│       ├── test_co_artist_service.py
│       ├── test_co_artist_skeleton_api.py
│       ├── test_fk.py
│       ├── test_proportions_resolver.py
│       ├── test_room_service.py
│       ├── test_silhouette.py
│       ├── test_skeleton_service.py
│       ├── test_socket_auth.py
│       ├── test_sockets.py
│       └── test_volumes.py
├── docker-compose.yml
├── docs/
│   ├── co-artist-mode1-plan.md
│   ├── project-structure.md
│   └── Scaffold_PRD.pdf
├── frontend/
│   ├── Dockerfile
│   ├── dist/ (generated build output)
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── public/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── assets/
│   │   ├── canvas/
│   │   │   ├── brushes/
│   │   │   │   ├── EraserBrush.js
│   │   │   │   └── PressureBrush.js
│   │   │   ├── components/
│   │   │   │   └── Canvas.jsx
│   │   │   ├── history/
│   │   │   ├── shapes/
│   │   │   │   ├── constants/
│   │   │   │   │   └── ShapeType.js
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
│   │   │   │   │   └── fitUtils.js
│   │   │   │   ├── ShapeFactory.js
│   │   │   │   ├── snapToShape.js
│   │   │   │   └── utils/
│   │   │   ├── templates/
│   │   │   └── tools/
│   │   ├── components/
│   │   ├── constants/
│   │   ├── context/
│   │   │   ├── layers-context.js
│   │   │   └── LayersContext.jsx
│   │   ├── hooks/
│   │   ├── icons/
│   │   ├── layouts/
│   │   ├── main.jsx
│   │   ├── pages/
│   │   │   ├── Auth/
│   │   │   ├── Dashboard/
│   │   │   ├── Export/
│   │   │   ├── Landing/
│   │   │   ├── Room/
│   │   │   └── Workspace/
│   │   ├── services/
│   │   ├── socket/
│   │   │   └── socket.js
│   │   ├── styles/
│   │   │   ├── components/
│   │   │   ├── globals.css
│   │   │   └── variables.css
│   │   └── utils/
│   └── vite.config.js
├── LICENSE
├── README.md
└── structure.txt
```

## Root-level directories

- backend-node/: Node.js service for authentication and export-oriented API work.
- backend-python/: FastAPI service for rooms, canvas persistence, voice, and co-artist support.
- frontend/: React and Vite client with the drawing canvas and application pages.
- docs/: planning documents, architecture notes, and project references.
- docker-compose.yml: local orchestration for the frontend, backend services, and MongoDB.
- README.md: project guide for contributors.
- LICENSE: repository license placeholder.

## Frontend application structure

The frontend lives under [frontend](../frontend) and is organized around a React entry point plus a canvas engine.

### Canvas engine architecture

- frontend/src/canvas/: the core drawing experience.
- frontend/src/canvas/brushes/: brush implementations such as the pressure-sensitive and eraser tools.
- frontend/src/canvas/components/: canvas surface components.
- frontend/src/canvas/history/: history helpers for undo and redo state.
- frontend/src/canvas/shapes/: shape detection, fitting, and shape construction.
  - frontend/src/canvas/shapes/constants/: shape type definitions.
  - frontend/src/canvas/shapes/detectors/: one detector per supported shape.
  - frontend/src/canvas/shapes/fitters/: one fitter per shape plus shared fit helpers.
  - frontend/src/canvas/shapes/utils/: geometry helpers used by detectors and fitters.
- frontend/src/canvas/templates/: page template assets for the drawing workflow.
- frontend/src/canvas/tools/: canvas tool definitions and related modules.

### Pages, components, and UI layers

- frontend/src/pages/: top-level application pages such as Auth, Dashboard, Export, Landing, Room, and Workspace.
- frontend/src/components/: shared UI components used across the application.
- frontend/src/layouts/: layout wrappers for page composition.
- frontend/src/styles/: global styles, shared variables, and component-level CSS.
- frontend/src/icons/: icon assets used by the interface.
- frontend/src/assets/: static images and other assets.
- frontend/src/constants/: shared constants used by the UI and canvas logic.

### Shared utilities and state

- frontend/src/context/: React context providers such as the layers context.
- frontend/src/hooks/: reusable hooks.
- frontend/src/services/: client-side service helpers and API wrappers.
- frontend/src/socket/: Socket.IO client configuration.
- frontend/src/utils/: shared helper utilities used across the app.

## Backend Node structure

The Node service under [backend-node](../backend-node) is focused on authentication and supporting API work.

- backend-node/app.js: entry point for the Node service.
- backend-node/config/: environment-specific configuration for CORS and database access.
- backend-node/controllers/: request handlers, including auth actions.
- backend-node/middleware/: route guards such as authentication middleware.
- backend-node/models/: data models, including the user model.
- backend-node/routes/: Express routes for auth and related endpoints.
- backend-node/services/: service layer for auth and other business logic.
- backend-node/utils/: helper utilities, including JWT helpers.
- backend-node/exports/: export-related implementation area.
- backend-node/test/: tests for the Node service.

## Backend Python structure

The Python service under [backend-python](../backend-python) contains the real-time backend, persistence logic, voice integration, and co-artist services.

- backend-python/app/api/: HTTP-facing API modules for co-artist and voice endpoints.
- backend-python/app/database/: database connection helpers.
- backend-python/app/models/: domain models used by the backend.
- backend-python/app/services/: application services for authentication, canvas state, rooms, skeleton generation, voice, and co-artist workflows.
- backend-python/app/services/skeleton/: helpers for FK rigging, proportions, silhouette, and volume logic.
- backend-python/app/sockets/: Socket.IO event handlers for the realtime layer.
- backend-python/app/utils/: shared helpers for the Python backend.
- backend-python/tests/: unit and integration tests for the backend services.
- backend-python/main.py: FastAPI application entry point.
- backend-python/requirements.txt and backend-python/requirements-dev.txt: Python dependencies.

## Documentation structure

- docs/co-artist-mode1-plan.md: planning notes for the co-artist mode work.
- docs/project-structure.md: the canonical repository structure reference.
- docs/Scaffold_PRD.pdf: product requirements and scope reference.
