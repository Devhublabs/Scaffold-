import { useEffect, useRef, useState } from "react";
import { Canvas } from "fabric";
import { PressureBrush } from "../canvas/PressureBrush";

function DrawingCanvas() {
  const wrapperRef = useRef(null);
  const canvasElRef = useRef(null);
  const fabricCanvasRef = useRef(null);

  // Raw device pointer values, shown as an on-screen dev readout.
  const [debug, setDebug] = useState({ type: "—", pressure: 0 });

  useEffect(() => {
    // Size the canvas to fill the width of its frame and the remaining viewport
    // height below it, so it adapts to phones and orientation changes.
    const computeSize = () => {
      const width = wrapperRef.current.clientWidth;
      const top = wrapperRef.current.getBoundingClientRect().top;
      const height = Math.max(320, Math.round(window.innerHeight - top - 24));
      return { width, height };
    };

    const canvas = new Canvas(canvasElRef.current, {
      isDrawingMode: true,
      // Unified Pointer Events path: mouse/touch/stylus all draw through one
      // handler, and the brush receives real PointerEvents (with pressure).
      enablePointerEvents: true,
      backgroundColor: "#ffffff",
      ...computeSize(),
    });

    const brush = new PressureBrush(canvas);
    brush.color = "#b82a2a";
    brush.width = 3;
    canvas.freeDrawingBrush = brush;

    fabricCanvasRef.current = canvas;

    // Passive readout of the RAW event values (not the brush's normalized
    // pressure) so we can see exactly what a phone/stylus reports. Dev aid.
    const upperCanvas = canvas.upperCanvasEl;
    const readout = (e) =>
      setDebug({ type: e.pointerType || "—", pressure: e.pressure ?? 0 });
    upperCanvas.addEventListener("pointerdown", readout);
    upperCanvas.addEventListener("pointermove", readout);

    const handleResize = () => {
      canvas.setDimensions(computeSize());
      canvas.renderAll();
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      upperCanvas.removeEventListener("pointerdown", readout);
      upperCanvas.removeEventListener("pointermove", readout);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      canvas.dispose();
    };
  }, []);

  return (
    <div className="canvas-frame" ref={wrapperRef}>
      <canvas ref={canvasElRef} />
      <div className="pointer-readout">
        {debug.type} · {debug.pressure.toFixed(3)}
      </div>
    </div>
  );
}

export default DrawingCanvas;
