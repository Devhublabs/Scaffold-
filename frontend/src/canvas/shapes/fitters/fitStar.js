import {
  angleBetween,
  centroid,
  normalizeAngle,
} from "../utils/index.js";
import {
  getValidPoints,
  resampleClosedPath,
} from "./fitUtils.js";

const RESAMPLE_COUNT = 128;

/**
 * Compute best-fit star geometry after star intent has been detected.
 *
 * @param {Array<{ x: number, y: number }>} points - Ordered stroke points.
 * @param {object|null} detection - Metadata produced by the star detector.
 * @returns {{
 *   center: { x: number, y: number },
 *   points: number,
 *   outerRadius: number,
 *   innerRadius: number,
 *   rotation: number,
 *   vertices: Array<{ x: number, y: number }>,
 *   closed: true
 * }|null} Regularized star geometry.
 */
export function fitStar(points, detection) {
  const validPoints = getValidPoints(points);
  const pointCount = detection?.metadata?.points;

  if (
    validPoints.length < 10 ||
    !Number.isInteger(pointCount) ||
    pointCount < 3 ||
    pointCount > 12
  ) {
    return null;
  }

  const samples = resampleClosedPath(validPoints, RESAMPLE_COUNT);

  if (samples === null) {
    return null;
  }

  const center = centroid(samples);

  if (center === null) {
    return null;
  }

  const polarSamples = [];

  for (const point of samples) {
    const angle = angleBetween(center, point);
    const normalized = angle === null ? null : normalizeAngle(angle);
    const radius = Math.hypot(point.x - center.x, point.y - center.y);

    if (
      normalized === null ||
      !Number.isFinite(radius) ||
      radius <= 0
    ) {
      return null;
    }

    polarSamples.push({ angle: normalized, radius });
  }

  const farthestSample = polarSamples.reduce((farthest, sample) =>
    sample.radius > farthest.radius ? sample : farthest,
  );
  const pointSpacing = (Math.PI * 2) / pointCount;
  let rotation = farthestSample.angle;
  const outerMeasurements = [];

  for (let index = 0; index < pointCount; index += 1) {
    const targetAngle = rotation + index * pointSpacing;
    outerMeasurements.push(findSampleAtAngle(polarSamples, targetAngle));
  }

  const meanCorrection =
    outerMeasurements.reduce(
      (sum, sample, index) =>
        sum +
        smallestSignedAngle(
          sample.angle - (rotation + index * pointSpacing),
        ),
      0,
    ) / pointCount;
  const normalizedRotation = normalizeAngle(rotation + meanCorrection);

  if (normalizedRotation === null) {
    return null;
  }

  rotation = normalizedRotation;
  const outerRadii = [];
  const innerRadii = [];

  for (let index = 0; index < pointCount; index += 1) {
    outerRadii.push(
      findSampleAtAngle(
        polarSamples,
        rotation + index * pointSpacing,
      ).radius,
    );
    innerRadii.push(
      findSampleAtAngle(
        polarSamples,
        rotation + (index + 0.5) * pointSpacing,
      ).radius,
    );
  }

  const outerRadius = mean(outerRadii);
  const innerRadius = mean(innerRadii);

  if (
    !Number.isFinite(outerRadius) ||
    !Number.isFinite(innerRadius) ||
    outerRadius <= 0 ||
    innerRadius <= 0 ||
    innerRadius >= outerRadius
  ) {
    return null;
  }

  const vertices = [];

  for (let index = 0; index < pointCount * 2; index += 1) {
    const angle = rotation + (index * Math.PI) / pointCount;
    const radius = index % 2 === 0 ? outerRadius : innerRadius;

    vertices.push({
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    });
  }

  return {
    center,
    points: pointCount,
    outerRadius,
    innerRadius,
    rotation,
    vertices,
    closed: true,
  };
}

/**
 * Find the contour sample nearest to an angular ray.
 *
 * @param {Array<{ angle: number, radius: number }>} samples - Polar samples.
 * @param {number} targetAngle - Target ray angle.
 * @returns {{ angle: number, radius: number }} Nearest angular sample.
 */
function findSampleAtAngle(samples, targetAngle) {
  return samples.reduce((nearest, sample) => {
    const candidateDifference = Math.abs(
      smallestSignedAngle(sample.angle - targetAngle),
    );
    const nearestDifference = Math.abs(
      smallestSignedAngle(nearest.angle - targetAngle),
    );

    return candidateDifference < nearestDifference ? sample : nearest;
  });
}

/**
 * Normalize a signed angle difference to [-PI, PI).
 *
 * @param {number} angle - Raw angle difference.
 * @returns {number} Smallest signed angle.
 */
function smallestSignedAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/**
 * Calculate an arithmetic mean.
 *
 * @param {Array<number>} values - Numeric values.
 * @returns {number} Mean value.
 */
function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
