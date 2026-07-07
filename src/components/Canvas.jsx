import { useEffect, useRef } from "react";
import { Canvas, PencilBrush } from "fabric";

const CANVAS_HEIGHT = 600;

function DrawingCanvas() {
  const wrapperRef = useRef(null);
  const canvasElRef = useRef(null);
  const fabricCanvasRef = useRef(null);

  useEffect(() => {
    const canvas = new Canvas(canvasElRef.current, {
      isDrawingMode: true, 
      backgroundColor: "#ffffff",
      width: wrapperRef.current.clientWidth,
      height: CANVAS_HEIGHT,
    });

    const brush = new PencilBrush(canvas);
    brush.color = "#111111";
    brush.width = 3;
    canvas.freeDrawingBrush = brush;

    fabricCanvasRef.current = canvas;

    const handleResize = () => {
      canvas.setWidth(wrapperRef.current.clientWidth);
      canvas.renderAll();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.dispose();
    };
  }, []);

  return (
    <div className="canvas-frame" ref={wrapperRef}>
      <canvas ref={canvasElRef} />
    </div>
  );
}

export default DrawingCanvas;





