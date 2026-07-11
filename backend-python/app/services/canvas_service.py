from datetime import datetime
from app.database.connection import get_database

async def save_stroke(room_id: str, stroke_data: dict):
    db = get_database()
    stroke = {
        "roomId": room_id,
        "userId": stroke_data.get("userId"),
        "points": stroke_data.get("points"),
        "color": stroke_data.get("color", "#000000"),
        "width": stroke_data.get("width", 3),
        "timestamp": datetime.utcnow()
    }
    await db.strokes.insert_one(stroke)
    print(f"[DB] Stroke saved for room {room_id} by {stroke['userId']}")

async def get_canvas_state(room_id: str) -> list:
    db = get_database()
    cursor = db.strokes.find(
        {"roomId": room_id},
        # Drop _id (Mongo internal) and timestamp (a datetime that isn't JSON
        # serializable when emitted over Socket.IO, and not part of the stroke
        # contract). Sorting still works — projection doesn't affect the sort.
        {"_id": 0, "timestamp": 0}
    ).sort("timestamp", 1)  # oldest first so canvas replays in order
    strokes = await cursor.to_list(length=1000)
    print(f"[DB] Fetched {len(strokes)} strokes for room {room_id}")
    return strokes
