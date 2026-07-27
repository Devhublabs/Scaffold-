# Scaffold - Project Structure

Current annotated structure as of July 26, 2026. Update this file when files,
interfaces, or ownership boundaries change.

```text
Scaffold/
|-- frontend/
|   |-- src/
|   |   |-- canvas/
|   |   |   |-- brushes/
|   |   |   |   |-- EraserBrush.js
|   |   |   |   `-- PressureBrush.js
|   |   |   |-- coArtist/
|   |   |   |   `-- createGuideObject.js
|   |   |   |       Fabric renderer for head-unit Co-Artist payloads
|   |   |   |-- components/
|   |   |   |   `-- Canvas.jsx
|   |   |   |       Drawing, socket replay, guide replay, local history
|   |   |   |-- history/
|   |   |   |   `-- planned shared operation history
|   |   |   |-- shapes/
|   |   |   |   |-- constants/
|   |   |   |   |   `-- ShapeType.js
|   |   |   |   |-- detectors/
|   |   |   |   |   |-- arrowDetector.js
|   |   |   |   |   |-- circleDetector.js
|   |   |   |   |   |-- ellipseDetector.js
|   |   |   |   |   |-- lineDetector.js
|   |   |   |   |   |-- polygonDetector.js
|   |   |   |   |   |-- rectangleDetector.js
|   |   |   |   |   |-- speechBubbleDetector.js
|   |   |   |   |   `-- starDetector.js
|   |   |   |   |-- fitters/
|   |   |   |   |   |-- fitArrow.js
|   |   |   |   |   |-- fitCircle.js
|   |   |   |   |   |-- fitEllipse.js
|   |   |   |   |   |-- fitLine.js
|   |   |   |   |   |-- fitPolygon.js
|   |   |   |   |   |-- fitRectangle.js
|   |   |   |   |   |-- fitSpeechBubble.js
|   |   |   |   |   |-- fitStar.js
|   |   |   |   |   |-- fitUtils.js
|   |   |   |   |   `-- fitters.test.js
|   |   |   |   |-- utils/
|   |   |   |   |   |-- angle.js
|   |   |   |   |   |-- boundingBox.js
|   |   |   |   |   |-- distance.js
|   |   |   |   |   |-- geometry.js
|   |   |   |   |   `-- index.js
|   |   |   |   |-- ShapeFactory.js
|   |   |   |   `-- snapToShape.js
|   |   |   |-- templates/
|   |   |   |   `-- planned manga page templates
|   |   |   `-- tools/
|   |   |       `-- planned selection and canvas tools
|   |   |-- components/
|   |   |   `-- CoArtistPanel.jsx
|   |   |-- context/
|   |   |   |-- LayersContext.jsx
|   |   |   `-- layers-context.js
|   |   |       Context definition used by the provider and canvas
|   |   |-- pages/
|   |   |   |-- Auth/
|   |   |   |   `-- AuthPage.jsx
|   |   |   |-- Dashboard/
|   |   |   |   `-- .gitkeep
|   |   |   |-- Export/
|   |   |   |   `-- .gitkeep
|   |   |   |-- Landing/
|   |   |   |   `-- .gitkeep
|   |   |   |-- Room/
|   |   |   |   `-- RoomPage.jsx
|   |   |   `-- Workspace/
|   |   |       `-- WorkspacePage.jsx
|   |   |-- services/
|   |   |   |-- auth.js
|   |   |   `-- coArtist.js
|   |   |-- socket/
|   |   |   `-- socket.js
|   |   |-- styles/
|   |   |   |-- globals.css
|   |   |   |-- variables.css
|   |   |   `-- components/
|   |   |-- App.jsx
|   |   `-- main.jsx
|   |-- Dockerfile
|   |-- eslint.config.js
|   |-- index.html
|   |-- package-lock.json
|   |-- package.json
|   `-- vite.config.js
|-- backend-python/
|   |-- app/
|   |   |-- api/
|   |   |   |-- __init__.py
|   |   |   |-- co_artist.py
|   |   |   |-- dependencies.py
|   |   |   `-- voice.py
|   |   |-- database/
|   |   |   |-- __init__.py
|   |   |   `-- connection.py
|   |   |-- services/
|   |   |   |-- __init__.py
|   |   |   |-- auth_service.py
|   |   |   |-- canvas_service.py
|   |   |   |-- co_artist_service.py
|   |   |   |-- guide_service.py
|   |   |   |-- room_service.py
|   |   |   |-- skeleton_service.py
|   |   |   |-- voice_service.py
|   |   |   `-- skeleton/
|   |   |       |-- __init__.py
|   |   |       |-- fk.py
|   |   |       |-- proportions_resolver.py
|   |   |       |-- rig.py
|   |   |       |-- silhouette.py
|   |   |       `-- volumes.py
|   |   `-- sockets/
|   |       |-- __init__.py
|   |       `-- events.py
|   |-- tests/
|   |   |-- test_api_auth.py
|   |   |-- test_auth_service.py
|   |   |-- test_canvas_persistence.py
|   |   |-- test_canvas_service.py
|   |   |-- test_co_artist_service.py
|   |   |-- test_co_artist_skeleton_api.py
|   |   |-- test_fk.py
|   |   |-- test_guide_service.py
|   |   |-- test_proportions_resolver.py
|   |   |-- test_room_service.py
|   |   |-- test_silhouette.py
|   |   |-- test_skeleton_service.py
|   |   |-- test_socket_auth.py
|   |   |-- test_sockets.py
|   |   `-- test_volumes.py
|   |-- Dockerfile
|   |-- conftest.py
|   |-- main.py
|   |-- pytest.ini
|   |-- requirements-dev.txt
|   `-- requirements.txt
|-- backend-node/
|   |-- config/
|   |   |-- cors.js
|   |   `-- db.js
|   |-- controllers/
|   |   `-- authController.js
|   |-- exports/
|   |   `-- planned PNG/PDF implementation
|   |-- middleware/
|   |   `-- requireAuth.js
|   |-- models/
|   |   `-- User.js
|   |-- routes/
|   |   `-- authRoutes.js
|   |-- services/
|   |   `-- authService.js
|   |-- test/
|   |   `-- auth.test.js
|   |-- utils/
|   |   `-- jwt.js
|   |-- app.js
|   |-- Dockerfile
|   |-- package-lock.json
|   |-- package.json
|   `-- server.js
|-- docs/
|   |-- Scaffold_PRD.pdf
|   |-- co-artist-mode1-plan.md
|   `-- project-structure.md
|-- .env.example
|-- docker-compose.yml
|-- LICENSE
`-- README.md
```

## Ownership

| Owner | Primary paths |
| --- | --- |
| Obi | `frontend/src/canvas/`, `frontend/src/socket/`, `frontend/src/components/` |
| Ronald | `backend-python/` |
| Testimony | `backend-node/` |
| Davis | `frontend/src/pages/`, `frontend/src/styles/` |
