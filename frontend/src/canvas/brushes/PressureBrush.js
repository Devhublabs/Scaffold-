import { PencilBrush, Path, Point, Circle } from "fabric";

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
    };

    return object;
  }

  _readPressure(e) {
    if (!e || e.pointerType === "mouse") return 0.5;
    const p = typeof e.pressure === "number" ? e.pressure : 0.5;
    return p > 0 ? p : 0.5;
  }

  _widthFor(pressure) {
    return this.width * (this.minFactor + (this.maxFactor - this.minFactor) * pressure);
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
    const n = points.length;
    const left = [];
    const right = [];

    for (let i = 0; i < n; i++) {
      const prev = points[i === 0 ? 0 : i - 1];
      const next = points[i === n - 1 ? n - 1 : i + 1];
      let tx = next.x - prev.x;
      let ty = next.y - prev.y;
      const len = Math.hypot(tx, ty) || 1;
      tx /= len;
      ty /= len;
      const nx = -ty;
      const ny = tx;

      const h = this._widthFor(pressures[i] ?? 0.5) / 2;
      left.push(new Point(points[i].x + nx * h, points[i].y + ny * h));
      right.push(new Point(points[i].x - nx * h, points[i].y - ny * h));
    }

    const cmds = [];
    cmds.push(["M", left[0].x, left[0].y]);
    for (let i = 1; i < n; i++) cmds.push(["L", left[i].x, left[i].y]);
    for (let i = n - 1; i >= 0; i--) cmds.push(["L", right[i].x, right[i].y]);
    cmds.push(["Z"]);
    return cmds;
  }
}
