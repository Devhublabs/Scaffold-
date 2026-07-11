from app.services.room_service import join_room, leave_room, get_room_users

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

        # Tell everyone in the room someone joined
        await sio.emit("user_joined", {
            "userId": user_id,
            "users": list(get_room_users(room_id).keys())
        }, room=room_id)

        print(f"[ROOM] Users in {room_id}: {get_room_users(room_id)}")
