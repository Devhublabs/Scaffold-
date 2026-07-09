import { PencilBrush, Path, Point, Circle } from "fabric";

/**
 * PressureBrush — a PencilBrush that varies stroke width with pointer pressure.
 *
 * Fabric's PencilBrush renders every stroke as a single uniform-width Path
 * (`strokeWidth: this.width`). To get a thin→thick taper within one stroke we
 * record the PointerEvent pressure at each captured point, then commit the
 * stroke as ONE filled outline polygon (variable width can't be expressed with
 * a uniform strokeWidth, so we fill an outline instead of stroking a centerline).
 *
 * Requires the canvas to run with `enablePointerEvents: true` so the events
 * handed to the brush are real PointerEvents carrying `pressure`/`pointerType`.
 */
export class PressureBrush extends PencilBrush {
  constructor(canvas) {
    super(canvas);

    // Pressure recorded per captured point, kept in lockstep with `_points`.
    this._pressures = [];
    this._currentPressure = 0.5;

    // Disable straight-line mode: its `_points.pop()` in `_addPoint` would
    // desync the pressures array from the points array.
    this.straightLineKey = null;

    // Width scaling: final per-point width = this.width * factor, where factor
    // ramps from minFactor (no pressure) to maxFactor (full pressure).
    this.minFactor = 0.35;
    this.maxFactor = 1.6;
  }

  /**
   * Normalize pressure across device types into a 0..1 value.
   * - Mouse reports a constant 0.5 while a button is held → keep width at base.
   * - Some pen/touch devices report 0 mid-stroke → floor to 0.5.
   */
  _readPressure(e) {
    if (!e || e.pointerType === "mouse") return 0.5;
    const p = typeof e.pressure === "number" ? e.pressure : 0.5;
    return p > 0 ? p : 0.5;
  }

  /** Per-point stroke width for a given pressure. */
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

  // Always do a full render so the live preview reflects per-point width,
  // instead of Fabric's optimized uniform-width incremental segment draw.
  needsFullRender() {
    return true;
  }

  /**
   * Live preview on the top context: stroke each segment individually with a
   * width derived from that segment's pressure. Round caps/joins blend the
   * varying widths into a continuous taper.
   */
  _render(ctx = this.canvas.contextTop) {
    const points = this._points;
    if (points.length < 1) return;

    this._saveAndTransform(ctx);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = this.color;

    if (points.length === 1) {
      // A single tap: draw a dot sized to its pressure.
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

  /**
   * Build a closed outline polygon from the centerline points and their
   * per-point half-widths, then commit it as a single filled Path.
   * We override the whole method (rather than call super) because super runs
   * `decimatePoints`, which would drop points and desync the pressures array.
   */
  _finalizeAndAddPath() {
    const points = this._points;
    const canvas = this.canvas;

    // No points at all — nothing to commit.
    if (!points || points.length < 1) {
      canvas.clearContext(canvas.contextTop);
      canvas.requestRenderAll();
      return;
    }

    // A single tap (down + up, no movement) becomes a pressure-sized dot rather
    // than being discarded, so quick taps leave a mark like every other stroke.
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

    canvas.clearContext(canvas.contextTop);
    canvas.fire("before:path:created", { path });
    canvas.add(path);
    canvas.requestRenderAll();
    path.setCoords();
    this._resetShadow();
    // Note: `path` here may be a Circle (single tap) as well as a Path; the
    // event name is kept for parity with PencilBrush, and listeners should
    // treat the payload as a generic committed object, not specifically a Path.
    canvas.fire("path:created", { path });
  }

  /**
   * Offset each centerline point along its local normal by ±half-width to get
   * left/right edges, then walk left edge forward and right edge backward to
   * form a closed outline. Returns Fabric SVG path commands.
   */
  _buildOutlinePath(points, pressures) {
    const n = points.length;
    const left = [];
    const right = [];

    for (let i = 0; i < n; i++) {
      // Local tangent from neighbouring points (endpoints use the one segment
      // available), then rotate 90° for the normal.
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
