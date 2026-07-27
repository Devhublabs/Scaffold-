import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import * as fabric from "fabric";

import CoArtistPanel from "../../components/CoArtistPanel";
import { LayersContext } from "../../context/layers-context";
import { createCoArtistGuide } from "../../services/coArtist";
import socket from "../../socket/socket";
import { EraserBrush } from "../brushes/EraserBrush";
import { PressureBrush } from "../brushes/PressureBrush";
import { createGuideObject } from "../coArtist/createGuideObject";


const CURSOR_COLORS = [
  "#E8544E",
  "#3DB88C",
  "#E6B33D",
  "#A66DE0",
  "#3D7EDB",
  "#E67E3D",
];
const AUTH_ERROR_CODES = new Set(["INVALID_TOKEN"]);


function getCursorColor(userId) {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash += userId.charCodeAt(i);
  }
  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
}


function makeCharacterId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `character_${Math.random().toString(36).slice(2, 10)}`;
}


function DrawingCanvas({ roomId, session, onAuthExpired }) {
  const wrapperRef = useRef(null);
  const canvasElRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const activeLayerIdRef = useRef(null);
  const guideLayerIdRef = useRef(null);
  const guideObjectsRef = useRef(new Map());
  const renderGuideRef = useRef(null);
  const historyRef = useRef([]);
  const redoRef = useRef([]);
  const characterIdRef = useRef(makeCharacterId());
  const [activeTool, setActiveTool] = useState("pencil");
  const [debug, setDebug] = useState({ type: "-", pressure: 0 });
  const [collaborators, setCollaborators] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [socketStatus, setSocketStatus] = useState("connecting");
  const [connectionError, setConnectionError] = useState("");
  const [coArtistStatus, setCoArtistStatus] = useState({
    state: "idle",
    message: "",
  });
  const {
    addObjectToLayer,
    removeObjectFromLayers,
    addLayer,
    setActiveLayer,
    activeLayerId,
  } = useContext(LayersContext);

  useEffect(() => {
    activeLayerIdRef.current = activeLayerId;
  }, [activeLayerId]);

  const rememberLocalObject = useCallback(
    (object, layerId) => {
      addObjectToLayer(object, layerId);
      historyRef.current.push({ object, layerId });
      redoRef.current = [];
    },
    [addObjectToLayer],
  );

  const emitStroke = useCallback(
    (object) => {
      const stroke = object?.scaffoldStrokeData;
      if (!stroke?.points?.length) return;

      socket.emit("stroke", {
        roomId,
        userId: session.userId,
        points: stroke.points,
        pressures: stroke.pressures,
        color: stroke.color,
        width: stroke.width,
      });
    },
    [roomId, session.userId],
  );

  const undo = () => {
    const canvas = fabricCanvasRef.current;
    const entry = historyRef.current.pop();
    if (!canvas || !entry) return;

    canvas.remove(entry.object);
    removeObjectFromLayers(entry.object);
    redoRef.current.push(entry);
    canvas.requestRenderAll();
  };

  const redo = () => {
    const canvas = fabricCanvasRef.current;
    const entry = redoRef.current.pop();
    if (!canvas || !entry) return;

    canvas.add(entry.object);
    addObjectToLayer(entry.object, entry.layerId);
    historyRef.current.push(entry);
    canvas.requestRenderAll();
  };

  const generateGuide = useCallback(
    async (description) => {
      setCoArtistStatus({ state: "loading", message: "" });

      try {
        const { analysis, guide } = await createCoArtistGuide({
          description,
          token: session.token,
          characterId: characterIdRef.current,
        });
        if (!renderGuideRef.current) {
          throw new Error("Canvas is not ready");
        }

        renderGuideRef.current(guide, true);
        socket.emit("co_artist_shapes", {
          roomId,
          userId: session.userId,
          payload: guide,
        });

        const message =
          analysis.clarifyingQuestion ||
          `${analysis.style || "Character"} guide added`;
        setCoArtistStatus({ state: "success", message });
      } catch (error) {
        setCoArtistStatus({ state: "error", message: error.message });
      }
    },
    [roomId, session.token, session.userId],
  );

  useEffect(() => {
    const computeSize = () => {
      const viewportPadding = window.innerWidth <= 840 ? 28 : 44;
      const width = Math.min(
        wrapperRef.current.clientWidth,
        window.innerWidth - viewportPadding,
      );
      const top = wrapperRef.current.getBoundingClientRect().top;
      const availableHeight = Math.round(window.innerHeight - top - 24);
      return {
        width,
        height: Math.max(420, Math.min(780, availableHeight)),
      };
    };

    const canvas = new fabric.Canvas(canvasElRef.current, {
      isDrawingMode: true,
      enablePointerEvents: true,
      backgroundColor: "#ffffff",
      ...computeSize(),
    });

    fabricCanvasRef.current = canvas;
    const guideObjects = guideObjectsRef.current;
    const sketchLayerId = addLayer("Sketch");
    const guideLayerId = addLayer("Co-Artist Guides");
    activeLayerIdRef.current = sketchLayerId;
    guideLayerIdRef.current = guideLayerId;
    setActiveLayer(sketchLayerId);

    const renderGuide = (payload, undoable) => {
      const characterId = payload?.characterId;
      if (!characterId) return;

      const existing = guideObjects.get(characterId);
      if (existing) {
        canvas.remove(existing);
        removeObjectFromLayers(existing);
      }

      const object = createGuideObject(payload, canvas);
      if (!object) return;

      canvas.add(object);
      addObjectToLayer(object, guideLayerIdRef.current);
      if (undoable) {
        historyRef.current.push({
          object,
          layerId: guideLayerIdRef.current,
        });
        redoRef.current = [];
      }
      guideObjects.set(characterId, object);
      canvas.requestRenderAll();
    };
    renderGuideRef.current = renderGuide;

    const upperCanvas = canvas.upperCanvasEl;
    let lastCursorEmitAt = 0;
    const readout = (event) =>
      setDebug({
        type: event.pointerType || "-",
        pressure: event.pressure ?? 0,
      });
    const emitCursor = (event) => {
      const now = performance.now();
      if (now - lastCursorEmitAt < 16 || !socket.connected) return;
      lastCursorEmitAt = now;

      const rect = upperCanvas.getBoundingClientRect();
      const scaleX = canvas.getWidth() / rect.width;
      const scaleY = canvas.getHeight() / rect.height;
      socket.emit("cursor", {
        roomId,
        userId: session.userId,
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
      });
    };
    upperCanvas.addEventListener("pointerdown", readout);
    upperCanvas.addEventListener("pointermove", readout);
    upperCanvas.addEventListener("pointermove", emitCursor);

    const handleResize = () => {
      canvas.setDimensions(computeSize());
      canvas.renderAll();
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    canvas.on("path:created", ({ path }) => {
      rememberLocalObject(path, activeLayerIdRef.current);
      emitStroke(path);
    });

    const replayStroke = (data) => {
      const object = PressureBrush.objectFromStroke(canvas, data);
      if (!object) return;

      canvas.add(object);
      addObjectToLayer(object, sketchLayerId);
      canvas.requestRenderAll();
    };

    const handleCanvasState = (data) => {
      const strokes = Array.isArray(data?.strokes) ? data.strokes : [];
      strokes.forEach(replayStroke);
    };

    const handleGuideState = (data) => {
      const guides = Array.isArray(data?.guides) ? data.guides : [];
      guides.forEach((guide) => renderGuide(guide, false));
    };

    const handleGuide = (data) => {
      if (data?.payload) renderGuide(data.payload, false);
    };

    const handleCursor = (data) => {
      if (!data?.userId || data.userId === session.userId) return;

      setRemoteCursors((current) => ({
        ...current,
        [data.userId]: {
          x: data.x,
          y: data.y,
          color: getCursorColor(data.userId),
        },
      }));
    };

    const handleUserJoined = (data) => {
      setCollaborators(Array.isArray(data?.users) ? data.users : []);
    };

    const handleUserLeft = (data) => {
      setCollaborators(Array.isArray(data?.users) ? data.users : []);
      if (!data?.userId) return;
      setRemoteCursors((current) => {
        const next = { ...current };
        delete next[data.userId];
        return next;
      });
    };

    const handleSocketError = (data) => {
      const message = data?.message || "Socket request failed";
      setConnectionError(message);
      if (AUTH_ERROR_CODES.has(data?.code)) onAuthExpired();
    };

    const joinRoom = () => {
      setSocketStatus("connected");
      setConnectionError("");
      socket.emit("join_room_event", {
        roomId,
        userId: session.userId,
        authToken: session.token,
      });
    };

    const handleDisconnect = () => setSocketStatus("disconnected");
    const handleConnectError = (error) => {
      setSocketStatus("disconnected");
      setConnectionError(error.message || "Could not connect");
    };

    socket.on("connect", joinRoom);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("error", handleSocketError);
    socket.on("stroke", replayStroke);
    socket.on("canvas_state", handleCanvasState);
    socket.on("co_artist_state", handleGuideState);
    socket.on("co_artist_shapes", handleGuide);
    socket.on("cursor", handleCursor);
    socket.on("user_joined", handleUserJoined);
    socket.on("user_left", handleUserLeft);

    if (socket.connected) {
      joinRoom();
    } else {
      socket.connect();
    }

    return () => {
      upperCanvas.removeEventListener("pointerdown", readout);
      upperCanvas.removeEventListener("pointermove", readout);
      upperCanvas.removeEventListener("pointermove", emitCursor);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      socket.off("connect", joinRoom);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("error", handleSocketError);
      socket.off("stroke", replayStroke);
      socket.off("canvas_state", handleCanvasState);
      socket.off("co_artist_state", handleGuideState);
      socket.off("co_artist_shapes", handleGuide);
      socket.off("cursor", handleCursor);
      socket.off("user_joined", handleUserJoined);
      socket.off("user_left", handleUserLeft);
      socket.disconnect();
      renderGuideRef.current = null;
      guideObjects.clear();
      canvas.dispose();
    };
  }, [
    addLayer,
    addObjectToLayer,
    emitStroke,
    onAuthExpired,
    rememberLocalObject,
    removeObjectFromLayers,
    roomId,
    session.token,
    session.userId,
    setActiveLayer,
  ]);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (activeTool === "pencil") {
      canvas.freeDrawingBrush = PressureBrush.pencil(canvas);
      canvas.freeDrawingBrush.color = "#000000";
    } else if (activeTool === "pen") {
      canvas.freeDrawingBrush = PressureBrush.pen(canvas);
      canvas.freeDrawingBrush.color = "#000000";
    } else if (activeTool === "eraser") {
      canvas.freeDrawingBrush = new EraserBrush(canvas);
    }
  }, [activeTool]);

  return (
    <div className="workspace-layout">
      <CoArtistPanel onGenerate={generateGuide} status={coArtistStatus} />

      <section className="drawing-surface">
        <div className="canvas-toolbar">
          <div className="segmented-control" aria-label="Drawing tool">
            {["pencil", "pen", "eraser"].map((tool) => (
              <button
                key={tool}
                type="button"
                aria-pressed={activeTool === tool}
                onClick={() => setActiveTool(tool)}
              >
                {tool[0].toUpperCase() + tool.slice(1)}
              </button>
            ))}
          </div>
          <div className="toolbar-actions">
            <button type="button" onClick={undo}>
              Undo
            </button>
            <button type="button" onClick={redo}>
              Redo
            </button>
            <span className={`socket-status ${socketStatus}`}>
              {socketStatus}
            </span>
          </div>
        </div>

        {connectionError && (
          <p className="connection-error">{connectionError}</p>
        )}

        <div className="canvas-frame" ref={wrapperRef}>
          <div className="collaborator-strip">
            {collaborators.map((userId) => (
              <span key={userId}>{userId}</span>
            ))}
          </div>
          <canvas ref={canvasElRef} />
          {Object.entries(remoteCursors).map(([userId, cursor]) => (
            <div
              className="remote-cursor"
              key={userId}
              style={{
                left: cursor.x,
                top: cursor.y,
                "--cursor-color": cursor.color,
              }}
            >
              <span>{userId}</span>
            </div>
          ))}
          <div className="pointer-readout">
            {debug.type} / {debug.pressure.toFixed(3)}
          </div>
        </div>
      </section>
    </div>
  );
}

export default DrawingCanvas;
