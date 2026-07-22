import os

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.sockets import register_events
from app.api import voice_router, co_artist_router

cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=cors_origins,
)
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(voice_router, prefix="/api")
app.include_router(co_artist_router, prefix="/api")

register_events(sio)

socket_app = socketio.ASGIApp(sio, other_asgi_app=app)
