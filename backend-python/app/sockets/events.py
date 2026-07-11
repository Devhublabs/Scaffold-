def register_events(sio):

    @sio.event
    async def connect(sid, environ):
        print(f"[CONNECT] {sid}")

    @sio.event
    async def disconnect(sid):
        print(f"[DISCONNECT] {sid}")

    @sio.event
    async def echo(sid, data):
        print(f"[ECHO] from {sid}: {data}")
        await sio.emit("echo", data, to=sid)
