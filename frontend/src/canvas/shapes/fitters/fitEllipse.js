import {
  calculatePrincipalAxes,
  getValidPoints,
  isFinitePoint,
  normalizeHalfTurn,
} from "./fitUtils.js";

/**
 * Compute best-fit ellipse geometry after ellipse intent has been detected.
 *
 * @param {Array<{ x: number, y: number }>} points - Ordered stroke points.
 * @param {object|null} detection - Metadata produced by the ellipse detector.
 * @returns {{
 *   center: { x: number, y: number },
 *   radiusX: number,
 *   radiusY: number,
 *   majorAxis: number,
 *   minorAxis: number,
 *   angle: number
 * }|null} Oriented ellipse geometry, with angle in radians.
 */
export function fitEllipse(points, detection) {
  const validPoints = getValidPoints(points);

  if (validPoints.length < 5) {
    return null;
  }

  const metadata = detection?.metadata;
  const detectedCenter = isFinitePoint(metadata?.center)
    ? metadata.center
    : null;
  const axes = calculatePrincipalAxes(validPoints, detectedCenter);

  if (axes === null) {
    return null;
  }

  let radiusX =
    Number.isFinite(metadata?.majorAxis) && metadata.majorAxis > 0
      ? metadata.majorAxis / 2
      : axes.radiusX;
  let radiusY =
    Number.isFinite(metadata?.minorAxis) && metadata.minorAxis > 0
      ? metadata.minorAxis / 2
      : axes.radiusY;
  let angle = Number.isFinite(metadata?.angle)
    ? metadata.angle
    : axes.angle;

  if (radiusY > radiusX) {
    [radiusX, radiusY] = [radiusY, radiusX];
    angle = normalizeHalfTurn(angle + Math.PI / 2);
  }

  if (
    !Number.isFinite(radiusX) ||
    !Number.isFinite(radiusY) ||
    radiusX <= 0 ||
    radiusY <= 0
  ) {
    return null;
  }

  return {
    center: { ...axes.center },
    radiusX,
    radiusY,
    majorAxis: radiusX * 2,
    minorAxis: radiusY * 2,
    angle,
  };
}
