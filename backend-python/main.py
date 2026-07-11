import socketio
from fastapi import FastAPI
from app.sockets import register_events
from app.database.connection import client  # triggers initialization

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
app = FastAPI()
register_events(sio)
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)
