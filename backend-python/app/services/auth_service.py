import os

import jwt


class AuthenticationError(ValueError):
    """Raised when a client token cannot establish an authenticated identity."""


class AuthenticationConfigurationError(RuntimeError):
    """Raised when the server cannot verify tokens safely."""


def verify_auth_token(token: str) -> dict:
    if not isinstance(token, str) or not token.strip():
        raise AuthenticationError("Authentication token required")

    secret = os.getenv("JWT_SECRET")
    if not secret:
        raise AuthenticationConfigurationError("JWT_SECRET is not configured")

    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={"require": ["exp", "iat", "userId"]},
        )
    except jwt.InvalidTokenError as exc:
        raise AuthenticationError("Invalid or expired authentication token") from exc

    user_id = payload.get("userId")
    if not isinstance(user_id, str) or not user_id:
        raise AuthenticationError("Authentication token has no valid userId")

    username = payload.get("username")
    if username is not None and not isinstance(username, str):
        raise AuthenticationError("Authentication token has an invalid username")

    return payload
