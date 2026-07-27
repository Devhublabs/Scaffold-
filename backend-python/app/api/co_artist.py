import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field

from app.api.dependencies import bearer_scheme, require_authenticated_user
from app.services.co_artist_service import extract_proportions
from app.services.skeleton_service import build_skeleton

router = APIRouter()
logger = logging.getLogger(__name__)


class CoArtistRequest(BaseModel):
    description: str = Field(min_length=1, max_length=2000)
    history: list[dict] = Field(default_factory=list, max_length=20)


@router.post("/co-artist/proportions")
async def get_proportions(
    body: CoArtistRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    require_authenticated_user(credentials)
    try:
        result = await extract_proportions(body.description, body.history)
        return result
    except RuntimeError as exc:
        logger.warning("Co-Artist is unavailable: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
        logger.exception("Co-Artist proportion extraction failed")
        raise HTTPException(
            status_code=502,
            detail="Failed to extract character proportions",
        ) from exc


class SkeletonRequest(BaseModel):
    proportions: dict
    characterId: str = Field(min_length=1, max_length=128)
    angles: dict[str, float] | None = None


@router.post("/co-artist/skeleton")
async def get_skeleton(
    body: SkeletonRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    require_authenticated_user(credentials)
    try:
        payload = build_skeleton(body.proportions, body.characterId, body.angles)
        return payload
    except (TypeError, ValueError) as exc:
        logger.info("Invalid skeleton request: %s", exc)
        raise HTTPException(
            status_code=422,
            detail="Invalid character proportions or pose angles",
        ) from exc
