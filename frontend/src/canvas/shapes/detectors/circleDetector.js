import {
  boundingBox,
  centroid,
  distance,
  isClosedShape,
  pathLength,
} from "../utils/index.js";

const MINIMUM_POINT_COUNT = 6;
const MINIMUM_DIMENSION = 8;
const MINIMUM_CLOSURE_THRESHOLD = 4;
const MAXIMUM_CLOSURE_THRESHOLD = 20;
const CLOSURE_SCALE_RATIO = 0.12;
const MAXIMUM_RADIUS_VARIATION = 0.2;
const MINIMUM_CONFIDENCE = 0.78;

/**
 * Detect whether a stroke resembles a circle.
 *
 * Confidence combines closure, radial consistency around the centroid,
 * bounding-box aspect ratio, circumference agreement, and center alignment.
 *
 * @param {Array<{ x: number, y: number }>} points - Ordered stroke points.
 * @returns {{
 *   type: "circle",
 *   confidence: number,
 *   metadata: {
 *     center: { x: number, y: number },
 *     radius: number
 *   }
 * }|null} Circle detection result, or null when confidence is insufficient.
 */
export function detectCircle(points) {
  if (!Array.isArray(points) || points.length < MINIMUM_POINT_COUNT) {
    return null;
  }

  const bounds = boundingBox(points);

  if (
    bounds === null ||
    !hasUsableDimensions(bounds) ||
    bounds.width < MINIMUM_DIMENSION ||
    bounds.height < MINIMUM_DIMENSION
  ) {
    return null;
  }

  const diagonal = Math.hypot(bounds.width, bounds.height);
  const closureThreshold = clamp(
    diagonal * CLOSURE_SCALE_RATIO,
    MINIMUM_CLOSURE_THRESHOLD,
    MAXIMUM_CLOSURE_THRESHOLD,
  );

  if (!isClosedShape(points, closureThreshold)) {
    return null;
  }

  const center = centroid(points);
  const strokeLength = pathLength(points);
  const closureDistance = distance(points[points.length - 1], points[0]);

  if (
    center === null ||
    strokeLength === null ||
    closureDistance === null ||
    !Number.isFinite(strokeLength) ||
    strokeLength <= 0
  ) {
    return null;
  }

  const radialMetrics = calculateRadialMetrics(points, center);

  if (radialMetrics === null || radialMetrics.meanRadius <= 0) {
    return null;
  }

  const radiusVariation = radialMetrics.standardDeviation / radialMetrics.meanRadius;
  const radialScore = clampScore(
    1 - radiusVariation / MAXIMUM_RADIUS_VARIATION,
  );
  const aspectScore =
    Math.min(bounds.width, bounds.height) /
    Math.max(bounds.width, bounds.height);
  const expectedCircumference = Math.PI * 2 * radialMetrics.meanRadius;
  const measuredCircumference = strokeLength + closureDistance;
  const circumferenceScore = clampScore(
    1 -
      Math.abs(measuredCircumference - expectedCircumference) /
        expectedCircumference,
  );
  const boundsCenter = { x: bounds.centerX, y: bounds.centerY };
  const centerOffset = distance(center, boundsCenter);

  if (centerOffset === null) {
    return null;
  }

  const centerScore = clampScore(
    1 - centerOffset / (radialMetrics.meanRadius * 0.2),
  );
  const confidence = clampScore(
    radialScore * 0.5 +
      aspectScore * 0.2 +
      circumferenceScore * 0.2 +
      centerScore * 0.1,
  );

  if (confidence < MINIMUM_CONFIDENCE) {
    return null;
  }

  return {
    type: "circle",
    confidence,
    metadata: {
      center,
      radius: radialMetrics.meanRadius,
    },
  };
}

/**
 * Calculate mean radius and radial standard deviation around a center.
 *
 * @param {Array<{ x: number, y: number }>} points - Stroke points.
 * @param {{ x: number, y: number }} center - Candidate circle center.
 * @returns {{ meanRadius: number, standardDeviation: number }|null} Radial metrics.
 */
function calculateRadialMetrics(points, center) {
  const radii = [];
  let radiusSum = 0;

  for (const point of points) {
    const radius = distance(center, point);

    if (radius === null || !Number.isFinite(radius)) {
      return null;
    }

    radii.push(radius);
    radiusSum += radius;
  }

  const meanRadius = radiusSum / radii.length;
  let squaredDeviationSum = 0;

  for (const radius of radii) {
    const deviation = radius - meanRadius;
    squaredDeviationSum += deviation * deviation;
  }

  return {
    meanRadius,
    standardDeviation: Math.sqrt(squaredDeviationSum / radii.length),
  };
}

/**
 * Determine whether bounding-box dimensions are finite and positive.
 *
 * @param {{ width: number, height: number }} bounds - Stroke bounds.
 * @returns {boolean} Whether the dimensions can be analyzed.
 */
function hasUsableDimensions(bounds) {
  return (
    Number.isFinite(bounds.width) &&
    Number.isFinite(bounds.height) &&
    bounds.width > 0 &&
    bounds.height > 0
  );
}

/**
 * Clamp a numeric value to an inclusive range.
 *
 * @param {number} value - Value to clamp.
 * @param {number} minimum - Minimum allowed value.
 * @param {number} maximum - Maximum allowed value.
 * @returns {number} Clamped value.
 */
function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Clamp a confidence score to the inclusive range from zero to one.
 *
 * @param {number} score - Score to clamp.
 * @returns {number} Clamped score.
 */
function clampScore(score) {
  return clamp(score, 0, 1);
}
