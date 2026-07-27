import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field

from app.api.dependencies import bearer_scheme, require_authenticated_user
from app.services.voice_service import get_or_create_voice_room, create_voice_token

router = APIRouter()
logger = logging.getLogger(__name__)

class VoiceTokenRequest(BaseModel):
    roomId: str = Field(min_length=1, max_length=80)

@router.post("/voice/token")
async def get_voice_token(
    body: VoiceTokenRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    claims = require_authenticated_user(credentials)
    try:
        room_name = await get_or_create_voice_room(body.roomId)
        token = await create_voice_token(room_name, claims["userId"])
        return {
            "token": token,
            "roomName": room_name,
            "domain": "scaffold-devhublabs"
        }
    except Exception as exc:
        logger.exception("Failed to create Daily voice token")
        raise HTTPException(
            status_code=502,
            detail="Failed to create voice token",
        ) from exc
