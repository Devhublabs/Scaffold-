"""Integration tests for step 5 — stroke persistence + canvas replay.

Require the full stack running (`docker compose up`): the Python backend on
http://localhost:8000 AND MongoDB, since strokes are persisted and replayed to
late joiners.

    pytest -m integration

Each test uses a unique room id so persisted strokes never collide across runs.
"""
import asyncio
import uuid

import pytest

pytest.importorskip("aiohttp")
socketio = pytest.importorskip("socketio")

SERVER_URL = "http://localhost:8000"


@pytest.mark.integration
async def test_stroke_is_persisted_and_replayed_to_late_joiner():
    room = f"it_persist_{uuid.uuid4().hex[:8]}"

    # First client joins and draws a stroke, then leaves entirely.
    a = socketio.AsyncClient()
    try:
        await a.connect(SERVER_URL)
        await a.emit("join_room_event", {"roomId": room, "userId": "user_A"})
        await asyncio.sleep(0.3)
        await a.emit("stroke", {
            "roomId": room,
            "userId": "user_A",
            "points": [[10, 20], [30, 40]],
            "color": "#123456",
            "width": 5,
        })
        await asyncio.sleep(0.6)  # let the server persist to Mongo
    finally:
        await a.disconnect()

    # A brand-new client joins the same room and should be replayed the stroke.
    b = socketio.AsyncClient()
    got_state = asyncio.Event()
    received = {}

    @b.on("canvas_state")
    async def _on_state(data):
        received["data"] = data
        got_state.set()

    try:
        await b.connect(SERVER_URL)
        await b.emit("join_room_event", {"roomId": room, "userId": "user_B"})
        await asyncio.wait_for(got_state.wait(), timeout=3)
    finally:
        await b.disconnect()

    strokes = received["data"]["strokes"]
    assert len(strokes) >= 1
    latest = strokes[-1]
    assert latest["roomId"] == room
    assert latest["userId"] == "user_A"
    assert latest["points"] == [[10, 20], [30, 40]]
    assert latest["color"] == "#123456"
    assert latest["width"] == 5


@pytest.mark.integration
async def test_stroke_is_broadcast_to_others_but_not_sender():
    room = f"it_stroke_bc_{uuid.uuid4().hex[:8]}"
    a = socketio.AsyncClient()
    b = socketio.AsyncClient()

    b_received = []
    a_received_own = []

    @a.on("stroke")
    async def _on_a(data):
        a_received_own.append(data)  # must not fire — skip_sid excludes the sender

    @b.on("stroke")
    async def _on_b(data):
        b_received.append(data)

    try:
        await a.connect(SERVER_URL)
        await b.connect(SERVER_URL)
        await a.emit("join_room_event", {"roomId": room, "userId": "user_A"})
        await b.emit("join_room_event", {"roomId": room, "userId": "user_B"})
        await asyncio.sleep(0.4)

        await a.emit("stroke", {
            "roomId": room, "userId": "user_A",
            "points": [[1, 2]], "color": "#0a0a0a", "width": 2,
        })
        await asyncio.sleep(0.5)

        assert len(b_received) == 1
        assert b_received[0]["userId"] == "user_A"
        assert b_received[0]["points"] == [[1, 2]]
        assert b_received[0]["color"] == "#0a0a0a"
        assert b_received[0]["width"] == 2
        assert a_received_own == []
    finally:
        await a.disconnect()
        await b.disconnect()
