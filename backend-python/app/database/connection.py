import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongo:27017")
DB_NAME = "scaffold"

# Motor is lazy — no async startup needed, connects on first use
client = AsyncIOMotorClient(MONGO_URI)
print(f"[DB] Motor client initialized → {MONGO_URI}")

def get_database():
    return client[DB_NAME]
