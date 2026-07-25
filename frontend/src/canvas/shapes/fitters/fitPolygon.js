import { boundingBox, centroid, distance } from "../utils/index.js";
import {
  getValidPoints,
  isFinitePoint,
} from "./fitUtils.js";

/**
 * Compute best-fit polygon geometry after polygon intent has been detected.
 *
 * @param {Array<{ x: number, y: number }>} points - Ordered stroke points.
 * @param {object|null} detection - Metadata produced by the polygon detector.
 * @returns {{
 *   vertices: Array<{ x: number, y: number }>,
 *   sides: number,
 *   center: { x: number, y: number },
 *   boundingBox: object,
 *   closed: true
 * }|null} Straight-edged polygon geometry.
 */
export function fitPolygon(points, detection) {
  const validPoints = getValidPoints(points);
  const detectedCorners = detection?.metadata?.corners;

  if (
    validPoints.length < 3 ||
    !Array.isArray(detectedCorners) ||
    detectedCorners.length < 3
  ) {
    return null;
  }

  const vertices = removeDuplicateVertices(
    detectedCorners
      .filter(isFinitePoint)
      .map((corner) => ({ x: corner.x, y: corner.y })),
  );

  if (vertices.length < 3) {
    return null;
  }

  const center = centroid(vertices);
  const bounds = boundingBox(vertices);

  if (center === null || bounds === null) {
    return null;
  }

  return {
    vertices,
    sides: vertices.length,
    center,
    boundingBox: bounds,
    closed: true,
  };
}

/**
 * Remove consecutive and closing duplicate vertices.
 *
 * @param {Array<{ x: number, y: number }>} vertices - Candidate vertices.
 * @returns {Array<{ x: number, y: number }>} Distinct ordered vertices.
 */
function removeDuplicateVertices(vertices) {
  const distinct = [];

  for (const vertex of vertices) {
    const previous = distinct[distinct.length - 1];
    const separation = previous ? distance(previous, vertex) : null;

    if (previous === undefined || separation === null || separation > 1e-6) {
      distinct.push(vertex);
    }
  }

  if (distinct.length > 1) {
    const closingDistance = distance(distinct[0], distinct[distinct.length - 1]);

    if (closingDistance !== null && closingDistance <= 1e-6) {
      distinct.pop();
    }
  }

  return distinct;
}
