import * as fabric from "fabric";
import { buildPressureOutlinePath } from "../brushes/pressureStroke.js";

const DEFAULT_STROKE = "#000000";
const DEFAULT_FILL = "transparent";
const DEFAULT_STROKE_WIDTH = 2;
const COMPOSITE_STYLE_KEYS = [
  "fill",
  "paintFirst",
  "stroke",
  "strokeDashArray",
  "strokeDashOffset",
  "strokeLineCap",
  "strokeLineJoin",
  "strokeMiterLimit",
  "strokeUniform",
  "strokeWidth",
];

/**
 * Create a Fabric line from fitted line geometry.
 *
 * @param {{
 *   start: { x: number, y: number },
 *   end: { x: number, y: number },
 *   length?: number,
 *   angle?: number,
 *   center?: { x: number, y: number }
 * }} geometry - Geometry returned by `fitLine`.
 * @param {object} [options={}] - Fabric object options overriding defaults.
 * @returns {fabric.Line|null} Configured line, or null for invalid geometry.
 */
export function createLine(geometry, options = {}) {
  if (!isFinitePoint(geometry?.start) || !isFinitePoint(geometry?.end)) {
    return null;
  }

  return new fabric.Line(
    [
      geometry.start.x,
      geometry.start.y,
      geometry.end.x,
      geometry.end.y,
    ],
    createPrimitiveOptions(options),
  );
}

/**
 * Create a Fabric rectangle from fitted rectangle geometry.
 *
 * `cornerRadius`, `cornerRadiusX`, and `cornerRadiusY` are optional. The
 * general radius is used for both axes unless an axis-specific value exists.
 *
 * @param {{
 *   left: number,
 *   top: number,
 *   width: number,
 *   height: number,
 *   center?: { x: number, y: number },
 *   angle?: number,
 *   cornerRadius?: number,
 *   cornerRadiusX?: number,
 *   cornerRadiusY?: number
 * }} geometry - Geometry returned by `fitRectangle`.
 * @param {object} [options={}] - Fabric object options overriding defaults.
 * @returns {fabric.Rect|null} Configured rectangle, or null for invalid geometry.
 */
export function createRectangle(geometry, options = {}) {
  if (
    !isPositiveNumber(geometry?.width) ||
    !isPositiveNumber(geometry?.height)
  ) {
    return null;
  }

  const center = getRectangleCenter(geometry);

  if (center === null) {
    return null;
  }

  const cornerRadius = getNonNegativeNumber(geometry.cornerRadius, 0);
  const radiusX = getNonNegativeNumber(
    geometry.cornerRadiusX,
    cornerRadius,
  );
  const radiusY = getNonNegativeNumber(
    geometry.cornerRadiusY,
    cornerRadius,
  );

  return new fabric.Rect({
    ...createPrimitiveOptions(options),
    left: center.x,
    top: center.y,
    width: geometry.width,
    height: geometry.height,
    angle: radiansToDegrees(geometry.angle),
    rx: radiusX,
    ry: radiusY,
  });
}

/**
 * Create a Fabric circle from fitted circle geometry.
 *
 * @param {{
 *   center: { x: number, y: number },
 *   radius: number,
 *   diameter?: number
 * }} geometry - Geometry returned by `fitCircle`.
 * @param {object} [options={}] - Fabric object options overriding defaults.
 * @returns {fabric.Circle|null} Configured circle, or null for invalid geometry.
 */
export function createCircle(geometry, options = {}) {
  if (
    !isFinitePoint(geometry?.center) ||
    !isPositiveNumber(geometry?.radius)
  ) {
    return null;
  }

  return new fabric.Circle({
    ...createPrimitiveOptions(options),
    left: geometry.center.x,
    top: geometry.center.y,
    radius: geometry.radius,
  });
}

/**
 * Create a Fabric ellipse from fitted ellipse geometry.
 *
 * Fitter angles are expressed in radians; Fabric object angles are degrees.
 *
 * @param {{
 *   center: { x: number, y: number },
 *   radiusX: number,
 *   radiusY: number,
 *   majorAxis?: number,
 *   minorAxis?: number,
 *   angle?: number
 * }} geometry - Geometry returned by `fitEllipse`.
 * @param {object} [options={}] - Fabric object options overriding defaults.
 * @returns {fabric.Ellipse|null} Configured ellipse, or null for invalid geometry.
 */
export function createEllipse(geometry, options = {}) {
  if (
    !isFinitePoint(geometry?.center) ||
    !isPositiveNumber(geometry?.radiusX) ||
    !isPositiveNumber(geometry?.radiusY)
  ) {
    return null;
  }

  return new fabric.Ellipse({
    ...createPrimitiveOptions(options),
    left: geometry.center.x,
    top: geometry.center.y,
    rx: geometry.radiusX,
    ry: geometry.radiusY,
    angle: radiansToDegrees(geometry.angle),
  });
}

/**
 * Create a Fabric polygon from fitted polygon geometry.
 *
 * @param {{
 *   vertices: Array<{ x: number, y: number }>,
 *   sides?: number,
 *   center?: { x: number, y: number },
 *   boundingBox?: object,
 *   closed?: boolean
 * }} geometry - Geometry returned by `fitPolygon`.
 * @param {object} [options={}] - Fabric object options overriding defaults.
 * @returns {fabric.Polygon|null} Configured polygon, or null for invalid geometry.
 */
export function createPolygon(geometry, options = {}) {
  const vertices = copyVertices(geometry?.vertices, 3);

  if (vertices === null) {
    return null;
  }

  return new fabric.Polygon(
    vertices,
    createPrimitiveOptions(options),
  );
}

/**
 * Create a grouped Fabric arrow from fitted arrow geometry.
 *
 * The shaft is a Fabric line. The filled arrowhead is a Fabric triangle whose
 * tip is aligned with the fitted arrow tip.
 *
 * @param {{
 *   direction: number,
 *   shaft: {
 *     start: { x: number, y: number },
 *     end: { x: number, y: number },
 *     length?: number,
 *     angle?: number
 *   },
 *   head: {
 *     tip: { x: number, y: number },
 *     left?: { x: number, y: number },
 *     right?: { x: number, y: number },
 *     depth: number,
 *     width: number,
 *     length?: number,
 *     angle?: number
 *   }
 * }} geometry - Geometry returned by `fitArrow`.
 * @param {object} [options={}] - Fabric group and paint options.
 * @returns {fabric.Group|null} Arrow group, or null for invalid geometry.
 */
export function createArrow(geometry, options = {}) {
  const start = geometry?.shaft?.start;
  const end = geometry?.shaft?.end;
  const tip = geometry?.head?.tip;
  const direction = getArrowDirection(geometry);
  const headWidth = getArrowHeadWidth(geometry?.head);
  const headDepth = getArrowHeadDepth(geometry?.head);

  if (
    !isFinitePoint(start) ||
    !isFinitePoint(end) ||
    !isFinitePoint(tip) ||
    !Number.isFinite(direction) ||
    !isPositiveNumber(headWidth) ||
    !isPositiveNumber(headDepth)
  ) {
    return null;
  }

  const partOptions = createCompositePartOptions(
    options,
    options.fill ?? options.stroke ?? DEFAULT_STROKE,
  );
  const shaft = createLine(
    { start, end },
    {
      ...partOptions,
      fill: DEFAULT_FILL,
    },
  );

  if (shaft === null) {
    return null;
  }

  const directionX = Math.cos(direction);
  const directionY = Math.sin(direction);
  const arrowhead = new fabric.Triangle({
    ...partOptions,
    left: tip.x - directionX * (headDepth / 2),
    top: tip.y - directionY * (headDepth / 2),
    width: headWidth,
    height: headDepth,
    angle: radiansToDegrees(direction) + 90,
  });

  return new fabric.Group(
    [shaft, arrowhead],
    createGroupOptions(options),
  );
}

/**
 * Create a grouped Fabric speech bubble from fitted geometry.
 *
 * The current fitter returns an elliptical body. A rectangular body is also
 * accepted for future rounded-rectangle speech bubble fitters. The triangular
 * tail is placed behind the body so an opaque fill hides the internal seam.
 *
 * @param {{
 *   body: object,
 *   tail: {
 *     tip: { x: number, y: number },
 *     anchor?: { x: number, y: number },
 *     baseStart: { x: number, y: number },
 *     baseEnd: { x: number, y: number }
 *   }
 * }} geometry - Geometry returned by `fitSpeechBubble`.
 * @param {object} [options={}] - Fabric group and paint options.
 * @returns {fabric.Group|null} Speech bubble group, or null for invalid geometry.
 */
export function createSpeechBubble(geometry, options = {}) {
  const tailVertices = copyVertices(
    [
      geometry?.tail?.baseStart,
      geometry?.tail?.tip,
      geometry?.tail?.baseEnd,
    ],
    3,
  );

  if (tailVertices === null) {
    return null;
  }

  const partOptions = createCompositePartOptions(
    options,
    options.fill ?? "#ffffff",
  );
  const body = createSpeechBubbleBody(geometry?.body, partOptions);

  if (body === null) {
    return null;
  }

  const tail = new fabric.Polygon(tailVertices, partOptions);

  return new fabric.Group(
    [tail, body],
    createGroupOptions(options),
  );
}

/**
 * Create a Fabric polygon from fitted star vertices.
 *
 * @param {{
 *   center?: { x: number, y: number },
 *   points?: number,
 *   outerRadius?: number,
 *   innerRadius?: number,
 *   rotation?: number,
 *   vertices: Array<{ x: number, y: number }>,
 *   closed?: boolean
 * }} geometry - Geometry returned by `fitStar`.
 * @param {object} [options={}] - Fabric object options overriding defaults.
 * @returns {fabric.Polygon|null} Configured star, or null for invalid geometry.
 */
export function createStar(geometry, options = {}) {
  const vertices = copyVertices(geometry?.vertices, 6);

  if (vertices === null || vertices.length % 2 !== 0) {
    return null;
  }

  return new fabric.Polygon(
    vertices,
    createPrimitiveOptions(options),
  );
}

/**
 * Create a pressure-aware Fabric path from smoothed freeform geometry.
 *
 * @param {{
 *   points: Array<{ x: number, y: number }>,
 *   pressures: Array<number>,
 *   color?: string,
 *   width: number,
 *   minFactor?: number,
 *   maxFactor?: number
 * }} geometry - Smoothed centerline and pressure data.
 * @param {object} [options={}] - Fabric object options.
 * @returns {fabric.Path|null} Pressure outline path, or null for invalid geometry.
 */
export function createFreeformPath(geometry, options = {}) {
  const pathData = buildPressureOutlinePath(
    geometry?.points,
    geometry?.pressures,
    {
      width: geometry?.width,
      minFactor: geometry?.minFactor,
      maxFactor: geometry?.maxFactor,
    },
  );

  if (pathData === null) {
    return null;
  }

  const color =
    geometry?.color ??
    options.fill ??
    options.stroke ??
    DEFAULT_STROKE;

  return new fabric.Path(pathData, {
    selectable: true,
    evented: true,
    objectCaching: true,
    ...options,
    fill: color,
    stroke: null,
    strokeWidth: 0,
  });
}

/**
 * Build the standard options applied to a standalone Fabric object.
 *
 * @param {object} options - Caller-provided Fabric options.
 * @param {string} [defaultFill=DEFAULT_FILL] - Shape-specific default fill.
 * @returns {object} New Fabric options object.
 */
function createPrimitiveOptions(options, defaultFill = DEFAULT_FILL) {
  return {
    stroke: DEFAULT_STROKE,
    fill: defaultFill,
    strokeWidth: DEFAULT_STROKE_WIDTH,
    selectable: true,
    evented: true,
    objectCaching: true,
    ...options,
  };
}

/**
 * Build paint options for objects contained by a selectable group.
 *
 * @param {object} options - Group and paint options.
 * @param {string} defaultFill - Composite-specific default fill.
 * @returns {object} Non-interactive Fabric child options.
 */
function createCompositePartOptions(options, defaultFill) {
  const partOptions = {
    stroke: options.stroke ?? DEFAULT_STROKE,
    fill: options.fill ?? defaultFill,
    strokeWidth: options.strokeWidth ?? DEFAULT_STROKE_WIDTH,
    strokeLineCap: options.strokeLineCap ?? "round",
    strokeLineJoin: options.strokeLineJoin ?? "round",
    objectCaching: options.objectCaching ?? true,
    selectable: false,
    evented: false,
  };

  for (const key of COMPOSITE_STYLE_KEYS) {
    if (Object.hasOwn(options, key)) {
      partOptions[key] = options[key];
    }
  }

  return partOptions;
}

/**
 * Build options for a returned Fabric group without duplicating child paint.
 *
 * @param {object} options - Caller-provided group and paint options.
 * @returns {object} Fabric group options.
 */
function createGroupOptions(options) {
  const groupOptions = {
    selectable: true,
    evented: true,
    objectCaching: true,
    ...options,
  };

  for (const key of COMPOSITE_STYLE_KEYS) {
    delete groupOptions[key];
  }

  return groupOptions;
}

/**
 * Create a supported speech bubble body.
 *
 * @param {object} geometry - Ellipse or rectangle body geometry.
 * @param {object} options - Non-interactive Fabric child options.
 * @returns {fabric.Ellipse|fabric.Rect|null} Fabric body object.
 */
function createSpeechBubbleBody(geometry, options) {
  if (
    isFinitePoint(geometry?.center) &&
    isPositiveNumber(geometry?.radiusX) &&
    isPositiveNumber(geometry?.radiusY)
  ) {
    return createEllipse(geometry, options);
  }

  return createRectangle(geometry, options);
}

/**
 * Resolve the center of fitted rectangle geometry.
 *
 * @param {object} geometry - Fitted rectangle geometry.
 * @returns {{ x: number, y: number }|null} Rectangle center.
 */
function getRectangleCenter(geometry) {
  if (isFinitePoint(geometry.center)) {
    return { x: geometry.center.x, y: geometry.center.y };
  }

  if (Number.isFinite(geometry.left) && Number.isFinite(geometry.top)) {
    return {
      x: geometry.left + geometry.width / 2,
      y: geometry.top + geometry.height / 2,
    };
  }

  return null;
}

/**
 * Resolve the arrow direction from fitted metadata or shaft endpoints.
 *
 * @param {object} geometry - Fitted arrow geometry.
 * @returns {number|null} Direction in radians.
 */
function getArrowDirection(geometry) {
  if (Number.isFinite(geometry?.direction)) {
    return geometry.direction;
  }

  if (Number.isFinite(geometry?.shaft?.angle)) {
    return geometry.shaft.angle;
  }

  if (
    isFinitePoint(geometry?.shaft?.start) &&
    isFinitePoint(geometry?.shaft?.end)
  ) {
    return Math.atan2(
      geometry.shaft.end.y - geometry.shaft.start.y,
      geometry.shaft.end.x - geometry.shaft.start.x,
    );
  }

  return null;
}

/**
 * Resolve the fitted arrowhead width.
 *
 * @param {object} head - Fitted arrowhead geometry.
 * @returns {number|null} Arrowhead width.
 */
function getArrowHeadWidth(head) {
  if (isPositiveNumber(head?.width)) {
    return head.width;
  }

  return isFinitePoint(head?.left) && isFinitePoint(head?.right)
    ? pointDistance(head.left, head.right)
    : null;
}

/**
 * Resolve the fitted arrowhead depth.
 *
 * @param {object} head - Fitted arrowhead geometry.
 * @returns {number|null} Distance from tip to base center.
 */
function getArrowHeadDepth(head) {
  if (isPositiveNumber(head?.depth)) {
    return head.depth;
  }

  if (
    !isFinitePoint(head?.tip) ||
    !isFinitePoint(head?.left) ||
    !isFinitePoint(head?.right)
  ) {
    return null;
  }

  return pointDistance(head.tip, {
    x: (head.left.x + head.right.x) / 2,
    y: (head.left.y + head.right.y) / 2,
  });
}

/**
 * Copy and validate polygon vertices.
 *
 * @param {unknown} vertices - Candidate point array.
 * @param {number} minimumCount - Minimum required point count.
 * @returns {Array<{ x: number, y: number }>|null} Copied vertices.
 */
function copyVertices(vertices, minimumCount) {
  if (!Array.isArray(vertices) || vertices.length < minimumCount) {
    return null;
  }

  if (!vertices.every(isFinitePoint)) {
    return null;
  }

  return vertices.map((point) => ({ x: point.x, y: point.y }));
}

/**
 * Convert a finite radian angle to degrees.
 *
 * @param {number|undefined} angle - Angle in radians.
 * @returns {number} Equivalent Fabric angle in degrees.
 */
function radiansToDegrees(angle) {
  return Number.isFinite(angle) ? (angle * 180) / Math.PI : 0;
}

/**
 * Calculate Euclidean distance between finite points.
 *
 * @param {{ x: number, y: number }} first - First point.
 * @param {{ x: number, y: number }} second - Second point.
 * @returns {number|null} Point distance.
 */
function pointDistance(first, second) {
  if (!isFinitePoint(first) || !isFinitePoint(second)) {
    return null;
  }

  return Math.hypot(second.x - first.x, second.y - first.y);
}

/**
 * Resolve a finite non-negative number with a fallback.
 *
 * @param {unknown} value - Candidate value.
 * @param {number} fallback - Fallback value.
 * @returns {number} Non-negative value.
 */
function getNonNegativeNumber(value, fallback) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

/**
 * Determine whether a value is a finite positive number.
 *
 * @param {unknown} value - Candidate value.
 * @returns {boolean} Whether the value is positive and finite.
 */
function isPositiveNumber(value) {
  return Number.isFinite(value) && value > 0;
}

/**
 * Determine whether a value contains finite Cartesian coordinates.
 *
 * @param {unknown} point - Candidate point.
 * @returns {boolean} Whether the value is a finite point.
 */
function isFinitePoint(point) {
  return (
    point !== null &&
    typeof point === "object" &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y)
  );
}
