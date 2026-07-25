import {
  angleBetween,
  boundingBox,
  distance,
  isClosedShape,
  pathLength,
} from "../utils/index.js";

const DOT_SIZE_THRESHOLD = 1;
const MINIMUM_CONFIDENCE = 0.85;
const STROKE_RATIO_WEIGHT = 0.6;
const DEVIATION_WEIGHT = 0.4;

/**
 * Detect whether a stroke resembles a straight line.
 *
 * Confidence combines endpoint-to-path efficiency with the greatest
 * perpendicular deviation from the line joining the stroke endpoints.
 *
 * @param {Array<{ x: number, y: number }>} points - Ordered stroke points.
 * @returns {{ type: "line", confidence: number }|null} A line detection result,
 * or null when the stroke does not sufficiently resemble a line.
 */
export function detectLine(points) {
  if (!Array.isArray(points) || points.length < 2) {
    return null;
  }

  const bounds = boundingBox(points);

  if (
    bounds === null ||
    (bounds.width <= DOT_SIZE_THRESHOLD &&
      bounds.height <= DOT_SIZE_THRESHOLD)
  ) {
    return null;
  }

  if (isClosedShape(points)) {
    return null;
  }

  const startPoint = points[0];
  const endPoint = points[points.length - 1];
  const straightDistance = distance(startPoint, endPoint);
  const totalPathLength = pathLength(points);

  if (
    straightDistance === null ||
    totalPathLength === null ||
    !Number.isFinite(straightDistance) ||
    !Number.isFinite(totalPathLength) ||
    straightDistance <= 0 ||
    totalPathLength <= 0
  ) {
    return null;
  }

  const strokeRatioScore = clampScore(straightDistance / totalPathLength);
  const maximumDeviation = getMaximumDeviation(
    points,
    startPoint,
    endPoint,
  );

  if (maximumDeviation === null) {
    return null;
  }

  const deviationScore = clampScore(
    1 - maximumDeviation / straightDistance,
  );
  const confidence = clampScore(
    strokeRatioScore * STROKE_RATIO_WEIGHT +
      deviationScore * DEVIATION_WEIGHT,
  );

  if (confidence < MINIMUM_CONFIDENCE) {
    return null;
  }

  return {
    type: "line",
    confidence,
  };
}

/**
 * Find the greatest perpendicular distance from the stroke to its endpoint line.
 *
 * @param {Array<{ x: number, y: number }>} points - Ordered stroke points.
 * @param {{ x: number, y: number }} startPoint - First stroke point.
 * @param {{ x: number, y: number }} endPoint - Last stroke point.
 * @returns {number|null} Maximum deviation, or null when it cannot be calculated.
 */
function getMaximumDeviation(points, startPoint, endPoint) {
  const lineAngle = angleBetween(startPoint, endPoint);

  if (lineAngle === null) {
    return null;
  }

  const directionX = Math.cos(lineAngle);
  const directionY = Math.sin(lineAngle);
  let maximumDeviation = 0;

  for (let index = 1; index < points.length - 1; index += 1) {
    const relativeX = points[index].x - startPoint.x;
    const relativeY = points[index].y - startPoint.y;

    // The magnitude of the 2D cross product gives perpendicular distance
    // because the endpoint direction vector has unit length.
    const deviation = Math.abs(
      directionX * relativeY - directionY * relativeX,
    );

    if (!Number.isFinite(deviation)) {
      return null;
    }

    maximumDeviation = Math.max(maximumDeviation, deviation);
  }

  return maximumDeviation;
}

/**
 * Clamp a confidence component to the inclusive range from zero to one.
 *
 * @param {number} score - Score to clamp.
 * @returns {number} Clamped score.
 */
function clampScore(score) {
  return Math.min(1, Math.max(0, score));
}
