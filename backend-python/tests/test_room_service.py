"""Unit tests for the in-memory room registry.

Pure logic — no server, no network, no aiohttp. Runs anywhere with just pytest:

    pytest -m "not integration"
"""
import pytest

from app.services import room_service
from app.services.room_service import (
    get_room_users,
    get_session,
    join_room,
    leave_room,
)


@pytest.fixture(autouse=True)
def clear_rooms():
    # `rooms` is a module-level global; reset it around every test so state
    # from one case never leaks into the next.
    room_service.rooms.clear()
    room_service.sessions.clear()
    yield
    room_service.rooms.clear()
    room_service.sessions.clear()


def test_join_creates_room_and_adds_user():
    join_room("room1", "user_A", "sid_A")
    assert get_room_users("room1") == {"user_A": "sid_A"}
    assert get_session("sid_A") == {
        "roomId": "room1",
        "userId": "user_A",
        "expiresAt": None,
    }


def test_join_multiple_users_same_room():
    join_room("room1", "user_A", "sid_A")
    join_room("room1", "user_B", "sid_B")
    assert get_room_users("room1") == {"user_A": "sid_A", "user_B": "sid_B"}


def test_rejoin_same_user_updates_sid():
    # A reconnect reuses the userId with a fresh sid.
    join_room("room1", "user_A", "sid_old")
    join_room("room1", "user_A", "sid_new")
    assert get_room_users("room1") == {"user_A": "sid_new"}
    assert get_session("sid_old") is None
    assert get_session("sid_new") == {
        "roomId": "room1",
        "userId": "user_A",
        "expiresAt": None,
    }


def test_leave_removes_user_but_keeps_populated_room():
    join_room("room1", "user_A", "sid_A")
    join_room("room1", "user_B", "sid_B")
    departure = leave_room("sid_A")
    assert get_room_users("room1") == {"user_B": "sid_B"}
    assert departure == {
        "roomId": "room1",
        "userId": "user_A",
        "users": ["user_B"],
    }


def test_leave_last_user_deletes_empty_room():
    join_room("room1", "user_A", "sid_A")
    leave_room("sid_A")
    assert "room1" not in room_service.rooms
    assert get_room_users("room1") == {}


def test_leave_unknown_sid_is_noop():
    join_room("room1", "user_A", "sid_A")
    assert leave_room("sid_does_not_exist") is None
    assert get_room_users("room1") == {"user_A": "sid_A"}


def test_get_room_users_unknown_room_returns_empty():
    assert get_room_users("no_such_room") == {}


def test_leave_only_affects_the_matching_room():
    join_room("room1", "user_A", "sid_A")
    join_room("room2", "user_B", "sid_B")
    leave_room("sid_A")
    assert get_room_users("room1") == {}
    assert get_room_users("room2") == {"user_B": "sid_B"}


def test_same_sid_switches_to_a_new_room_without_leaking_membership():
    join_room("room1", "user_A", "sid_A")
    join_room("room2", "user_A", "sid_A")

    assert get_room_users("room1") == {}
    assert get_room_users("room2") == {"user_A": "sid_A"}
    assert get_session("sid_A") == {
        "roomId": "room2",
        "userId": "user_A",
        "expiresAt": None,
    }


def test_join_tracks_token_expiration_for_socket_authorization():
    join_room("room1", "user_A", "sid_A", expires_at=123456)

    assert get_session("sid_A")["expiresAt"] == 123456
