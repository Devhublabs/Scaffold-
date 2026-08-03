import { PencilBrush, Path, Point, Circle } from "fabric";
import {
  buildPressureOutlinePath,
  getPressureWidth,
} from "./pressureStroke.js";

export class PressureBrush extends PencilBrush {
  constructor(canvas) {
    super(canvas);
    this._pressures = [];
    this._currentPressure = 0.5;
    this.straightLineKey = null;
    this.minFactor = 0.35;
    this.maxFactor = 1.6;
  }

  static pencil(canvas) {
    const b = new PressureBrush(canvas);
    b.width = 3;
    b.minFactor = 0.35;
    b.maxFactor = 1.6;
    return b;
  }

  static pen(canvas) {
    const b = new PressureBrush(canvas);
    b.width = 7;
    b.minFactor = 0.6;
    b.maxFactor = 1.8;
    return b;
  }

  static objectFromStroke(canvas, stroke) {
    const rawPoints = Array.isArray(stroke?.points) ? stroke.points : [];
    if (!rawPoints.length) return null;

    const brush = new PressureBrush(canvas);
    brush.width = stroke.width ?? 3;
    brush.minFactor = stroke.minFactor ?? brush.minFactor;
    brush.maxFactor = stroke.maxFactor ?? brush.maxFactor;

    const points = rawPoints.map(([x, y]) => new Point(x, y));
    const pressures = Array.isArray(stroke.pressures)
      ? stroke.pressures.slice(0, points.length)
      : points.map(() => 0.5);
    const color = stroke.color || "#000000";

    let object;
    if (points.length === 1) {
      const radius = Math.max(brush._widthFor(pressures[0] ?? 0.5) / 2, 0.5);
      object = new Circle({
        left: points[0].x - radius,
        top: points[0].y - radius,
        radius,
        fill: color,
        stroke: null,
        strokeWidth: 0,
      });
    } else {
      object = new Path(brush._buildOutlinePath(points, pressures), {
        fill: color,
        stroke: null,
        strokeWidth: 0,
      });
    }

    object.scaffoldStrokeData = {
      points: rawPoints.map(([x, y]) => [x, y]),
      pressures,
      color,
      width: brush.width,
      minFactor: brush.minFactor,
      maxFactor: brush.maxFactor,
    };

    return object;
  }

  _readPressure(e) {
    if (!e || e.pointerType === "mouse") return 0.5;
    const p = typeof e.pressure === "number" ? e.pressure : 0.5;
    return p > 0 ? p : 0.5;
  }

  _widthFor(pressure) {
    return getPressureWidth(
      this.width,
      pressure,
      this.minFactor,
      this.maxFactor,
    );
  }

  onMouseDown(pointer, options) {
    this._currentPressure = this._readPressure(options?.e);
    super.onMouseDown(pointer, options);
  }

  onMouseMove(pointer, options) {
    this._currentPressure = this._readPressure(options?.e);
    super.onMouseMove(pointer, options);
  }

  _reset() {
    super._reset();
    this._pressures = [];
  }

  _addPoint(point) {
    const added = super._addPoint(point);
    if (added) this._pressures.push(this._currentPressure);
    return added;
  }

  needsFullRender() {
    return true;
  }

  _render(ctx = this.canvas.contextTop) {
    const points = this._points;
    if (points.length < 1) return;

    this._saveAndTransform(ctx);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = this.color;

    if (points.length === 1) {
      const w = this._widthFor(this._pressures[0] ?? 0.5);
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, Math.max(w / 2, 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    for (let i = 1; i < points.length; i++) {
      const w = this._widthFor((this._pressures[i - 1] + this._pressures[i]) / 2);
      ctx.beginPath();
      ctx.lineWidth = w;
      ctx.moveTo(points[i - 1].x, points[i - 1].y);
      ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  _finalizeAndAddPath() {
    const points = this._points;
    const canvas = this.canvas;

    if (!points || points.length < 1) {
      canvas.clearContext(canvas.contextTop);
      canvas.requestRenderAll();
      return;
    }

    let path;
    if (points.length === 1) {
      const radius = Math.max(this._widthFor(this._pressures[0] ?? 0.5) / 2, 0.5);
      path = new Circle({
        left: points[0].x - radius,
        top: points[0].y - radius,
        radius,
        fill: this.color,
        stroke: null,
        strokeWidth: 0,
      });
    } else {
      const pathData = this._buildOutlinePath(points, this._pressures);
      path = new Path(pathData, {
        fill: this.color,
        stroke: null,
        strokeWidth: 0,
      });
    }

    if (this.shadow) path.shadow = this.shadow;

    path.scaffoldStrokeData = {
      points: points.map((point) => [point.x, point.y]),
      pressures: this._pressures.slice(0, points.length),
      color: this.color,
      width: this.width,
      minFactor: this.minFactor,
      maxFactor: this.maxFactor,
    };

    canvas.clearContext(canvas.contextTop);
    canvas.fire("before:path:created", { path });
    canvas.add(path);
    canvas.requestRenderAll();
    path.setCoords();
    this._resetShadow();
    canvas.fire("path:created", { path });
  }

  _buildOutlinePath(points, pressures) {
    return buildPressureOutlinePath(points, pressures, {
      width: this.width,
      minFactor: this.minFactor,
      maxFactor: this.maxFactor,
    });
  }
}
