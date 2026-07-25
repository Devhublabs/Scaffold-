import {
  centroid,
  distance,
  normalizeAngle,
  pathLength,
} from "../utils/index.js";

/**
 * Copy finite points from an arbitrary input array.
 *
 * @param {unknown} points - Candidate point collection.
 * @returns {Array<{ x: number, y: number }>} Finite point copies.
 */
export function getValidPoints(points) {
  if (!Array.isArray(points)) {
    return [];
  }

  return points
    .filter(isFinitePoint)
    .map((point) => ({ x: point.x, y: point.y }));
}

/**
 * Estimate oriented ellipse axes from point covariance.
 *
 * @param {Array<{ x: number, y: number }>} points - Finite points.
 * @param {{ x: number, y: number }|null} [preferredCenter=null] - Optional center.
 * @returns {{
 *   center: { x: number, y: number },
 *   radiusX: number,
 *   radiusY: number,
 *   angle: number
 * }|null} Principal-axis ellipse geometry.
 */
export function calculatePrincipalAxes(points, preferredCenter = null) {
  if (!Array.isArray(points) || points.length < 3) {
    return null;
  }

  const center = isFinitePoint(preferredCenter)
    ? { x: preferredCenter.x, y: preferredCenter.y }
    : centroid(points);

  if (center === null) {
    return null;
  }

  let covarianceXX = 0;
  let covarianceYY = 0;
  let covarianceXY = 0;

  for (const point of points) {
    const deltaX = point.x - center.x;
    const deltaY = point.y - center.y;

    covarianceXX += deltaX * deltaX;
    covarianceYY += deltaY * deltaY;
    covarianceXY += deltaX * deltaY;
  }

  covarianceXX /= points.length;
  covarianceYY /= points.length;
  covarianceXY /= points.length;

  const trace = covarianceXX + covarianceYY;
  const discriminant = Math.hypot(
    covarianceXX - covarianceYY,
    covarianceXY * 2,
  );
  const majorEigenvalue = (trace + discriminant) / 2;
  const minorEigenvalue = (trace - discriminant) / 2;

  if (
    !Number.isFinite(majorEigenvalue) ||
    !Number.isFinite(minorEigenvalue) ||
    majorEigenvalue <= 0 ||
    minorEigenvalue <= 0
  ) {
    return null;
  }

  return {
    center,
    radiusX: Math.sqrt(majorEigenvalue * 2),
    radiusY: Math.sqrt(minorEigenvalue * 2),
    angle: normalizeHalfTurn(
      0.5 * Math.atan2(covarianceXY * 2, covarianceXX - covarianceYY),
    ),
  };
}

/**
 * Uniformly resample a closed path by travelled contour distance.
 *
 * @param {Array<{ x: number, y: number }>} points - Closed contour points.
 * @param {number} sampleCount - Number of samples to produce.
 * @returns {Array<{ x: number, y: number }>|null} Uniform contour samples.
 */
export function resampleClosedPath(points, sampleCount) {
  if (
    !Array.isArray(points) ||
    points.length < 2 ||
    !Number.isInteger(sampleCount) ||
    sampleCount < 3
  ) {
    return null;
  }

  const loopPoints = points.map((point) => ({ x: point.x, y: point.y }));
  const closingDistance = distance(
    loopPoints[loopPoints.length - 1],
    loopPoints[0],
  );

  if (closingDistance === null) {
    return null;
  }

  if (closingDistance > 0) {
    loopPoints.push({ ...loopPoints[0] });
  }

  const totalLength = pathLength(loopPoints);

  if (
    totalLength === null ||
    !Number.isFinite(totalLength) ||
    totalLength <= 0
  ) {
    return null;
  }

  const spacing = totalLength / sampleCount;
  const samples = [{ ...loopPoints[0] }];
  let traversedLength = 0;
  let targetLength = spacing;

  for (
    let index = 1;
    index < loopPoints.length && samples.length < sampleCount;
    index += 1
  ) {
    const segmentStart = loopPoints[index - 1];
    const segmentEnd = loopPoints[index];
    const segmentLength = distance(segmentStart, segmentEnd);

    if (segmentLength === null || segmentLength === 0) {
      continue;
    }

    while (
      traversedLength + segmentLength >= targetLength &&
      samples.length < sampleCount
    ) {
      const interpolation =
        (targetLength - traversedLength) / segmentLength;

      samples.push({
        x:
          segmentStart.x +
          (segmentEnd.x - segmentStart.x) * interpolation,
        y:
          segmentStart.y +
          (segmentEnd.y - segmentStart.y) * interpolation,
      });
      targetLength += spacing;
    }

    traversedLength += segmentLength;
  }

  return samples.length === sampleCount ? samples : null;
}

/**
 * Find the point index nearest to a target.
 *
 * @param {Array<{ x: number, y: number }>} points - Finite points.
 * @param {{ x: number, y: number }} target - Target point.
 * @returns {number|null} Nearest point index.
 */
export function findNearestPointIndex(points, target) {
  if (!Array.isArray(points) || points.length === 0 || !isFinitePoint(target)) {
    return null;
  }

  let nearestIndex = 0;
  let nearestDistance = distance(points[0], target);

  if (nearestDistance === null) {
    return null;
  }

  for (let index = 1; index < points.length; index += 1) {
    const candidateDistance = distance(points[index], target);

    if (candidateDistance === null) {
      return null;
    }

    if (candidateDistance < nearestDistance) {
      nearestDistance = candidateDistance;
      nearestIndex = index;
    }
  }

  return nearestIndex;
}

/**
 * Project a point radially onto an oriented ellipse.
 *
 * @param {{ x: number, y: number }} point - Point outside or inside the ellipse.
 * @param {{
 *   center: { x: number, y: number },
 *   radiusX: number,
 *   radiusY: number,
 *   angle: number
 * }} ellipse - Oriented ellipse geometry.
 * @returns {{ x: number, y: number }|null} Ellipse boundary point.
 */
export function projectPointToEllipse(point, ellipse) {
  if (
    !isFinitePoint(point) ||
    !isFinitePoint(ellipse?.center) ||
    !Number.isFinite(ellipse.radiusX) ||
    !Number.isFinite(ellipse.radiusY) ||
    !Number.isFinite(ellipse.angle) ||
    ellipse.radiusX <= 0 ||
    ellipse.radiusY <= 0
  ) {
    return null;
  }

  const deltaX = point.x - ellipse.center.x;
  const deltaY = point.y - ellipse.center.y;
  const cosine = Math.cos(ellipse.angle);
  const sine = Math.sin(ellipse.angle);
  const localX = deltaX * cosine + deltaY * sine;
  const localY = -deltaX * sine + deltaY * cosine;
  const normalizedRadius = Math.hypot(
    localX / ellipse.radiusX,
    localY / ellipse.radiusY,
  );

  if (!Number.isFinite(normalizedRadius) || normalizedRadius === 0) {
    return null;
  }

  const projectedX = localX / normalizedRadius;
  const projectedY = localY / normalizedRadius;

  return {
    x:
      ellipse.center.x +
      projectedX * cosine -
      projectedY * sine,
    y:
      ellipse.center.y +
      projectedX * sine +
      projectedY * cosine,
  };
}

/**
 * Normalize an axis orientation to [-PI/2, PI/2).
 *
 * @param {number} angle - Axis orientation in radians.
 * @returns {number} Equivalent half-turn orientation.
 */
export function normalizeHalfTurn(angle) {
  const normalized = normalizeAngle(angle);

  if (normalized === null) {
    return 0;
  }

  if (normalized >= (Math.PI * 3) / 2) {
    return normalized - Math.PI * 2;
  }

  return normalized >= Math.PI / 2 ? normalized - Math.PI : normalized;
}

/**
 * Determine whether a value contains finite Cartesian coordinates.
 *
 * @param {unknown} point - Value to validate.
 * @returns {boolean} Whether the value is a finite point.
 */
export function isFinitePoint(point) {
  return (
    point !== null &&
    typeof point === "object" &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y)
  );
}
