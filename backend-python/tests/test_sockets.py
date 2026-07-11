"""Integration tests for the Socket.IO event handlers.

These require the full stack running (`docker compose up`) with the Python
backend reachable at http://localhost:8000:

    pytest                        # everything (stack must be up)
    pytest -m integration         # only these
    pytest -m "not integration"   # skip these (unit tests need no stack)

They auto-skip if the socket-client deps (aiohttp / python-socketio) aren't
installed, so the unit suite still runs with only pytest present.
"""
import asyncio

import pytest

pytest.importorskip("aiohttp")
socketio = pytest.importorskip("socketio")

SERVER_URL = "http://localhost:8000"


@pytest.mark.integration
async def test_join_room_broadcasts_user_list():
    room = "it_join_room"
    a = socketio.AsyncClient()
    b = socketio.AsyncClient()

    a_joined = asyncio.Event()
    b_last = {}

    @a.on("user_joined")
    async def _on_a(data):
        a_joined.set()

    @b.on("user_joined")
    async def _on_b(data):
        b_last["data"] = data

    try:
        await a.connect(SERVER_URL)
        await a.emit("join_room_event", {"roomId": room, "userId": "user_A"})
        await asyncio.wait_for(a_joined.wait(), timeout=3)

        await b.connect(SERVER_URL)
        await b.emit("join_room_event", {"roomId": room, "userId": "user_B"})
        await asyncio.sleep(0.5)

        # B's join broadcasts the full membership to the room.
        assert b_last.get("data") is not None
        assert set(b_last["data"]["users"]) == {"user_A", "user_B"}
    finally:
        await a.disconnect()
        await b.disconnect()


@pytest.mark.integration
async def test_cursor_broadcasts_to_others_but_not_sender():
    room = "it_cursor_room"
    a = socketio.AsyncClient()
    b = socketio.AsyncClient()

    b_received = []
    a_received_own = []

    @a.on("cursor")
    async def _on_a(data):
        a_received_own.append(data)  # must never fire — skip_sid excludes the sender

    @b.on("cursor")
    async def _on_b(data):
        b_received.append(data)

    try:
        await a.connect(SERVER_URL)
        await b.connect(SERVER_URL)
        await a.emit("join_room_event", {"roomId": room, "userId": "user_A"})
        await b.emit("join_room_event", {"roomId": room, "userId": "user_B"})
        await asyncio.sleep(0.5)

        moves = [(100, 200), (150, 250), (200, 300)]
        for x, y in moves:
            await a.emit("cursor", {"roomId": room, "userId": "user_A", "x": x, "y": y})
        await asyncio.sleep(0.5)

        # B sees every move, in order, with the sender's identity...
        assert len(b_received) == len(moves)
        assert b_received[0]["userId"] == "user_A"
        assert (b_received[0]["x"], b_received[0]["y"]) == (100, 200)
        # ...and A never receives its own cursor back.
        assert a_received_own == []
    finally:
        await a.disconnect()
        await b.disconnect()
