from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock

import jwt
import pytest

from app.services import room_service
from app.services.room_service import get_session
from app.sockets import events


class FakeSocketServer:
    def __init__(self):
        self.handlers = {}
        self.emitted = []
        self.entered = []
        self.left = []

    def event(self, handler):
        self.handlers[handler.__name__] = handler
        return handler

    async def emit(self, event, data, **kwargs):
        self.emitted.append({"event": event, "data": data, **kwargs})

    async def enter_room(self, sid, room_id):
        self.entered.append((sid, room_id))

    async def leave_room(self, sid, room_id):
        self.left.append((sid, room_id))


@pytest.fixture(autouse=True)
def clear_room_state():
    room_service.rooms.clear()
    room_service.sessions.clear()
    yield
    room_service.rooms.clear()
    room_service.sessions.clear()


@pytest.fixture
def socket_server(monkeypatch):
    server = FakeSocketServer()
    monkeypatch.setattr(events, "get_canvas_state", AsyncMock(return_value=[]))
    monkeypatch.setattr(events, "get_room_guides", AsyncMock(return_value=[]))
    monkeypatch.setattr(events, "save_stroke", AsyncMock())
    monkeypatch.setattr(events, "save_guide", AsyncMock())
    events.register_events(server)
    return server


def make_token(secret, user_id, expires_in=3600):
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "userId": user_id,
            "username": user_id,
            "iat": now,
            "exp": now + timedelta(seconds=expires_in),
        },
        secret,
        algorithm="HS256",
    )


async def join(server, monkeypatch, sid="sid_A", user_id="user_A", room_id="room1"):
    secret = "test-secret"
    monkeypatch.setenv("JWT_SECRET", secret)
    await server.handlers["join_room_event"](
        sid,
        {
            "roomId": room_id,
            "userId": user_id,
            "authToken": make_token(secret, user_id),
        },
    )


async def test_join_binds_verified_token_identity_to_sid(socket_server, monkeypatch):
    await join(socket_server, monkeypatch)

    session = get_session("sid_A")
    assert session["userId"] == "user_A"
    assert session["roomId"] == "room1"
    assert session["expiresAt"] > 0
    assert socket_server.entered == [("sid_A", "room1")]


async def test_join_rejects_token_identity_mismatch(socket_server, monkeypatch):
    secret = "test-secret"
    monkeypatch.setenv("JWT_SECRET", secret)

    await socket_server.handlers["join_room_event"](
        "sid_A",
        {
            "roomId": "room1",
            "userId": "user_A",
            "authToken": make_token(secret, "user_B"),
        },
    )

    assert get_session("sid_A") is None
    assert socket_server.emitted[-1]["data"]["code"] == "IDENTITY_MISMATCH"


async def test_cursor_rejects_cross_room_and_user_spoofing(
    socket_server,
    monkeypatch,
):
    await join(socket_server, monkeypatch)

    await socket_server.handlers["cursor"](
        "sid_A",
        {
            "roomId": "another-room",
            "userId": "user_B",
            "x": 10,
            "y": 20,
        },
    )

    assert socket_server.emitted[-1]["data"]["code"] == "SESSION_MISMATCH"
    assert not any(item["event"] == "cursor" for item in socket_server.emitted)


async def test_stroke_uses_authenticated_identity(socket_server, monkeypatch):
    await join(socket_server, monkeypatch)

    await socket_server.handlers["stroke"](
        "sid_A",
        {
            "roomId": "room1",
            "userId": "user_A",
            "points": [[1, 2], [3, 4]],
            "color": "#123456",
        },
    )

    saved = events.save_stroke.await_args.args
    assert saved[0] == "room1"
    assert saved[1]["userId"] == "user_A"
    assert saved[1]["roomId"] == "room1"
    assert saved[1]["pressures"] == [0.5, 0.5]


async def test_stroke_rejects_invalid_coordinates(socket_server, monkeypatch):
    await join(socket_server, monkeypatch)

    await socket_server.handlers["stroke"](
        "sid_A",
        {
            "roomId": "room1",
            "userId": "user_A",
            "points": [[1, 2], ["not-a-number", 4]],
        },
    )

    events.save_stroke.assert_not_awaited()
    assert socket_server.emitted[-1]["data"]["code"] == "INVALID_PAYLOAD"


async def test_co_artist_shapes_are_persisted_before_broadcast(
    socket_server,
    monkeypatch,
):
    await join(socket_server, monkeypatch)
    payload = {
        "characterId": "char_1",
        "shapes": [],
    }

    await socket_server.handlers["co_artist_shapes"](
        "sid_A",
        {
            "roomId": "room1",
            "userId": "user_A",
            "payload": payload,
        },
    )

    events.save_guide.assert_awaited_once_with("room1", "user_A", payload)
    broadcast = socket_server.emitted[-1]
    assert broadcast["event"] == "co_artist_shapes"
    assert broadcast["data"]["payload"] == payload


async def test_events_reject_sessions_after_token_expiration(
    socket_server,
    monkeypatch,
):
    await join(socket_server, monkeypatch)
    expires_at = get_session("sid_A")["expiresAt"]
    monkeypatch.setattr(events.time, "time", lambda: expires_at + 1)

    await socket_server.handlers["cursor"](
        "sid_A",
        {"roomId": "room1", "userId": "user_A", "x": 10, "y": 20},
    )

    assert get_session("sid_A") is None
    assert ("sid_A", "room1") in socket_server.left
    assert socket_server.emitted[-1]["data"]["code"] == "INVALID_TOKEN"
