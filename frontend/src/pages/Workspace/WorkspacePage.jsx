import DrawingCanvas from "../../canvas/components/Canvas";
import { LayersProvider } from "../../context/LayersContext";


function WorkspacePage({
  roomId,
  session,
  onLeaveRoom,
  onLogout,
  onAuthExpired,
}) {
  const copyRoomLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
  };

  return (
    <main className="workspace-page">
      <header className="workspace-header">
        <div>
          <p className="brand">Scaffold</p>
          <p className="room-name">{roomId}</p>
        </div>
        <div className="workspace-actions">
          <span>{session.username}</span>
          <button type="button" onClick={copyRoomLink}>
            Copy link
          </button>
          <button type="button" onClick={onLeaveRoom}>
            Leave room
          </button>
          <button type="button" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </header>

      <LayersProvider>
        <DrawingCanvas
          roomId={roomId}
          session={session}
          onAuthExpired={onAuthExpired}
        />
      </LayersProvider>
    </main>
  );
}

export default WorkspacePage;
