# Tracks active rooms and who's in them
# Structure: { roomId: { userId: sid } }
rooms: dict[str, dict[str, str]] = {}

def join_room(room_id: str, user_id: str, sid: str):
    if room_id not in rooms:
        rooms[room_id] = {}
    rooms[room_id][user_id] = sid
    print(f"[ROOM] {user_id} joined room {room_id}")

def leave_room(sid: str):
    for room_id, users in list(rooms.items()):
        for user_id, user_sid in list(users.items()):
            if user_sid == sid:
                del rooms[room_id][user_id]
                print(f"[ROOM] {user_id} left room {room_id}")
                if not rooms[room_id]:
                    del rooms[room_id]
                    print(f"[ROOM] Room {room_id} is now empty, removed")
                return

def get_room_users(room_id: str) -> dict:
    return rooms.get(room_id, {})
