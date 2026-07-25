import { fitEllipse } from "./fitEllipse.js";
import {
  calculatePrincipalAxes,
  findNearestPointIndex,
  getValidPoints,
  isFinitePoint,
  projectPointToEllipse,
  resampleClosedPath,
} from "./fitUtils.js";

const RESAMPLE_COUNT = 64;
const TAIL_WINDOW_RATIO = 0.09;

/**
 * Compute best-fit speech bubble geometry after speech bubble intent is detected.
 *
 * @param {Array<{ x: number, y: number }>} points - Ordered stroke points.
 * @param {object|null} detection - Metadata from the speech bubble detector.
 * @returns {{
 *   body: {
 *     center: { x: number, y: number },
 *     radiusX: number,
 *     radiusY: number,
 *     majorAxis: number,
 *     minorAxis: number,
 *     angle: number
 *   },
 *   tail: {
 *     tip: { x: number, y: number },
 *     anchor: { x: number, y: number },
 *     baseStart: { x: number, y: number },
 *     baseEnd: { x: number, y: number }
 *   }
 * }|null} Elliptical body and triangular tail geometry.
 */
export function fitSpeechBubble(points, detection) {
  const validPoints = getValidPoints(points);

  if (validPoints.length < 10) {
    return null;
  }

  const samples = resampleClosedPath(validPoints, RESAMPLE_COUNT);

  if (samples === null) {
    return null;
  }

  const detectedTail = detection?.metadata?.tailPosition;
  const tailTip = isFinitePoint(detectedTail)
    ? { x: detectedTail.x, y: detectedTail.y }
    : findRadialOutlier(samples);

  if (tailTip === null) {
    return null;
  }

  const tailIndex = findNearestPointIndex(samples, tailTip);

  if (tailIndex === null) {
    return null;
  }

  const halfWindow = Math.max(
    2,
    Math.round(samples.length * TAIL_WINDOW_RATIO),
  );
  const bodyPoints = samples.filter(
    (_, index) =>
      circularIndexDistance(index, tailIndex, samples.length) > halfWindow,
  );
  const body = fitEllipse(bodyPoints, null);

  if (body === null) {
    return null;
  }

  const beforeTail =
    samples[
      (tailIndex - halfWindow - 1 + samples.length) % samples.length
    ];
  const afterTail =
    samples[(tailIndex + halfWindow + 1) % samples.length];
  const baseStart = projectPointToEllipse(beforeTail, body);
  const baseEnd = projectPointToEllipse(afterTail, body);
  const anchor = projectPointToEllipse(tailTip, body);

  if (baseStart === null || baseEnd === null || anchor === null) {
    return null;
  }

  return {
    body,
    tail: {
      tip: tailTip,
      anchor,
      baseStart,
      baseEnd,
    },
  };
}

/**
 * Find the strongest radial outlier when detector metadata is unavailable.
 *
 * @param {Array<{ x: number, y: number }>} points - Uniform contour samples.
 * @returns {{ x: number, y: number }|null} Farthest normalized ellipse point.
 */
function findRadialOutlier(points) {
  const axes = calculatePrincipalAxes(points);

  if (axes === null) {
    return null;
  }

  const cosine = Math.cos(axes.angle);
  const sine = Math.sin(axes.angle);
  let outlier = null;
  let maximumRadius = 0;

  for (const point of points) {
    const deltaX = point.x - axes.center.x;
    const deltaY = point.y - axes.center.y;
    const localX = deltaX * cosine + deltaY * sine;
    const localY = -deltaX * sine + deltaY * cosine;
    const normalizedRadius = Math.hypot(
      localX / axes.radiusX,
      localY / axes.radiusY,
    );

    if (!Number.isFinite(normalizedRadius)) {
      return null;
    }

    if (normalizedRadius > maximumRadius) {
      maximumRadius = normalizedRadius;
      outlier = point;
    }
  }

  return outlier ? { ...outlier } : null;
}

/**
 * Calculate shortest distance between two circular indices.
 *
 * @param {number} first - First index.
 * @param {number} second - Second index.
 * @param {number} count - Sample count.
 * @returns {number} Circular index distance.
 */
function circularIndexDistance(first, second, count) {
  const directDistance = Math.abs(first - second);
  return Math.min(directDistance, count - directDistance);
}
