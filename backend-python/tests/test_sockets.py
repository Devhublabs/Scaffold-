"""Integration tests for the Socket.IO event handlers.

These require the full stack running (`docker compose up`) with the Python
backend reachable at http://localhost:8000:

    pytest                        # everything (stack must be up)
    pytest -m integration         # only these
    pytest -m "not integration"   # skip these (unit tests need no stack)

They wait on actual delivered events (via the `wait_until` fixture) rather than
fixed sleeps, so they don't flake under load. They auto-skip if the socket-client
deps (aiohttp / python-socketio) aren't installed.
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
async def test_join_room_broadcasts_user_list(wait_until):
    room = f"it_join_{uuid.uuid4().hex[:8]}"
    a = socketio.AsyncClient()
    b = socketio.AsyncClient()

    b_members = {}
    b.on("user_joined", _members_listener(b_members))

    try:
        await a.connect(SERVER_URL)
        await a.emit("join_room_event", {"roomId": room, "userId": "user_A"})
        await b.connect(SERVER_URL)
        await b.emit("join_room_event", {"roomId": room, "userId": "user_B"})

        # B's join broadcasts the full membership to the room.
        assert await wait_until(lambda: set(b_members.get("users", [])) == {"user_A", "user_B"})
    finally:
        await a.disconnect()
        await b.disconnect()


@pytest.mark.integration
async def test_cursor_broadcasts_to_others_but_not_sender(wait_until):
    room = f"it_cursor_{uuid.uuid4().hex[:8]}"
    a = socketio.AsyncClient()
    b = socketio.AsyncClient()

    b_members = {}
    b_received = []
    a_received_own = []

    b.on("user_joined", _members_listener(b_members))

    @a.on("cursor")
    async def _a_cursor(data):
        a_received_own.append(data)  # must never fire — skip_sid excludes the sender

    @b.on("cursor")
    async def _b_cursor(data):
        b_received.append(data)

    try:
        await a.connect(SERVER_URL)
        await b.connect(SERVER_URL)
        await a.emit("join_room_event", {"roomId": room, "userId": "user_A"})
        await b.emit("join_room_event", {"roomId": room, "userId": "user_B"})
        # Make sure both are actually in the room before moving the cursor.
        assert await wait_until(lambda: set(b_members.get("users", [])) == {"user_A", "user_B"})

        moves = [(100, 200), (150, 250), (200, 300)]
        for x, y in moves:
            await a.emit("cursor", {"roomId": room, "userId": "user_A", "x": x, "y": y})

        # B sees every move...
        assert await wait_until(lambda: len(b_received) >= len(moves))
        assert b_received[0]["userId"] == "user_A"
        assert (b_received[0]["x"], b_received[0]["y"]) == (100, 200)
        # ...and A never receives its own cursor back (skip_sid means the server
        # never emits it to A, so this is settled the moment B has received).
        assert a_received_own == []
    finally:
        await a.disconnect()
        await b.disconnect()
