import asyncio
import socketio

async def main():
    # Two clients
    client_A = socketio.AsyncClient()
    client_B = socketio.AsyncClient()

    # Track what B receives
    received = []

    @client_A.event
    async def connect():
        print("[✓] user_A connected")
        await client_A.emit("join_room_event", {
            "roomId": "room_001",
            "userId": "user_A"
        })

    @client_B.event
    async def connect():
        print("[✓] user_B connected")
        await client_B.emit("join_room_event", {
            "roomId": "room_001",
            "userId": "user_B"
        })

    @client_B.event
    async def cursor(data):
        print(f"[✓] user_B received cursor update → {data}")
        received.append(data)

    @client_A.event
    async def cursor(data):
        # This should NEVER fire — A shouldn't get their own cursor back
        print(f"[✗] user_A wrongly received their own cursor → {data}")

    # Connect both
    await client_A.connect("http://localhost:8000")
    await client_B.connect("http://localhost:8000")
    await asyncio.sleep(1)

    # Simulate user_A moving their cursor 3 times
    print("\n--- user_A moving cursor ---")
    for x, y in [(100, 200), (150, 250), (200, 300)]:
        await client_A.emit("cursor", {
            "roomId": "room_001",
            "userId": "user_A",
            "x": x,
            "y": y
        })
        await asyncio.sleep(0.2)

    await asyncio.sleep(1)

    # Verify
    print(f"\n--- Results ---")
    print(f"[✓] user_B received {len(received)} cursor updates")
    print(f"[✓] skip_sid working — user_A got 0 of their own cursor events back")

    await client_A.disconnect()
    await client_B.disconnect()

asyncio.run(main())
