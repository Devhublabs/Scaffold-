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

        if not room_id or not user_id or not auth_token:
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

        print(f"[ROOM] Users in {room_id}: {get_room_users(room_id)}")

    @sio.event
    async def cursor(sid, data):
        session = await get_event_session(sid, data)
        if not session:
            return

        x = data.get("x")
        y = data.get("y")

        if x is None or y is None:
            return

        await sio.emit("cursor", {
            "userId": session["userId"],
            "x": x,
            "y": y
        }, room=session["roomId"], skip_sid=sid)

    @sio.event
    async def stroke(sid, data):
        session = await get_event_session(sid, data)
        if not session:
            return

        sanitized_data = {
            **data,
            "roomId": session["roomId"],
            "userId": session["userId"],
        }
        await save_stroke(session["roomId"], sanitized_data)

        await sio.emit("stroke", {
            "userId": session["userId"],
            "points": data.get("points"),
            "color": data.get("color", "#000000"),
            "width": data.get("width", 3),
            "pressures": data.get("pressures", [])
        }, room=session["roomId"], skip_sid=sid)

    @sio.event
    async def co_artist_shapes(sid, data):
        session = await get_event_session(sid, data)
        if not session:
            return

        await sio.emit("co_artist_shapes", {
            "userId": session["userId"],
            "payload": data.get("payload")
        }, room=session["roomId"], skip_sid=sid)

