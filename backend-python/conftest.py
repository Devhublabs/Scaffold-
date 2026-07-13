import asyncio

import pytest


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
