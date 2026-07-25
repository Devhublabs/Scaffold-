import { distance } from "./distance.js";

/**
 * Calculate the centroid of a collection of points.
 *
 * @param {Array<{ x: number, y: number }>} points - Points to average.
 * @returns {{ x: number, y: number }|null} The centroid, or null for invalid or empty input.
 */
export function centroid(points) {
  if (!Array.isArray(points) || points.length === 0) {
    return null;
  }

  const firstPoint = points[0];

  if (!isFinitePoint(firstPoint)) {
    return null;
  }

  let centerX = firstPoint.x;
  let centerY = firstPoint.y;

  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];

    if (!isFinitePoint(point)) {
      return null;
    }

    const pointCount = index + 1;
    centerX = updateMean(centerX, point.x, pointCount);
    centerY = updateMean(centerY, point.y, pointCount);
  }

  return {
    x: centerX,
    y: centerY,
  };
}

/**
 * Calculate the total length of an ordered point path.
 *
 * @param {Array<{ x: number, y: number }>} points - Ordered path points.
 * @returns {number|null} The path length, or null when a point is invalid.
 */
export function pathLength(points) {
  if (!Array.isArray(points) || points.length < 2) {
    return 0;
  }

  let totalLength = 0;

  for (let index = 1; index < points.length; index += 1) {
    const segmentLength = distance(points[index - 1], points[index]);

    if (segmentLength === null) {
      return null;
    }

    totalLength += segmentLength;
  }

  return totalLength;
}

/**
 * Determine whether an ordered point path is sufficiently closed.
 *
 * @param {Array<{ x: number, y: number }>} points - Ordered path points.
 * @param {number} [threshold=20] - Maximum endpoint separation for closure.
 * @returns {boolean} Whether the first and last points are within the threshold.
 */
export function isClosedShape(points, threshold = 20) {
  if (
    !Array.isArray(points) ||
    points.length === 0 ||
    !Number.isFinite(threshold) ||
    threshold < 0
  ) {
    return false;
  }

  const endpointDistance = distance(points[0], points.at(-1));

  return endpointDistance !== null && endpointDistance <= threshold;
}

/**
 * Update a running arithmetic mean without overflowing finite coordinates.
 *
 * @param {number} currentMean - Mean of the previously processed values.
 * @param {number} value - Next value to include.
 * @param {number} valueCount - Number of values including the next value.
 * @returns {number} The updated arithmetic mean.
 */
function updateMean(currentMean, value, valueCount) {
  const difference = value - currentMean;

  if (Number.isFinite(difference)) {
    return currentMean + difference / valueCount;
  }

  const previousWeight = (valueCount - 1) / valueCount;
  return currentMean * previousWeight + value / valueCount;
}

/**
 * Determine whether a value contains finite Cartesian coordinates.
 *
 * @param {unknown} point - Value to validate.
 * @returns {boolean} Whether the value is a valid point.
 */
function isFinitePoint(point) {
  return (
    point !== null &&
    typeof point === "object" &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y)
  );
}
