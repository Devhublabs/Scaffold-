import { useState } from "react";


function makeRoomId() {
  const randomPart =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `studio-${randomPart}`;
}


function RoomPage({ initialRoomId = "", username, onJoin, onLogout }) {
  const [roomId, setRoomId] = useState(initialRoomId);

  const submit = (event) => {
    event.preventDefault();
    const normalized = roomId.trim();
    if (normalized) onJoin(normalized);
  };

  const createRoom = () => {
    const generated = makeRoomId();
    setRoomId(generated);
    onJoin(generated);
  };

  return (
    <main className="room-page">
      <section className="room-panel">
        <header>
          <p className="brand">Scaffold</p>
          <h1>Choose a room</h1>
          <div className="room-user-row">
            <p className="muted-text">{username}</p>
            <button type="button" onClick={onLogout}>
              Sign out
            </button>
          </div>
        </header>

        <form onSubmit={submit}>
          <label>
            Room ID
            <input
              value={roomId}
              maxLength="80"
              onChange={(event) => setRoomId(event.target.value)}
              placeholder="studio-name"
              autoFocus
              required
            />
          </label>
          <button className="primary-button" type="submit">
            Join room
          </button>
          <button className="secondary-button" type="button" onClick={createRoom}>
            Create room
          </button>
        </form>
      </section>
    </main>
  );
}

export default RoomPage;
