import asyncio
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
import pytest
from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parent.parent / ".env")


@pytest.fixture
def auth_token():
    secret = os.getenv("JWT_SECRET", "dev-secret-change-me")

    def _make(user_id, username=None):
        now = datetime.now(timezone.utc)
        return jwt.encode(
            {
                "userId": user_id,
                "username": username or user_id,
                "iat": now,
                "exp": now + timedelta(hours=1),
            },
            secret,
            algorithm="HS256",
        )

    return _make


@pytest.fixture
def wait_until():
    """Async helper that polls `predicate` until it's true or `timeout` elapses.

    Lets integration tests wait on a real delivered condition (e.g. "B received
    N events", "both users are in the room") instead of sleeping a fixed,
    load-sensitive amount of time. Returns True if the predicate became true,
    False on timeout.
    """
    async def _wait(predicate, timeout=3.0, interval=0.02):
        loop = asyncio.get_running_loop()
        deadline = loop.time() + timeout
        while True:
            if predicate():
                return True
            if loop.time() >= deadline:
                return False
            await asyncio.sleep(interval)

    return _wait
