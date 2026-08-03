import { useCallback, useEffect, useRef, useState, useContext } from "react";
import * as fabric from "fabric";
import { PressureBrush } from "../brushes/PressureBrush";
import { EraserBrush } from "../brushes/EraserBrush";
import {
  reviveCanvasObject,
  serializeCanvasObject,
} from "../canvasObjects";
import { CanvasHistory } from "../history/CanvasHistory";
import { createPathCreatedHandler } from "../pathCreatedHandler";
import { TransformManager } from "../transform";
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
  const canvasHistoryRef = useRef(null);
  const transformManagerRef = useRef(null);
  const objectLayerIdsRef = useRef(new WeakMap());
  const activeLayerIdRef = useRef(null);
  const activeToolRef = useRef("pencil");
  const snapEnabledRef = useRef(true);
  const [activeTool, setActiveTool] = useState("pencil");
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [debug, setDebug] = useState({ type: "—", pressure: 0 });
  const [collaborators, setCollaborators] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [transformState, setTransformState] = useState({
    selectedObjects: [],
    activeObject: null,
    isSelecting: false,
    isTransforming: false,
  });
  const userIdRef = useRef(getDevUserId());
  const {
    addObjectToLayer,
    removeObjectFromLayers,
    addLayer,
    activeLayerId,
    setLayers,
  } = useContext(LayersContext);

  useEffect(() => {
    activeLayerIdRef.current = activeLayerId;
  }, [activeLayerId]);

  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  const emitCanvasObject = useCallback((object) => {
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
      minFactor: stroke.minFactor,
      maxFactor: stroke.maxFactor,
      object: serializeCanvasObject(object),
    });
  }, []);

  const syncLayerStackOrder = useCallback(() => {
    const canvasObjects = fabricCanvasRef.current?.getObjects() ?? [];
    const stackIndex = new Map(
      canvasObjects.map((object, index) => [object, index]),
    );

    setLayers((currentLayers) =>
      currentLayers.map((layer) => ({
        ...layer,
        objects: [...(layer.objects ?? [])].sort(
          (left, right) =>
            (stackIndex.get(left) ?? Number.MAX_SAFE_INTEGER) -
            (stackIndex.get(right) ?? Number.MAX_SAFE_INTEGER),
        ),
      })),
    );
  }, [setLayers]);

  const trackObjectInLayer = useCallback(
    (object, layerId) => {
      if (!object || !layerId) return;

      objectLayerIdsRef.current.set(object, layerId);
      addObjectToLayer(object, layerId);
    },
    [addObjectToLayer],
  );

  const rememberObjects = useCallback(
    (objects, layerId) => {
      const canvas = fabricCanvasRef.current;
      const uniqueObjects = [...new Set(objects.filter(Boolean))];
      if (!canvas || !uniqueObjects.length) return;

      uniqueObjects.forEach((object) => {
        trackObjectInLayer(object, layerId);
      });

      canvasHistoryRef.current?.recordAdd(
        uniqueObjects.map((object) => ({
          object,
          layerId,
          stackIndex: canvas.getObjects().indexOf(object),
        })),
      );
    },
    [trackObjectInLayer],
  );

  const rememberObject = useCallback(
    (object, layerId) => {
      rememberObjects([object], layerId);
    },
    [rememberObjects],
  );

  const rememberTransformedObjects = useCallback(
    (objects) => {
      rememberObjects(objects, activeLayerIdRef.current);
    },
    [rememberObjects],
  );

  const rememberDeletedObjects = useCallback(
    (objects, { items = [] } = {}) => {
      const stackIndexByObject = new Map(
        items.map(({ object, stackIndex }) => [object, stackIndex]),
      );
      const historyItems = objects.map((object) => ({
        object,
        layerId: objectLayerIdsRef.current.get(object) ?? null,
        stackIndex: stackIndexByObject.get(object) ?? 0,
      }));

      canvasHistoryRef.current?.recordDelete(historyItems);
      objects.forEach(removeObjectFromLayers);
    },
    [removeObjectFromLayers],
  );

  const undo = () => {
    canvasHistoryRef.current?.undo();
  };

  const redo = () => {
    canvasHistoryRef.current?.redo();
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
    const canvasHistory = new CanvasHistory(canvas, {
      clearSelection: () => {
        if (transformManagerRef.current) {
          transformManagerRef.current.clearSelection();
        } else {
          canvas.discardActiveObject();
        }
      },
      onObjectRestored: ({ object, layerId }) => {
        trackObjectInLayer(object, layerId);
      },
      onObjectRemoved: ({ object }) => {
        removeObjectFromLayers(object);
      },
      onStackOrderChanged: syncLayerStackOrder,
    });
    canvasHistoryRef.current = canvasHistory;
    const transformManager = new TransformManager(canvas, {
      onBeforeTransform: (target) => {
        canvasHistory.beginTransform(target);
      },
      onObjectModified: () => {
        canvasHistory.commitTransform();
      },
      onObjectsAdded: rememberTransformedObjects,
      onObjectsDeleted: rememberDeletedObjects,
      onStackOrderChanged: syncLayerStackOrder,
    });
    transformManagerRef.current = transformManager;
    const unsubscribeTransformState = transformManager.subscribe(
      setTransformState,
    );
    setTransformState(transformManager.getSnapshot());

    const upperCanvas = canvas.upperCanvasEl;
    let lastCursorEmitAt = 0;
    let isDisposed = false;
    let replayQueue = Promise.resolve();
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

    const handlePathCreated = createPathCreatedHandler({
      canvas,
      shouldSnap: () =>
        snapEnabledRef.current && activeToolRef.current !== "eraser",
      getLayerId: () => activeLayerIdRef.current,
      rememberObject,
      emitCanvasObject,
    });
    canvas.on("path:created", handlePathCreated);

    const replayStroke = async (data) => {
      const revivedObject = await reviveCanvasObject(data?.object);
      const object =
        revivedObject ?? PressureBrush.objectFromStroke(canvas, data);

      if (!object || isDisposed) return;

      canvas.add(object);
      rememberObject(object, activeLayerIdRef.current);
      canvas.requestRenderAll();
    };

    const enqueueStrokeReplay = (data) => {
      replayQueue = replayQueue
        .then(() => replayStroke(data))
        .catch(() => {});
    };

    const handleCanvasState = (data) => {
      const strokes = Array.isArray(data?.strokes) ? data.strokes : [];
      strokes.forEach(enqueueStrokeReplay);
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

    socket.on("stroke", enqueueStrokeReplay);
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
      isDisposed = true;
      upperCanvas.removeEventListener("pointerdown", readout);
      upperCanvas.removeEventListener("pointermove", readout);
      upperCanvas.removeEventListener("pointermove", emitCursor);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      canvas.off("path:created", handlePathCreated);
      socket.off("stroke", enqueueStrokeReplay);
      socket.off("canvas_state", handleCanvasState);
      socket.off("cursor", handleCursor);
      socket.off("user_joined", handleUserJoined);
      unsubscribeTransformState();
      canvasHistory.clear();
      canvasHistoryRef.current = null;
      transformManager.dispose();
      transformManagerRef.current = null;
      canvas.dispose();
    };
  }, [
    addLayer,
    emitCanvasObject,
    rememberDeletedObjects,
    rememberObject,
    rememberTransformedObjects,
    removeObjectFromLayers,
    syncLayerStackOrder,
    trackObjectInLayer,
  ]);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    const transformManager = transformManagerRef.current;
    if (!canvas) return;

    if (activeTool === "select") {
      transformManager?.enable();
      return;
    }

    transformManager?.disable();
    canvas.isDrawingMode = true;

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

  const toggleSnap = () => {
    setSnapEnabled((currentValue) => {
      const nextValue = !currentValue;
      snapEnabledRef.current = nextValue;
      return nextValue;
    });
  };

  const hasSelection = transformState.selectedObjects.length > 0;

  return (
    <div className="canvas-frame" ref={wrapperRef}>
      <div
        className="canvas-toolbar"
        role="toolbar"
        aria-label="Canvas controls"
      >
        <button
          type="button"
          className={activeTool === "select" ? "is-active" : ""}
          aria-pressed={activeTool === "select"}
          onClick={() => setActiveTool("select")}
        >
          Select
        </button>
        <button
          type="button"
          className={activeTool === "pencil" ? "is-active" : ""}
          aria-pressed={activeTool === "pencil"}
          onClick={() => setActiveTool("pencil")}
        >
          Pencil
        </button>
        <button
          type="button"
          className={activeTool === "pen" ? "is-active" : ""}
          aria-pressed={activeTool === "pen"}
          onClick={() => setActiveTool("pen")}
        >
          Pen
        </button>
        <button
          type="button"
          className={activeTool === "eraser" ? "is-active" : ""}
          aria-pressed={activeTool === "eraser"}
          onClick={() => setActiveTool("eraser")}
        >
          Eraser
        </button>
        <button type="button" onClick={undo}>
          Undo
        </button>
        <button type="button" onClick={redo}>
          Redo
        </button>
        <span className="canvas-toolbar__separator" aria-hidden="true" />
        <button
          type="button"
          aria-label="Duplicate selection"
          title="Duplicate selection"
          disabled={!hasSelection}
          onClick={() => {
            void transformManagerRef.current?.duplicate();
          }}
        >
          Duplicate
        </button>
        <button
          type="button"
          aria-label="Delete selection"
          title="Delete selection"
          disabled={!hasSelection}
          onClick={() => transformManagerRef.current?.delete()}
        >
          Delete
        </button>
        <button
          type="button"
          aria-label="Bring selection forward"
          title="Bring selection forward"
          disabled={!hasSelection}
          onClick={() => transformManagerRef.current?.bringForward()}
        >
          Forward
        </button>
        <button
          type="button"
          aria-label="Send selection backward"
          title="Send selection backward"
          disabled={!hasSelection}
          onClick={() => transformManagerRef.current?.sendBackward()}
        >
          Backward
        </button>
        <span className="canvas-toolbar__separator" aria-hidden="true" />
        <button
          type="button"
          className={`snap-toggle${snapEnabled ? " is-active" : ""}`}
          role="switch"
          aria-checked={snapEnabled}
          aria-label="Snap to shape"
          title="Snap to shape"
          onClick={toggleSnap}
        >
          <span>Snap</span>
          <span className="snap-toggle__track" aria-hidden="true">
            <span className="snap-toggle__thumb" />
          </span>
        </button>
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
