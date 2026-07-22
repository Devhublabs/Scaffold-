# Tracks active rooms and who's in them
# Structure: { roomId: { userId: sid } }
rooms: dict[str, dict[str, str]] = {}
sessions: dict[str, dict[str, str]] = {}

def join_room(
    room_id: str,
    user_id: str,
    sid: str,
    expires_at: int | None = None,
):
    current_session = sessions.get(sid)
    if current_session and (
        current_session["roomId"] != room_id
        or current_session["userId"] != user_id
    ):
        leave_room(sid)

    if room_id not in rooms:
        rooms[room_id] = {}

    replaced_sid = rooms[room_id].get(user_id)
    if replaced_sid and replaced_sid != sid:
        sessions.pop(replaced_sid, None)

    rooms[room_id][user_id] = sid
    sessions[sid] = {
        "roomId": room_id,
        "userId": user_id,
        "expiresAt": expires_at,
    }
    print(f"[ROOM] {user_id} joined room {room_id}")
    return replaced_sid

def leave_room(sid: str):
    session = sessions.pop(sid, None)
    if not session:
        return None

    room_id = session["roomId"]
    user_id = session["userId"]
    users = rooms.get(room_id)

    if users and users.get(user_id) == sid:
        del users[user_id]
        print(f"[ROOM] {user_id} left room {room_id}")
        if not users:
            del rooms[room_id]
            print(f"[ROOM] Room {room_id} is now empty, removed")

    return {
        "roomId": room_id,
        "userId": user_id,
        "users": list(get_room_users(room_id).keys()),
    }

def get_room_users(room_id: str) -> dict:
    return rooms.get(room_id, {})

def get_session(sid: str) -> dict | None:
    session = sessions.get(sid)
    return dict(session) if session else None
