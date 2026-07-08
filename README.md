# Scaffold

> A real-time collaborative drawing platform for manga, comic, and digital artists.

Scaffold is a web application that allows multiple artists to draw on the same canvas simultaneously while communicating through voice chat. Rather than generating artwork with AI, Scaffold focuses on speeding up the creative process by providing collaborative tools, geometry-based shape cleanup, and artist-friendly workflows that preserve each user's unique style.

Built by **DevHub Labs**.

---

# Features

## Drawing

- Mouse, touch and stylus support
- Pressure-sensitive drawing (where supported)
- Multiple brushes
- Eraser
- Layers
- Undo / Redo
- Select & Scale
- Manga page templates

## Collaboration

- Shared drawing rooms
- Live cursor tracking
- Real-time stroke synchronization
- Voice communication
- Auto-save

## Snap-to-Shape

Automatically cleans rough:

- Circles
- Ellipses
- Lines
- Rectangles

using geometry fitting instead of AI.

---

# Tech Stack

## Frontend

- React
- Fabric.js
- Pointer Events API
- Socket.IO Client

## Backend

### Python

- FastAPI
- python-socketio

### Node.js

- Express.js
- JWT Authentication

## Database

- MongoDB

## Voice

- WebRTC (Daily.co / Agora)

---

# Repository Structure

```
Scaffold/
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── canvas/
│       ├── components/
│       ├── pages/
│       ├── layouts/
│       ├── hooks/
│       ├── context/
│       ├── services/
│       ├── socket/
│       ├── utils/
│       ├── styles/
│       └── constants/
│
├── backend-python/
│   ├── api/
│   ├── sockets/
│   ├── rooms/
│   ├── models/
│   ├── database/
│   ├── services/
│   ├── utils/
│   ├── coartist/
│   └── tests/
│
├── backend-node/
│   ├── routes/
│   ├── middleware/
│   ├── controllers/
│   ├── services/
│   ├── utils/
│   ├── config/
│   └── tests/
│
├── docs/
├── assets/
├── scripts/
└── .github/
```

---

# Team Responsibilities

## Obi

Canvas Engine & Real-time Client

Works inside:

```
frontend/src/canvas/
frontend/src/socket/
frontend/src/components/
```

Responsibilities

- Pointer Events
- Pressure-sensitive drawing
- Brushes
- Layers
- Undo / Redo
- Select & Scale
- Snap-to-Shape
- Live cursor rendering
- Socket.IO client integration

---

## Ronald

Backend Real-time Core

Works inside:

```
backend-python/
```

Responsibilities

- Room management
- Real-time synchronization
- Cursor broadcasting
- Stroke broadcasting
- Auto-save
- Voice backend
- Co-Artist backend

---

## Testimony

Node Backend

Works inside:

```
backend-node/
```

Responsibilities

- Authentication
- JWT security
- Export service
- Backend integration

---

## Davis

Frontend UI

Works inside:

```
frontend/src/pages/
frontend/src/components/
frontend/src/styles/
```

Responsibilities

- Landing
- Auth
- Dashboard
- Room Join
- Export

---

## sekibo

Canvas UI & Templates

Works inside:

```
frontend/src/pages/
frontend/src/components/
frontend/src/styles/
frontend/src/canvas/
```

Responsibilities

- Manga page templates
- Canvas workspace UI
- Toolbar
- Layers panel
- Collaborator panel

---

# Creating Files

This repository intentionally contains **folders only** for most feature areas.

Each contributor is responsible for creating their own files inside the appropriate folders.

For example:

- Pages go inside `frontend/src/pages`
- Shared UI goes inside `frontend/src/components`
- Canvas logic goes inside `frontend/src/canvas`
- Socket code goes inside `frontend/src/socket`
- Styles go inside `frontend/src/styles`

Do **not** create files outside your assigned area without discussing it with the team.

---

# Development Workflow

1. Pull the latest changes.
2. Create a feature branch.
3. Build your assigned feature.
4. Commit with clear commit messages.
5. Push your branch.
6. Open a Pull Request.
7. After review, merge into `main`.

---

# Documentation

The complete Product Requirements Document (PRD), design system, architecture, and API contracts are available inside the `docs` folder.

---

# Project Status

🚧 Active Development

Current milestone:

- ✅ React + Fabric.js canvas
- ✅ Basic drawing engine
- ✅ Pointer Events integration
- 🚧 Pressure-sensitive brush
- ⏳ Layers
- ⏳ Collaboration
- ⏳ Voice
- ⏳ Snap-to-Shape

---

# License

TBD
