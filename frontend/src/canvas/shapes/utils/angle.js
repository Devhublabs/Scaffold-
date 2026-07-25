/**
 * Calculate the angle in radians from one point to another.
 *
 * @param {{ x: number, y: number }} pointA - Starting point.
 * @param {{ x: number, y: number }} pointB - Ending point.
 * @returns {number|null} The angle from point A to point B, or null for invalid input.
 */
export function angleBetween(pointA, pointB) {
  if (!isFinitePoint(pointA) || !isFinitePoint(pointB)) {
    return null;
  }

  let deltaX = pointB.x - pointA.x;
  let deltaY = pointB.y - pointA.y;

  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) {
    const scale = Math.max(
      Math.abs(pointA.x),
      Math.abs(pointA.y),
      Math.abs(pointB.x),
      Math.abs(pointB.y),
    );

    deltaX = pointB.x / scale - pointA.x / scale;
    deltaY = pointB.y / scale - pointA.y / scale;
  }

  return Math.atan2(deltaY, deltaX);
}

/**
 * Normalize an angle to the range from zero, inclusive, to 2π, exclusive.
 *
 * @param {number} angle - Angle in radians.
 * @returns {number|null} The normalized angle, or null for invalid input.
 */
export function normalizeAngle(angle) {
  if (!Number.isFinite(angle)) {
    return null;
  }

  const fullRotation = Math.PI * 2;
  return ((angle % fullRotation) + fullRotation) % fullRotation;
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
