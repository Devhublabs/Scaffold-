import { angleBetween, centroid, distance } from "../utils/index.js";

/**
 * Compute endpoint-based line geometry for an ordered freehand stroke.
 *
 * @param {Array<{ x: number, y: number }>} points - Ordered stroke points.
 * @returns {{
 *   start: { x: number, y: number },
 *   end: { x: number, y: number },
 *   length: number,
 *   angle: number,
 *   center: { x: number, y: number }
 * }|null} Fitted line geometry, or null when fewer than two points are valid.
 */
export function fitLine(points) {
  if (!Array.isArray(points)) {
    return null;
  }

  const validPoints = points.filter(isValidPoint);

  if (validPoints.length < 2) {
    return null;
  }

  const firstPoint = validPoints[0];
  const lastPoint = validPoints[validPoints.length - 1];
  const start = { x: firstPoint.x, y: firstPoint.y };
  const end = { x: lastPoint.x, y: lastPoint.y };
  const length = distance(start, end);
  const angle = angleBetween(start, end);
  const center = centroid([start, end]);

  if (length === null || angle === null || center === null) {
    return null;
  }

  return {
    start,
    end,
    length,
    angle,
    center,
  };
}

/**
 * Determine whether a value contains finite Cartesian coordinates.
 *
 * @param {unknown} point - Value to validate.
 * @returns {boolean} Whether the value is a valid point.
 */
function isValidPoint(point) {
  return (
    point !== null &&
    typeof point === "object" &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y)
  );
}
