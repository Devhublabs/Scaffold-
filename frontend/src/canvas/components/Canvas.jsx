import { useCallback, useEffect, useRef, useState, useContext } from "react";
import * as fabric from "fabric";
import { PressureBrush } from "../brushes/PressureBrush";
import { EraserBrush } from "../brushes/EraserBrush";
import { LayersContext } from "../../context/layers-context";
import socket from "../../socket/socket";

const ROOM_ID = "abc123";
const AUTH_TOKEN = "dev-token";
const CURSOR_COLORS = ["#E8544E", "#3DB88C", "#E6B33D", "#A66DE0", "#3D7EDB", "#E67E3D"];

function getDevUserId() {
  const key = "scaffold-dev-user-id";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;

  const userId = `user_${Math.random().toString(36).slice(2, 7)}`;
  window.sessionStorage.setItem(key, userId);
  return userId;
}

function getCursorColor(userId) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash += userId.charCodeAt(i);
  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
}

function DrawingCanvas() {
  const wrapperRef = useRef(null);
  const canvasElRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const activeLayerIdRef = useRef(null);
  const historyRef = useRef([]);
  const redoRef = useRef([]);
  const [activeTool, setActiveTool] = useState("pencil");
  const [debug, setDebug] = useState({ type: "—", pressure: 0 });
  const [collaborators, setCollaborators] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});
  const userIdRef = useRef(getDevUserId());
  const { addObjectToLayer, removeObjectFromLayers, addLayer, activeLayerId } =
    useContext(LayersContext);

  useEffect(() => {
    activeLayerIdRef.current = activeLayerId;
  }, [activeLayerId]);

  const rememberObject = useCallback((object, layerId) => {
    addObjectToLayer(object, layerId);
    historyRef.current.push({ object, layerId });
    redoRef.current = [];
  }, [addObjectToLayer]);

  const emitStroke = useCallback((object) => {
    const stroke = object?.scaffoldStrokeData;
    if (!stroke?.points?.length) return;

    socket.emit("stroke", {
      type: "stroke",
      roomId: ROOM_ID,
      userId: userIdRef.current,
      points: stroke.points,
      pressures: stroke.pressures,
      color: stroke.color,
      width: stroke.width,
    });
  }, []);

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

  useEffect(() => {
    const computeSize = () => {
      const width = wrapperRef.current.clientWidth;
      const top = wrapperRef.current.getBoundingClientRect().top;
      const height = Math.max(320, Math.round(window.innerHeight - top - 24));
      return { width, height };
    };

    const canvas = new fabric.Canvas(canvasElRef.current, {
      isDrawingMode: true,
      enablePointerEvents: true,
      backgroundColor: "#ffffff",
      ...computeSize(),
    });

    fabricCanvasRef.current = canvas;
    const sketchLayerId = addLayer("Sketch");
    activeLayerIdRef.current = sketchLayerId;

    const upperCanvas = canvas.upperCanvasEl;
    let lastCursorEmitAt = 0;
    const readout = (e) =>
      setDebug({ type: e.pointerType || "—", pressure: e.pressure ?? 0 });
    const emitCursor = (e) => {
      const now = performance.now();
      if (now - lastCursorEmitAt < 16) return;
      lastCursorEmitAt = now;

      const rect = upperCanvas.getBoundingClientRect();
      const scaleX = canvas.getWidth() / rect.width;
      const scaleY = canvas.getHeight() / rect.height;
      const pointer = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
      socket.emit("cursor", {
        type: "cursor",
        roomId: ROOM_ID,
        userId: userIdRef.current,
        x: pointer.x,
        y: pointer.y,
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
      rememberObject(path, activeLayerIdRef.current);
      emitStroke(path);
    });

    const replayStroke = (data) => {
      const object = PressureBrush.objectFromStroke(canvas, data);
      if (!object) return;

      canvas.add(object);
      rememberObject(object, activeLayerIdRef.current);
      canvas.requestRenderAll();
    };

    const handleCanvasState = (data) => {
      const strokes = Array.isArray(data?.strokes) ? data.strokes : [];
      strokes.forEach(replayStroke);
    };

    const handleCursor = (data) => {
      if (!data?.userId || data.userId === userIdRef.current) return;

      setRemoteCursors((prev) => ({
        ...prev,
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

    socket.on("stroke", replayStroke);
    socket.on("canvas_state", handleCanvasState);
    socket.on("cursor", handleCursor);
    socket.on("user_joined", handleUserJoined);

    socket.emit("join_room_event", {
      type: "join-room",
      roomId: ROOM_ID,
      userId: userIdRef.current,
      authToken: AUTH_TOKEN,
    });

    return () => {
      upperCanvas.removeEventListener("pointerdown", readout);
      upperCanvas.removeEventListener("pointermove", readout);
      upperCanvas.removeEventListener("pointermove", emitCursor);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      socket.off("stroke", replayStroke);
      socket.off("canvas_state", handleCanvasState);
      socket.off("cursor", handleCursor);
      socket.off("user_joined", handleUserJoined);
      canvas.dispose();
    };
  }, [addLayer, emitStroke, rememberObject]);

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
    <div className="canvas-frame" ref={wrapperRef}>
      <div style={{ position: "fixed", top: 10, left: 10, zIndex: 10, display: "flex", gap: 8 }}>
        <button onClick={() => setActiveTool("pencil")}>Pencil</button>
        <button onClick={() => setActiveTool("pen")}>Pen</button>
        <button onClick={() => setActiveTool("eraser")}>Eraser</button>
        <button onClick={undo}>Undo</button>
        <button onClick={redo}>Redo</button>
      </div>
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
          style={{ left: cursor.x, top: cursor.y, "--cursor-color": cursor.color }}
        >
          <span>{userId}</span>
        </div>
      ))}
      <div className="pointer-readout">
        {debug.type} · {debug.pressure.toFixed(3)}
      </div>
    </div>
  );
}

export default DrawingCanvas;
