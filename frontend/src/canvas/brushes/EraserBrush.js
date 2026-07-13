import { PencilBrush } from "fabric";

export class EraserBrush extends PencilBrush {
  constructor(canvas) {
    super(canvas);
    this.width = 20;
    this.straightLineKey = null;
  }

  onMouseDown(pointer, options) {
    this.color = this.canvas.backgroundColor || "#ffffff";
    super.onMouseDown(pointer, options);
  }

  createPath(pathData) {
    const path = super.createPath(pathData);

    path.scaffoldStrokeData = {
      points: this._points.map((point) => [point.x, point.y]),
      pressures: this._points.map(() => 0.5),
      color: this.color,
      width: this.width,
    };

    return path;
  }
}
