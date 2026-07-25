from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app.services.auth_service import (
    AuthenticationConfigurationError,
    AuthenticationError,
    verify_auth_token,
)


def make_token(secret: str, user_id: str = "user_A", **overrides) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "userId": user_id,
        "username": "artist",
        "iat": now,
        "exp": now + timedelta(hours=1),
        **overrides,
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def test_verifies_node_compatible_hs256_token(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-secret")

    payload = verify_auth_token(make_token("test-secret"))

    assert payload["userId"] == "user_A"
    assert payload["username"] == "artist"


def test_rejects_token_signed_with_another_secret(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "expected-secret")

    with pytest.raises(AuthenticationError):
        verify_auth_token(make_token("different-secret"))


def test_rejects_expired_token(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-secret")
    now = datetime.now(timezone.utc)
    token = make_token(
        "test-secret",
        iat=now - timedelta(hours=2),
        exp=now - timedelta(hours=1),
    )

    with pytest.raises(AuthenticationError):
        verify_auth_token(token)


def test_rejects_token_without_user_id(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-secret")
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {"username": "artist", "iat": now, "exp": now + timedelta(hours=1)},
        "test-secret",
        algorithm="HS256",
    )

    with pytest.raises(AuthenticationError):
        verify_auth_token(token)


def test_requires_server_secret(monkeypatch):
    monkeypatch.delenv("JWT_SECRET", raising=False)

    with pytest.raises(AuthenticationConfigurationError):
        verify_auth_token(make_token("test-secret"))
