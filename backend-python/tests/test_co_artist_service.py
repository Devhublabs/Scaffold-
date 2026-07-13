"""Unit tests for the Co-Artist proportion service (Groq backend).

These mock the HTTP layer, so they need neither a Groq API key nor the network —
just pytest + pytest-asyncio. They pin down that we call Groq's OpenAI-compatible
endpoint with the right auth/shape and parse an OpenAI-style response.
"""
import json

import pytest

from app.services import co_artist_service

# A minimal but valid Co-Artist JSON payload the fake Groq call "returns".
_MODEL_JSON = json.dumps({
    "characterId": None,
    "style": "shoujo",
    "styleConfident": True,
    "clarifyingQuestion": None,
    "proportions": {"bodyHeightInHeads": 7.5},
    "dominantTraits": ["slim", "tall"],
    "suggestedPose": "standing neutral",
    "ambiguities": [],
})


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class _FakeAsyncClient:
    """Stand-in for httpx.AsyncClient that records the outgoing request."""
    last_request = {}

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, url, headers=None, json=None):
        _FakeAsyncClient.last_request = {"url": url, "headers": headers, "json": json}
        # OpenAI-compatible response shape used by Groq.
        return _FakeResponse({"choices": [{"message": {"content": _MODEL_JSON}}]})


@pytest.fixture(autouse=True)
def _patch_http(monkeypatch):
    monkeypatch.setattr(co_artist_service, "GROQ_API_KEY", "test-key")
    monkeypatch.setattr(co_artist_service.httpx, "AsyncClient", _FakeAsyncClient)
    _FakeAsyncClient.last_request = {}
    yield


async def test_calls_groq_endpoint_with_bearer_auth():
    await co_artist_service.extract_proportions("a tall slim girl")

    req = _FakeAsyncClient.last_request
    assert req["url"] == "https://api.groq.com/openai/v1/chat/completions"
    assert req["headers"]["Authorization"] == "Bearer test-key"


async def test_request_body_is_openai_shaped():
    await co_artist_service.extract_proportions("a tall slim girl")

    body = _FakeAsyncClient.last_request["json"]
    assert body["model"] == co_artist_service.GROQ_MODEL
    assert body["response_format"] == {"type": "json_object"}
    # System prompt is carried as the first chat message, description as the last.
    assert body["messages"][0]["role"] == "system"
    assert body["messages"][-1]["role"] == "user"
    assert "a tall slim girl" in body["messages"][-1]["content"]


async def test_history_is_replayed_as_user_assistant_turns():
    history = [{"userInput": "make her taller", "modelOutput": {"style": "shoujo"}}]
    await co_artist_service.extract_proportions("now wider shoulders", history=history)

    msgs = _FakeAsyncClient.last_request["json"]["messages"]
    # system, prior user, prior assistant, new user
    assert msgs[1] == {"role": "user", "content": "make her taller"}
    assert msgs[2]["role"] == "assistant"
    assert json.loads(msgs[2]["content"]) == {"style": "shoujo"}


async def test_parses_openai_response_content():
    result = await co_artist_service.extract_proportions("a tall slim girl")
    assert result["style"] == "shoujo"
    assert result["styleConfident"] is True
