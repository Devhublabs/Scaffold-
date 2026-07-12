import socketio
from fastapi import FastAPI
from app.sockets import register_events
from app.database.connection import client
from app.api import voice_router, co_artist_router

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
app = FastAPI()

app.include_router(voice_router, prefix="/api")
app.include_router(co_artist_router, prefix="/api")

register_events(sio)

socket_app = socketio.ASGIApp(sio, other_asgi_app=app)
