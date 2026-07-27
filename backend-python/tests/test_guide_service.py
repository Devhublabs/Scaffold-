from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

from app.services import guide_service


def _mock_db(find_result=None):
    db = MagicMock()
    db.co_artist_guides.update_one = AsyncMock()

    cursor = MagicMock()
    cursor.sort.return_value = cursor
    cursor.to_list = AsyncMock(
        return_value=find_result if find_result is not None else []
    )
    db.co_artist_guides.find.return_value = cursor
    db._cursor = cursor
    return db


async def test_save_guide_upserts_latest_character_payload(monkeypatch):
    db = _mock_db()
    monkeypatch.setattr(guide_service, "get_database", lambda: db)
    payload = {"characterId": "char_1", "shapes": []}

    await guide_service.save_guide("room1", "user_A", payload)

    db.co_artist_guides.update_one.assert_awaited_once()
    query, update = db.co_artist_guides.update_one.await_args.args
    assert query == {"roomId": "room1", "characterId": "char_1"}
    assert update["$set"]["payload"] == payload
    assert update["$set"]["userId"] == "user_A"
    assert isinstance(update["$set"]["updatedAt"], datetime)
    assert db.co_artist_guides.update_one.await_args.kwargs["upsert"] is True


async def test_get_room_guides_returns_payloads_oldest_first(monkeypatch):
    payloads = [
        {"characterId": "char_1", "shapes": []},
        {"characterId": "char_2", "shapes": []},
    ]
    db = _mock_db(find_result=[{"payload": payload} for payload in payloads])
    monkeypatch.setattr(guide_service, "get_database", lambda: db)

    result = await guide_service.get_room_guides("room1")

    assert result == payloads
    db.co_artist_guides.find.assert_called_once_with(
        {"roomId": "room1"},
        {"_id": 0, "payload": 1},
    )
    db._cursor.sort.assert_called_once_with("updatedAt", 1)
