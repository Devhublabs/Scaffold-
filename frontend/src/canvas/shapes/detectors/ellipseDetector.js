import {
  boundingBox,
  centroid,
  countSharpTurns,
  distance,
  isClosedShape,
  pathLength,
  resampleClosedPath,
  smoothClosedPath,
} from "../utils/index.js";

const MINIMUM_POINT_COUNT = 6;
const MINIMUM_DIMENSION = 8;
const RESAMPLE_COUNT = 64;
const MINIMUM_CLOSURE_THRESHOLD = 4;
const MAXIMUM_CLOSURE_THRESHOLD = 96;
const CLOSURE_SCALE_RATIO = 0.25;
const MAXIMUM_SHARP_TURN_COUNT = 6;
const MINIMUM_AXIS_RATIO = 0.2;
const MAXIMUM_AXIS_RATIO = 0.88;
const MAXIMUM_ELLIPSE_ERROR = 0.25;
const MAXIMUM_PERIMETER_ERROR = 0.25;
const MINIMUM_CONFIDENCE = 0.72;

/**
 * Detect whether a stroke resembles an ellipse.
 *
 * Principal axes are estimated from covariance around the stroke centroid.
 * Confidence combines normalized ellipse residuals, perimeter agreement, and
 * agreement between the centroid and the bounding-box center.
 *
 * @param {Array<{ x: number, y: number }>} points - Ordered stroke points.
 * @returns {{
 *   type: "ellipse",
 *   confidence: number,
 *   metadata: {
 *     center: { x: number, y: number },
 *     majorAxis: number,
 *     minorAxis: number,
 *     angle: number
 *   }
 * }|null} Ellipse detection result, or null when confidence is insufficient.
 */
export function detectEllipse(points) {
  if (!Array.isArray(points) || points.length < MINIMUM_POINT_COUNT) {
    return null;
  }

  const bounds = boundingBox(points);

  if (
    bounds === null ||
    !hasUsableDimensions(bounds) ||
    bounds.width < MINIMUM_DIMENSION ||
    bounds.height < MINIMUM_DIMENSION
  ) {
    return null;
  }

  const diagonal = Math.hypot(bounds.width, bounds.height);
  const closureThreshold = clamp(
    diagonal * CLOSURE_SCALE_RATIO,
    MINIMUM_CLOSURE_THRESHOLD,
    MAXIMUM_CLOSURE_THRESHOLD,
  );

  if (!isClosedShape(points, closureThreshold)) {
    return null;
  }

  const sampledPoints = resampleClosedPath(points, RESAMPLE_COUNT);
  const analysisPoints = smoothClosedPath(sampledPoints, 1);

  if (analysisPoints === null) {
    return null;
  }

  const sharpTurnCount = countSharpTurns(analysisPoints);

  if (
    sharpTurnCount === null ||
    sharpTurnCount > MAXIMUM_SHARP_TURN_COUNT
  ) {
    return null;
  }

  const center = centroid(analysisPoints);
  const strokeLength = pathLength(analysisPoints);
  const closureDistance = distance(analysisPoints.at(-1), analysisPoints[0]);

  if (
    center === null ||
    strokeLength === null ||
    closureDistance === null ||
    !Number.isFinite(strokeLength) ||
    strokeLength <= 0
  ) {
    return null;
  }

  const axes = calculatePrincipalAxes(analysisPoints, center);

  if (axes === null) {
    return null;
  }

  const axisRatio = axes.minorRadius / axes.majorRadius;

  if (axisRatio < MINIMUM_AXIS_RATIO || axisRatio > MAXIMUM_AXIS_RATIO) {
    return null;
  }

  const ellipseError = calculateEllipseError(
    analysisPoints,
    center,
    axes,
  );

  if (ellipseError === null) {
    return null;
  }

  const fitScore = clampScore(1 - ellipseError / MAXIMUM_ELLIPSE_ERROR);
  const expectedPerimeter = approximateEllipsePerimeter(
    axes.majorRadius,
    axes.minorRadius,
  );
  const measuredPerimeter = strokeLength + closureDistance;
  const perimeterError =
    Math.abs(measuredPerimeter - expectedPerimeter) / expectedPerimeter;
  const perimeterScore = clampScore(
    1 - perimeterError / MAXIMUM_PERIMETER_ERROR,
  );
  const boundsCenter = { x: bounds.centerX, y: bounds.centerY };
  const centerOffset = distance(center, boundsCenter);

  if (centerOffset === null) {
    return null;
  }

  const centerScore = clampScore(
    1 - centerOffset / (axes.minorRadius * 0.25),
  );
  const confidence = clampScore(
    fitScore * 0.6 + perimeterScore * 0.25 + centerScore * 0.15,
  );

  if (confidence < MINIMUM_CONFIDENCE) {
    return null;
  }

  return {
    type: "ellipse",
    confidence,
    metadata: {
      center,
      majorAxis: axes.majorRadius * 2,
      minorAxis: axes.minorRadius * 2,
      angle: axes.angle,
    },
  };
}

/**
 * Estimate ellipse radii and orientation from the point covariance matrix.
 *
 * @param {Array<{ x: number, y: number }>} points - Stroke points.
 * @param {{ x: number, y: number }} center - Stroke centroid.
 * @returns {{
 *   majorRadius: number,
 *   minorRadius: number,
 *   angle: number
 * }|null} Principal-axis geometry.
 */
function calculatePrincipalAxes(points, center) {
  let covarianceXX = 0;
  let covarianceYY = 0;
  let covarianceXY = 0;

  for (const point of points) {
    const deltaX = point.x - center.x;
    const deltaY = point.y - center.y;
    covarianceXX += deltaX * deltaX;
    covarianceYY += deltaY * deltaY;
    covarianceXY += deltaX * deltaY;
  }

  covarianceXX /= points.length;
  covarianceYY /= points.length;
  covarianceXY /= points.length;

  const trace = covarianceXX + covarianceYY;
  const discriminant = Math.hypot(
    covarianceXX - covarianceYY,
    covarianceXY * 2,
  );
  const majorEigenvalue = (trace + discriminant) / 2;
  const minorEigenvalue = (trace - discriminant) / 2;

  if (
    !Number.isFinite(majorEigenvalue) ||
    !Number.isFinite(minorEigenvalue) ||
    majorEigenvalue <= 0 ||
    minorEigenvalue <= 0
  ) {
    return null;
  }

  return {
    majorRadius: Math.sqrt(majorEigenvalue * 2),
    minorRadius: Math.sqrt(minorEigenvalue * 2),
    angle: 0.5 * Math.atan2(covarianceXY * 2, covarianceXX - covarianceYY),
  };
}

/**
 * Measure mean normalized radial error against principal-axis ellipse geometry.
 *
 * @param {Array<{ x: number, y: number }>} points - Stroke points.
 * @param {{ x: number, y: number }} center - Ellipse center.
 * @param {{ majorRadius: number, minorRadius: number, angle: number }} axes
 * @returns {number|null} Mean absolute normalized radial error.
 */
function calculateEllipseError(points, center, axes) {
  const cosine = Math.cos(axes.angle);
  const sine = Math.sin(axes.angle);
  let totalError = 0;

  for (const point of points) {
    const deltaX = point.x - center.x;
    const deltaY = point.y - center.y;
    const majorCoordinate = deltaX * cosine + deltaY * sine;
    const minorCoordinate = -deltaX * sine + deltaY * cosine;
    const normalizedRadius = Math.hypot(
      majorCoordinate / axes.majorRadius,
      minorCoordinate / axes.minorRadius,
    );

    if (!Number.isFinite(normalizedRadius)) {
      return null;
    }

    totalError += Math.abs(normalizedRadius - 1);
  }

  return totalError / points.length;
}

/**
 * Approximate an ellipse perimeter using Ramanujan's second approximation.
 *
 * @param {number} majorRadius - Semi-major axis length.
 * @param {number} minorRadius - Semi-minor axis length.
 * @returns {number} Approximate perimeter.
 */
function approximateEllipsePerimeter(majorRadius, minorRadius) {
  const radiusSum = majorRadius + minorRadius;
  const radiusDifference = majorRadius - minorRadius;
  const h = (radiusDifference * radiusDifference) / (radiusSum * radiusSum);

  return (
    Math.PI *
    radiusSum *
    (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))
  );
}

/**
 * Determine whether bounding-box dimensions are finite and positive.
 *
 * @param {{ width: number, height: number }} bounds - Stroke bounds.
 * @returns {boolean} Whether the dimensions can be analyzed.
 */
function hasUsableDimensions(bounds) {
  return (
    Number.isFinite(bounds.width) &&
    Number.isFinite(bounds.height) &&
    bounds.width > 0 &&
    bounds.height > 0
  );
}

/**
 * Clamp a numeric value to an inclusive range.
 *
 * @param {number} value - Value to clamp.
 * @param {number} minimum - Minimum allowed value.
 * @param {number} maximum - Maximum allowed value.
 * @returns {number} Clamped value.
 */
function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Clamp a confidence score to the inclusive range from zero to one.
 *
 * @param {number} score - Score to clamp.
 * @returns {number} Clamped score.
 */
function clampScore(score) {
  return clamp(score, 0, 1);
}
