from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.co_artist_service import extract_proportions
from app.services.skeleton_service import build_skeleton

router = APIRouter()


class CoArtistRequest(BaseModel):
    description: str
    history: list = []


@router.post("/co-artist/proportions")
async def get_proportions(body: CoArtistRequest):
    try:
        result = await extract_proportions(body.description, body.history)
        return result
    except Exception as e:
        print(f"[CO-ARTIST] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class SkeletonRequest(BaseModel):
    proportions: dict
    characterId: str
    angles: dict | None = None


@router.post("/co-artist/skeleton")
async def get_skeleton(body: SkeletonRequest):
    try:
        payload = build_skeleton(body.proportions, body.characterId, body.angles)
        return payload
    except Exception as e:
        print(f"[CO-ARTIST] Error building skeleton: {e}")
        raise HTTPException(status_code=500, detail=str(e))
