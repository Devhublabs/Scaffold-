from app.services.room_service import join_room, leave_room, get_room_users
from app.services.canvas_service import save_stroke, get_canvas_state

def register_events(sio):

    @sio.event
    async def connect(sid, environ):
        print(f"[CONNECT] {sid}")

    @sio.event
    async def disconnect(sid):
        leave_room(sid)
        print(f"[DISCONNECT] {sid}")

    @sio.event
    async def join_room_event(sid, data):
        room_id = data.get("roomId")
        user_id = data.get("userId")

        if not room_id or not user_id:
            await sio.emit("error", {"message": "roomId and userId required"}, to=sid)
            return

        join_room(room_id, user_id, sid)
        await sio.enter_room(sid, room_id)

        await sio.emit("user_joined", {
            "userId": user_id,
            "users": list(get_room_users(room_id).keys())
        }, room=room_id)

        existing_strokes = await get_canvas_state(room_id)
        if existing_strokes:
            await sio.emit("canvas_state", {
                "strokes": existing_strokes
            }, to=sid)
            print(f"[CANVAS] Sent {len(existing_strokes)} existing strokes to {user_id}")

        print(f"[ROOM] Users in {room_id}: {get_room_users(room_id)}")

    @sio.event
    async def cursor(sid, data):
        room_id = data.get("roomId")
        user_id = data.get("userId")
        x = data.get("x")
        y = data.get("y")

        if not all([room_id, user_id, x is not None, y is not None]):
            return

        await sio.emit("cursor", {
            "userId": user_id,
            "x": x,
            "y": y
        }, room=room_id, skip_sid=sid)

    @sio.event
    async def stroke(sid, data):
        room_id = data.get("roomId")
        user_id = data.get("userId")

        if not room_id or not user_id:
            return

        await save_stroke(room_id, data)

        await sio.emit("stroke", {
            "userId": user_id,
            "points": data.get("points"),
            "color": data.get("color", "#000000"),
            "width": data.get("width", 3),
            "pressures": data.get("pressures", [])
        }, room=room_id, skip_sid=sid)

    @sio.event
    async def co_artist_shapes(sid, data):
        room_id = data.get("roomId")
        user_id = data.get("userId")

        if not room_id or not user_id:
            return

        # Broadcast the shapes payload to everyone else in the room
        await sio.emit("co_artist_shapes", {
            "userId": user_id,
            "payload": data.get("payload")
        }, room=room_id, skip_sid=sid)

