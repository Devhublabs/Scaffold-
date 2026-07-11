import os
import httpx
from datetime import datetime, timezone, timedelta

DAILY_API_KEY = os.getenv("DAILY_API_KEY")
DAILY_BASE_URL = "https://api.daily.co/v1"

HEADERS = {
    "Authorization": f"Bearer {DAILY_API_KEY}",
    "Content-Type": "application/json"
}

async def get_or_create_voice_room(room_id: str) -> str:
    room_name = f"scaffold-{room_id}"

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{DAILY_BASE_URL}/rooms/{room_name}",
            headers=HEADERS
        )

        if response.status_code == 200:
            print(f"[VOICE] Room {room_name} already exists")
            return room_name

        response = await client.post(
            f"{DAILY_BASE_URL}/rooms",
            headers=HEADERS,
            json={
                "name": room_name,
                "properties": {
                    "enable_chat": False,
                    "enable_screenshare": False,
                    "start_audio_off": False
                }
            }
        )
        response.raise_for_status()
        print(f"[VOICE] Created room {room_name}")
        return room_name

async def create_voice_token(room_name: str, user_id: str) -> str:
    # Unix timestamp 1 hour from now
    exp = int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp())

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{DAILY_BASE_URL}/meeting-tokens",
            headers=HEADERS,
            json={
                "properties": {
                    "room_name": room_name,
                    "user_name": user_id,
                    "exp": exp
                }
            }
        )
        print(f"[VOICE] Token response: {response.status_code} {response.text}")
        response.raise_for_status()
        token = response.json()["token"]
        print(f"[VOICE] Token issued for {user_id} in {room_name}")
        return token
