import math
import time

from app.services.auth_service import (
    AuthenticationConfigurationError,
    AuthenticationError,
    verify_auth_token,
)
from app.services.room_service import (
    get_room_users,
    get_session,
    join_room,
    leave_room,
)
from app.services.canvas_service import save_stroke, get_canvas_state
from app.services.guide_service import get_room_guides, save_guide


MAX_STROKE_POINTS = 10000
MAX_GUIDE_SHAPES = 1000


def _is_finite_number(value) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
    )


def _is_identifier(value, max_length: int) -> bool:
    return (
        isinstance(value, str)
        and bool(value.strip())
        and len(value) <= max_length
    )


def _sanitize_stroke(data: dict) -> dict:
    points = data.get("points")
    if (
        not isinstance(points, list)
        or not 1 <= len(points) <= MAX_STROKE_POINTS
    ):
        raise ValueError("points must contain between 1 and 10000 coordinates")

    clean_points = []
    for point in points:
        if (
            not isinstance(point, (list, tuple))
            or len(point) != 2
            or not all(_is_finite_number(value) for value in point)
        ):
            raise ValueError("each point must contain finite x and y numbers")
        clean_points.append([float(point[0]), float(point[1])])

    pressures = data.get("pressures")
    if pressures is None or pressures == []:
        clean_pressures = [0.5] * len(clean_points)
    else:
        if (
            not isinstance(pressures, list)
            or len(pressures) != len(clean_points)
            or not all(_is_finite_number(value) for value in pressures)
        ):
            raise ValueError("pressures must contain one number per point")
        clean_pressures = [
            min(1.0, max(0.0, float(value)))
            for value in pressures
        ]

    color = data.get("color", "#000000")
    if not isinstance(color, str) or not 1 <= len(color) <= 64:
        raise ValueError("color must be a non-empty string")

    width = data.get("width", 3)
    if not _is_finite_number(width) or not 0 < width <= 256:
        raise ValueError("width must be greater than 0 and at most 256")

    return {
        "points": clean_points,
        "pressures": clean_pressures,
        "color": color,
        "width": float(width),
    }


def _validate_guide_payload(payload) -> dict:
    if not isinstance(payload, dict):
        raise ValueError("payload must be an object")

    character_id = payload.get("characterId")
    shapes = payload.get("shapes")
    if not _is_identifier(character_id, 128):
        raise ValueError("payload.characterId is required")
    if not isinstance(shapes, list) or len(shapes) > MAX_GUIDE_SHAPES:
        raise ValueError("payload.shapes must be an array of at most 1000 shapes")

    return payload


def register_events(sio):
    async def emit_error(sid, code, message):
        await sio.emit("error", {"code": code, "message": message}, to=sid)

    async def get_event_session(sid, data):
        session = get_session(sid)
        if not session:
            await emit_error(
                sid,
                "AUTH_REQUIRED",
                "Authenticate and join a room before sending events",
            )
            return None

        expires_at = session.get("expiresAt")
        if expires_at is not None and time.time() >= expires_at:
            await sio.leave_room(sid, session["roomId"])
            departure = leave_room(sid)
            if departure:
                await sio.emit(
                    "user_left",
                    {
                        "userId": departure["userId"],
                        "users": departure["users"],
                    },
                    room=departure["roomId"],
                )
            await emit_error(sid, "INVALID_TOKEN", "Authentication token has expired")
            return None

        if not isinstance(data, dict):
            await emit_error(sid, "INVALID_PAYLOAD", "Event payload must be an object")
            return None

        claimed_room_id = data.get("roomId")
        claimed_user_id = data.get("userId")
        if claimed_room_id is not None and claimed_room_id != session["roomId"]:
            await emit_error(
                sid,
                "SESSION_MISMATCH",
                "Event roomId does not match the authenticated room",
            )
            return None
        if claimed_user_id is not None and claimed_user_id != session["userId"]:
            await emit_error(
                sid,
                "SESSION_MISMATCH",
                "Event userId does not match the authenticated user",
            )
            return None

        return session

    @sio.event
    async def connect(sid, environ):
        del environ
        print(f"[CONNECT] {sid}")

    @sio.event
    async def disconnect(sid):
        departure = leave_room(sid)
        if departure:
            await sio.emit(
                "user_left",
                {
                    "userId": departure["userId"],
                    "users": departure["users"],
                },
                room=departure["roomId"],
                skip_sid=sid,
            )
        print(f"[DISCONNECT] {sid}")

    @sio.event
    async def join_room_event(sid, data):
        if not isinstance(data, dict):
            await emit_error(sid, "INVALID_PAYLOAD", "Join payload must be an object")
            return

        room_id = data.get("roomId")
        user_id = data.get("userId")
        auth_token = data.get("authToken")

        if (
            not _is_identifier(room_id, 80)
            or not _is_identifier(user_id, 128)
            or not isinstance(auth_token, str)
            or not auth_token.strip()
        ):
            await emit_error(
                sid,
                "AUTH_REQUIRED",
                "roomId, userId, and authToken are required",
            )
            return

        try:
            claims = verify_auth_token(auth_token)
        except AuthenticationError as exc:
            await emit_error(sid, "INVALID_TOKEN", str(exc))
            return
        except AuthenticationConfigurationError:
            print("[AUTH] JWT_SECRET is not configured")
            await emit_error(
                sid,
                "AUTH_UNAVAILABLE",
                "Authentication service is unavailable",
            )
            return

        if claims["userId"] != user_id:
            await emit_error(
                sid,
                "IDENTITY_MISMATCH",
                "Token userId does not match the requested userId",
            )
            return

        current_session = get_session(sid)
        if current_session and current_session["roomId"] != room_id:
            await sio.leave_room(sid, current_session["roomId"])
            departure = leave_room(sid)
            if departure:
                await sio.emit(
                    "user_left",
                    {
                        "userId": departure["userId"],
                        "users": departure["users"],
                    },
                    room=departure["roomId"],
                )

        replaced_sid = join_room(
            room_id,
            user_id,
            sid,
            expires_at=claims["exp"],
        )
        if replaced_sid and replaced_sid != sid:
            await sio.leave_room(replaced_sid, room_id)
            await emit_error(
                replaced_sid,
                "SESSION_REPLACED",
                "This user joined from another connection",
            )

        await sio.enter_room(sid, room_id)

        await sio.emit("user_joined", {
            "userId": user_id,
            "users": list(get_room_users(room_id).keys())
        }, room=room_id)

        existing_strokes = await get_canvas_state(room_id)
        if existing_strokes:
            await sio.emit("canvas_state", {
                "strokes": existing_strokes
            }, to=sid)
            print(f"[CANVAS] Sent {len(existing_strokes)} existing strokes to {user_id}")

        existing_guides = await get_room_guides(room_id)
        if existing_guides:
            await sio.emit(
                "co_artist_state",
                {"guides": existing_guides},
                to=sid,
            )

        print(f"[ROOM] Users in {room_id}: {get_room_users(room_id)}")

    @sio.event
    async def cursor(sid, data):
        session = await get_event_session(sid, data)
        if not session:
            return

        x = data.get("x")
        y = data.get("y")

        if not _is_finite_number(x) or not _is_finite_number(y):
            await emit_error(
                sid,
                "INVALID_PAYLOAD",
                "Cursor x and y must be finite numbers",
            )
            return

        await sio.emit("cursor", {
            "userId": session["userId"],
            "x": float(x),
            "y": float(y)
        }, room=session["roomId"], skip_sid=sid)

    @sio.event
    async def stroke(sid, data):
        session = await get_event_session(sid, data)
        if not session:
            return

        try:
            stroke_data = _sanitize_stroke(data)
        except ValueError as exc:
            await emit_error(sid, "INVALID_PAYLOAD", str(exc))
            return

        sanitized_data = {
            **stroke_data,
            "roomId": session["roomId"],
            "userId": session["userId"],
        }
        await save_stroke(session["roomId"], sanitized_data)

        await sio.emit("stroke", {
            "userId": session["userId"],
            **stroke_data,
        }, room=session["roomId"], skip_sid=sid)

    @sio.event
    async def co_artist_shapes(sid, data):
        session = await get_event_session(sid, data)
        if not session:
            return

        try:
            payload = _validate_guide_payload(data.get("payload"))
        except ValueError as exc:
            await emit_error(sid, "INVALID_PAYLOAD", str(exc))
            return

        await save_guide(session["roomId"], session["userId"], payload)

        await sio.emit("co_artist_shapes", {
            "userId": session["userId"],
            "payload": payload
        }, room=session["roomId"], skip_sid=sid)

