from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.api.dependencies import require_authenticated_user


def make_credentials(secret: str, user_id: str = "user_A"):
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {
            "userId": user_id,
            "username": "artist",
            "iat": now,
            "exp": now + timedelta(hours=1),
        },
        secret,
        algorithm="HS256",
    )
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


def test_rest_auth_accepts_node_compatible_token(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-secret")

    claims = require_authenticated_user(make_credentials("test-secret"))

    assert claims["userId"] == "user_A"


def test_rest_auth_rejects_missing_credentials():
    with pytest.raises(HTTPException) as exc_info:
        require_authenticated_user(None)

    assert exc_info.value.status_code == 401


def test_rest_auth_reports_missing_server_secret(monkeypatch):
    monkeypatch.delenv("JWT_SECRET", raising=False)

    with pytest.raises(HTTPException) as exc_info:
        require_authenticated_user(make_credentials("test-secret"))

    assert exc_info.value.status_code == 503
