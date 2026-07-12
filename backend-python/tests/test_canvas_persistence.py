"""Integration tests for step 5 — stroke persistence + canvas replay.

Require the full stack running (`docker compose up`): the Python backend on
http://localhost:8000 AND MongoDB, since strokes are persisted and replayed to
late joiners.

    pytest -m integration

These wait on actual delivered events (via the `wait_until` fixture) rather than
fixed sleeps, so they don't flake under load. Each test uses a unique room id so
persisted strokes never collide across runs.
"""
import uuid

import pytest

pytest.importorskip("aiohttp")
socketio = pytest.importorskip("socketio")

SERVER_URL = "http://localhost:8000"


def _members_listener(store):
    """Handler that records the room membership from each `user_joined` event."""
    async def _on_user_joined(data):
        store["users"] = data.get("users", [])
    return _on_user_joined


@pytest.mark.integration
async def test_stroke_is_persisted_and_replayed_to_late_joiner(wait_until):
    room = f"it_persist_{uuid.uuid4().hex[:8]}"

    a = socketio.AsyncClient()  # draws the stroke
    b = socketio.AsyncClient()  # witness — its receipt proves the DB save finished
    c = socketio.AsyncClient()  # the late joiner

    a_members = {}
    b_got_stroke = []

    a.on("user_joined", _members_listener(a_members))

    @b.on("stroke")
    async def _b_stroke(data):
        b_got_stroke.append(data)

    try:
        await a.connect(SERVER_URL)
        await b.connect(SERVER_URL)
        await a.emit("join_room_event", {"roomId": room, "userId": "user_A"})
        await b.emit("join_room_event", {"roomId": room, "userId": "user_B"})
        assert await wait_until(lambda: set(a_members.get("users", [])) == {"user_A", "user_B"})

        await a.emit("stroke", {
            "roomId": room,
            "userId": "user_A",
            "points": [[10, 20], [30, 40]],
            "color": "#123456",
            "width": 5,
        })
        # The handler saves to Mongo BEFORE broadcasting, so B receiving the
        # stroke deterministically means it is already persisted.
        assert await wait_until(lambda: len(b_got_stroke) >= 1)
    finally:
        await a.disconnect()
        await b.disconnect()

    # A brand-new client joins the same room and should be replayed the stroke.
    c_state = {}

    @c.on("canvas_state")
    async def _c_state(data):
        c_state["data"] = data

    try:
        await c.connect(SERVER_URL)
        await c.emit("join_room_event", {"roomId": room, "userId": "user_C"})
        assert await wait_until(lambda: "data" in c_state)
    finally:
        await c.disconnect()

    strokes = c_state["data"]["strokes"]
    assert len(strokes) >= 1
    latest = strokes[-1]
    assert latest["roomId"] == room
    assert latest["userId"] == "user_A"
    assert latest["points"] == [[10, 20], [30, 40]]
    assert latest["color"] == "#123456"
    assert latest["width"] == 5


@pytest.mark.integration
async def test_stroke_is_broadcast_to_others_but_not_sender(wait_until):
    room = f"it_stroke_bc_{uuid.uuid4().hex[:8]}"
    a = socketio.AsyncClient()
    b = socketio.AsyncClient()

    b_members = {}
    b_received = []
    a_received_own = []

    b.on("user_joined", _members_listener(b_members))

    @a.on("stroke")
    async def _a_stroke(data):
        a_received_own.append(data)  # must never fire — skip_sid excludes the sender

    @b.on("stroke")
    async def _b_stroke(data):
        b_received.append(data)

    try:
        await a.connect(SERVER_URL)
        await b.connect(SERVER_URL)
        await a.emit("join_room_event", {"roomId": room, "userId": "user_A"})
        await b.emit("join_room_event", {"roomId": room, "userId": "user_B"})
        assert await wait_until(lambda: set(b_members.get("users", [])) == {"user_A", "user_B"})

        await a.emit("stroke", {
            "roomId": room, "userId": "user_A",
            "points": [[1, 2]], "color": "#0a0a0a", "width": 2,
        })
        assert await wait_until(lambda: len(b_received) >= 1)

        assert b_received[0]["userId"] == "user_A"
        assert b_received[0]["points"] == [[1, 2]]
        assert b_received[0]["color"] == "#0a0a0a"
        assert b_received[0]["width"] == 2
        assert a_received_own == []
    finally:
        await a.disconnect()
        await b.disconnect()
