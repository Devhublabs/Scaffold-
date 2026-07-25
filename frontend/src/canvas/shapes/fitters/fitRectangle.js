import { boundingBox } from "../utils/index.js";
import { getValidPoints } from "./fitUtils.js";

/**
 * Compute best-fit rectangle geometry after rectangle intent has been detected.
 *
 * @param {Array<{ x: number, y: number }>} points - Ordered stroke points.
 * @param {object|null} detection - Metadata produced by the rectangle detector.
 * @returns {{
 *   left: number,
 *   top: number,
 *   width: number,
 *   height: number,
 *   center: { x: number, y: number },
 *   angle: 0,
 *   corners: Array<{ x: number, y: number }>
 * }|null} Axis-aligned rectangle geometry.
 */
export function fitRectangle(points, detection) {
  const validPoints = getValidPoints(points);

  if (validPoints.length < 4) {
    return null;
  }

  const detectedBounds = detection?.metadata?.boundingBox;
  const bounds = hasUsableBounds(detectedBounds)
    ? detectedBounds
    : boundingBox(validPoints);

  if (!hasUsableBounds(bounds)) {
    return null;
  }

  const corners = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ];

  return {
    left: bounds.minX,
    top: bounds.minY,
    width: bounds.width,
    height: bounds.height,
    center: {
      x: bounds.centerX,
      y: bounds.centerY,
    },
    angle: 0,
    corners,
  };
}

/**
 * Determine whether a value contains a finite, positive bounding box.
 *
 * @param {unknown} bounds - Candidate bounds.
 * @returns {boolean} Whether the bounds are usable.
 */
function hasUsableBounds(bounds) {
  return (
    bounds !== null &&
    typeof bounds === "object" &&
    Number.isFinite(bounds.minX) &&
    Number.isFinite(bounds.minY) &&
    Number.isFinite(bounds.maxX) &&
    Number.isFinite(bounds.maxY) &&
    Number.isFinite(bounds.width) &&
    Number.isFinite(bounds.height) &&
    Number.isFinite(bounds.centerX) &&
    Number.isFinite(bounds.centerY) &&
    bounds.width > 0 &&
    bounds.height > 0
  );
}
