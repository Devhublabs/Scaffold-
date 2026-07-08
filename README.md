# Scaffold

Real-time collaborative drawing web app for manga/comic artists — draw together live, with geometry-based shape cleanup that preserves your own linework. No AI-generated art.

Built by [DevHub Labs](https://github.com/Devhublabs).

## What it does

Multiple artists draw on the same canvas at the same time, from mouse, touch, or stylus, and talk to each other by voice while they work. Rough shapes (circles, lines, rectangles) snap into clean versions of your own stroke — no AI generating new art, just geometry cleanup. Your style stays yours.

## Why

Manga/comic art involves a lot of slow, invisible prep work — construction shapes, proportion guides, panel layout — before real linework starts. Most "AI drawing tools" solve this by generating finished art for you, which kills originality. Scaffold only touches structure, never style.

## Tech Stack

**Frontend:** React, Fabric.js, Pointer Events API, Socket.io client
**Backend:** FastAPI (Python) for real-time sync, Node.js/Express for auth + export
**Database:** MongoDB
**Voice:** WebRTC (Daily.co / Agora)

## Project Structure

See `/docs` for the full PRD, including features, design system, and backend API contract.
frontend/          — React app (canvas, UI, screens)
backend-python/     — Real-time sync, rooms, Co-Artist backend
backend-node/       — Auth, security, export service
docs/               — Full PRD and design references
## Status

🚧 In active development — v1 in progress. Not production-ready.

## Team

Built by DevHub Labs.

## License

TBD
