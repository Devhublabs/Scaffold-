import socketio
from fastapi import FastAPI
from app.sockets import register_events

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
app = FastAPI()
socket_app = socketio.ASGIApp(sio, app)

register_events(sio)
