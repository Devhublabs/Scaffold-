"""Unit tests for the canvas persistence service (step 5).

These mock the Motor collection, so they need neither MongoDB nor a running
server — just pytest + pytest-asyncio. They pin down the document shape written
to Mongo and the query used to read a room's canvas back.
"""
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

pytest.importorskip("motor")  # canvas_service imports the Motor-backed connection

from app.services import canvas_service


def _mock_db(find_result=None):
    """MagicMock standing in for the Motor database handle.

    Mirrors the exact chain canvas_service uses:
      await db.strokes.insert_one(doc)
      db.strokes.find(query, projection).sort(key, direction)
      await cursor.to_list(length=...)
    """
    db = MagicMock()
    db.strokes.insert_one = AsyncMock()

    cursor = MagicMock()
    cursor.sort.return_value = cursor
    cursor.to_list = AsyncMock(return_value=find_result if find_result is not None else [])
    db.strokes.find.return_value = cursor

    db._cursor = cursor  # exposed for assertions
    return db


async def test_save_stroke_writes_expected_document(monkeypatch):
    db = _mock_db()
    monkeypatch.setattr(canvas_service, "get_database", lambda: db)

    await canvas_service.save_stroke("room1", {
        "userId": "user_A",
        "points": [[10, 20], [30, 40]],
        "color": "#abcdef",
        "width": 7,
    })

    db.strokes.insert_one.assert_awaited_once()
    doc = db.strokes.insert_one.await_args.args[0]
    assert doc["roomId"] == "room1"
    assert doc["userId"] == "user_A"
    assert doc["points"] == [[10, 20], [30, 40]]
    assert doc["color"] == "#abcdef"
    assert doc["width"] == 7
    assert isinstance(doc["timestamp"], datetime)


async def test_save_stroke_applies_defaults(monkeypatch):
    db = _mock_db()
    monkeypatch.setattr(canvas_service, "get_database", lambda: db)

    # Only roomId/points supplied — color, width and userId fall back to defaults.
    await canvas_service.save_stroke("room1", {"points": [[0, 0]]})

    doc = db.strokes.insert_one.await_args.args[0]
    assert doc["color"] == "#000000"
    assert doc["width"] == 3
    assert doc["userId"] is None


async def test_get_canvas_state_queries_room_sorted_without_id(monkeypatch):
    saved = [
        {"roomId": "room1", "userId": "user_A", "points": [[1, 1]], "color": "#000000", "width": 3},
    ]
    db = _mock_db(find_result=saved)
    monkeypatch.setattr(canvas_service, "get_database", lambda: db)

    result = await canvas_service.get_canvas_state("room1")

    assert result == saved
    # Filters by room and strips Mongo's _id + the non-serializable timestamp...
    db.strokes.find.assert_called_once_with({"roomId": "room1"}, {"_id": 0, "timestamp": 0})
    # ...and replays oldest-first.
    db._cursor.sort.assert_called_once_with("timestamp", 1)


async def test_get_canvas_state_empty_room_returns_empty_list(monkeypatch):
    db = _mock_db(find_result=[])
    monkeypatch.setattr(canvas_service, "get_database", lambda: db)

    result = await canvas_service.get_canvas_state("ghost_room")
    assert result == []
