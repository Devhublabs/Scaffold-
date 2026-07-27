from datetime import datetime, timezone

from app.database.connection import get_database


async def save_guide(room_id: str, user_id: str, payload: dict) -> None:
    db = get_database()
    character_id = payload["characterId"]
    await db.co_artist_guides.update_one(
        {
            "roomId": room_id,
            "characterId": character_id,
        },
        {
            "$set": {
                "roomId": room_id,
                "characterId": character_id,
                "userId": user_id,
                "payload": payload,
                "updatedAt": datetime.now(timezone.utc),
            }
        },
        upsert=True,
    )


async def get_room_guides(room_id: str) -> list[dict]:
    db = get_database()
    cursor = db.co_artist_guides.find(
        {"roomId": room_id},
        {"_id": 0, "payload": 1},
    ).sort("updatedAt", 1)
    documents = await cursor.to_list(length=100)
    return [
        document["payload"]
        for document in documents
        if isinstance(document.get("payload"), dict)
    ]
