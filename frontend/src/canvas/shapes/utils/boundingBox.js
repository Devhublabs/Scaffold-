/**
 * Calculate the axis-aligned bounding box for a collection of points.
 *
 * @param {Array<{ x: number, y: number }>} points - Points to contain.
 * @returns {{
 *   minX: number,
 *   minY: number,
 *   maxX: number,
 *   maxY: number,
 *   width: number,
 *   height: number,
 *   centerX: number,
 *   centerY: number
 * }|null} The bounding box, or null for invalid or empty input.
 */
export function boundingBox(points) {
  if (!Array.isArray(points) || points.length === 0) {
    return null;
  }

  const firstPoint = points[0];

  if (!isFinitePoint(firstPoint)) {
    return null;
  }

  let minX = firstPoint.x;
  let minY = firstPoint.y;
  let maxX = firstPoint.x;
  let maxY = firstPoint.y;

  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];

    if (!isFinitePoint(point)) {
      return null;
    }

    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  const width = maxX - minX;
  const height = maxY - minY;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: midpoint(minX, maxX),
    centerY: midpoint(minY, maxY),
  };
}

/**
 * Calculate the midpoint of two finite values without overflowing their span.
 *
 * @param {number} minimum - Lower endpoint.
 * @param {number} maximum - Upper endpoint.
 * @returns {number} The midpoint.
 */
function midpoint(minimum, maximum) {
  const span = maximum - minimum;

  if (Number.isFinite(span)) {
    return minimum + span / 2;
  }

  return minimum / 2 + maximum / 2;
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
