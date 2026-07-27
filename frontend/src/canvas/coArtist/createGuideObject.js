import * as fabric from "fabric";


const ROLE_STYLES = {
  construction: {
    stroke: "#3D7EDB",
    strokeDashArray: [6, 4],
    strokeWidth: 1.25,
    opacity: 0.65,
  },
  contour: {
    stroke: "#E8544E",
    strokeDashArray: null,
    strokeWidth: 1.75,
    opacity: 0.9,
  },
};


function shapePoints(shape) {
  if (shape.type === "ellipse") {
    return [
      [shape.cx - shape.rx, shape.cy - shape.ry],
      [shape.cx + shape.rx, shape.cy + shape.ry],
    ];
  }
  if (shape.type === "line") {
    return [
      [shape.x1, shape.y1],
      [shape.x2, shape.y2],
    ];
  }
  return Array.isArray(shape.points) ? shape.points : [];
}


function getBounds(shapes) {
  const points = shapes.flatMap(shapePoints).filter(
    (point) =>
      Array.isArray(point) &&
      point.length === 2 &&
      Number.isFinite(point[0]) &&
      Number.isFinite(point[1]),
  );
  if (!points.length) return null;

  return points.reduce(
    (bounds, [x, y]) => ({
      minX: Math.min(bounds.minX, x),
      minY: Math.min(bounds.minY, y),
      maxX: Math.max(bounds.maxX, x),
      maxY: Math.max(bounds.maxY, y),
    }),
    {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    },
  );
}


function createFabricShape(shape, mapPoint, scale) {
  const roleStyle = ROLE_STYLES[shape.role] || ROLE_STYLES.construction;
  const options = {
    ...roleStyle,
    fill: "transparent",
    selectable: false,
    evented: false,
    objectCaching: true,
    strokeUniform: true,
  };

  if (shape.type === "ellipse") {
    const center = mapPoint(shape.cx, shape.cy);
    return new fabric.Ellipse({
      ...options,
      left: center.x,
      top: center.y,
      originX: "center",
      originY: "center",
      rx: shape.rx * scale,
      ry: shape.ry * scale,
      angle: Number.isFinite(shape.rotation) ? shape.rotation : 0,
    });
  }

  if (shape.type === "line") {
    const start = mapPoint(shape.x1, shape.y1);
    const end = mapPoint(shape.x2, shape.y2);
    return new fabric.Line([start.x, start.y, end.x, end.y], options);
  }

  if (shape.type === "polyline" || shape.type === "path") {
    const points = Array.isArray(shape.points)
      ? shape.points
          .filter(
            (point) =>
              Array.isArray(point) &&
              Number.isFinite(point[0]) &&
              Number.isFinite(point[1]),
          )
          .map(([x, y]) => mapPoint(x, y))
      : [];
    if (points.length < 2) return null;
    return shape.closed
      ? new fabric.Polygon(points, options)
      : new fabric.Polyline(points, options);
  }

  return null;
}


export function createGuideObject(payload, canvas) {
  const shapes = Array.isArray(payload?.shapes) ? payload.shapes : [];
  const bounds = getBounds(shapes);
  if (!bounds) return null;

  const margin = 48;
  const spanX = Math.max(bounds.maxX - bounds.minX, 1);
  const spanY = Math.max(bounds.maxY - bounds.minY, 1);
  const scale = Math.max(
    1,
    Math.min(
      96,
      (canvas.getWidth() - margin * 2) / spanX,
      (canvas.getHeight() - margin * 2) / spanY,
    ),
  );
  const anchorX =
    canvas.getWidth() / 2 - ((bounds.minX + bounds.maxX) / 2) * scale;
  const anchorY = margin - bounds.minY * scale;
  const mapPoint = (x, y) => ({
    x: anchorX + x * scale,
    y: anchorY + y * scale,
  });

  const objects = shapes
    .map((shape) => createFabricShape(shape, mapPoint, scale))
    .filter(Boolean);
  if (!objects.length) return null;

  const group = new fabric.Group(objects, {
    selectable: true,
    evented: true,
    objectCaching: true,
  });
  group.scaffoldGuideData = payload;
  return group;
}
