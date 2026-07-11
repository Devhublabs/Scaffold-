from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.voice_service import get_or_create_voice_room, create_voice_token

router = APIRouter()

class VoiceTokenRequest(BaseModel):
    roomId: str
    userId: str

@router.post("/voice/token")
async def get_voice_token(body: VoiceTokenRequest):
    try:
        room_name = await get_or_create_voice_room(body.roomId)
        token = await create_voice_token(room_name, body.userId)
        return {
            "token": token,
            "roomName": room_name,
            "domain": "scaffold-devhublabs"
        }
    except Exception as e:
        print(f"[VOICE] Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create voice token")
