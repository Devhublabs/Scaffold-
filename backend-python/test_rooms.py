import asyncio
import socketio

async def create_client(user_id):
    sio = socketio.AsyncClient()

    @sio.event
    async def connect():
        print(f"[✓] {user_id} connected")
        await sio.emit("join_room_event", {
            "roomId": "room_001",
            "userId": user_id
        })

    @sio.event
    async def user_joined(data):
        print(f"[✓] {user_id} sees: user_joined → {data}")

    await sio.connect("http://localhost:8000")
    return sio

async def main():
    client1 = await create_client("user_A")
    await asyncio.sleep(1)
    client2 = await create_client("user_B")
    await asyncio.sleep(2)

    print("\n--- disconnecting ---")
    await client1.disconnect()
    await client2.disconnect()

asyncio.run(main())
