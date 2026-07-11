import asyncio
import socketio

sio = socketio.AsyncClient()

@sio.event
async def connect():
    print("[✓] Connected")
    await sio.emit("echo", {"message": "hello from test"})

@sio.event
async def echo(data):
    print(f"[✓] Echo received: {data}")
    await sio.disconnect()

@sio.event
async def disconnect():
    print("[✓] Disconnected cleanly")

async def main():
    await sio.connect("http://localhost:8000")
    await sio.wait()

asyncio.run(main())
