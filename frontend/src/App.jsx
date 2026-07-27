import { useState } from "react";

import AuthPage from "./pages/Auth/AuthPage";
import RoomPage from "./pages/Room/RoomPage";
import WorkspacePage from "./pages/Workspace/WorkspacePage";
import {
  clearStoredSession,
  readStoredSession,
  storeSession,
} from "./services/auth";
import "./styles/globals.css";


function readRoomId() {
  return new URLSearchParams(window.location.search).get("room") || "";
}

function App() {
  const [session, setSession] = useState(readStoredSession);
  const [roomId, setRoomId] = useState(readRoomId);

  const authenticate = (nextSession) => {
    storeSession(nextSession);
    setSession(nextSession);
  };

  const logout = () => {
    clearStoredSession();
    setSession(null);
  };

  const joinRoom = (nextRoomId) => {
    const url = new URL(window.location.href);
    url.searchParams.set("room", nextRoomId);
    window.history.replaceState({}, "", url);
    setRoomId(nextRoomId);
  };

  const leaveRoom = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("room");
    window.history.replaceState({}, "", url);
    setRoomId("");
  };

  if (!session?.token || !session?.userId) {
    return <AuthPage onAuthenticated={authenticate} />;
  }

  if (!roomId) {
    return (
      <RoomPage
        initialRoomId={readRoomId()}
        username={session.username}
        onJoin={joinRoom}
        onLogout={logout}
      />
    );
  }

  return (
    <WorkspacePage
      roomId={roomId}
      session={session}
      onLeaveRoom={leaveRoom}
      onLogout={logout}
      onAuthExpired={logout}
    />
  );
}

export default App;
