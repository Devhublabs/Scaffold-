/**
 * Calculate the Euclidean distance between two points.
 *
 * @param {{ x: number, y: number }} pointA - Starting point.
 * @param {{ x: number, y: number }} pointB - Ending point.
 * @returns {number|null} The distance, or null when either point is invalid.
 */
export function distance(pointA, pointB) {
  if (!isFinitePoint(pointA) || !isFinitePoint(pointB)) {
    return null;
  }

  return Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y);
}

/**
 * Calculate the squared Euclidean distance between two points.
 *
 * This is useful when comparing distances without requiring a square root.
 *
 * @param {{ x: number, y: number }} pointA - Starting point.
 * @param {{ x: number, y: number }} pointB - Ending point.
 * @returns {number|null} The squared distance, or null when either point is invalid.
 */
export function squaredDistance(pointA, pointB) {
  if (!isFinitePoint(pointA) || !isFinitePoint(pointB)) {
    return null;
  }

  const deltaX = pointB.x - pointA.x;
  const deltaY = pointB.y - pointA.y;

  return deltaX * deltaX + deltaY * deltaY;
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
