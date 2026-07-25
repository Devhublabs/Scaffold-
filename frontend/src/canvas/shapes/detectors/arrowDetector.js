import {
  angleBetween,
  boundingBox,
  distance,
  isClosedShape,
  pathLength,
} from "../utils/index.js";

const MINIMUM_POINT_COUNT = 5;
const MINIMUM_STROKE_LENGTH = 20;
const MINIMUM_CLOSURE_THRESHOLD = 3;
const MAXIMUM_CLOSURE_THRESHOLD = 12;
const CLOSURE_SCALE_RATIO = 0.05;
const MINIMUM_HEAD_SIZE_RATIO = 0.08;
const MAXIMUM_HEAD_SIZE_RATIO = 0.65;
const MINIMUM_TIP_PROGRESS = 0.25;
const MAXIMUM_TIP_PROGRESS = 0.9;
const TIP_DISTANCE_TOLERANCE = 0.97;
const MINIMUM_CONFIDENCE = 0.72;

/**
 * Detect whether a stroke resembles an arrow.
 *
 * The detector assumes a common single-stroke order: a dominant shaft reaches
 * the arrow tip before the stroke traces head branches behind that tip.
 *
 * @param {Array<{ x: number, y: number }>} points - Ordered stroke points.
 * @returns {{
 *   type: "arrow",
 *   confidence: number,
 *   metadata: { direction: number }
 * }|null} Arrow detection result, or null when confidence is insufficient.
 */
export function detectArrow(points) {
  if (!Array.isArray(points) || points.length < MINIMUM_POINT_COUNT) {
    return null;
  }

  const bounds = boundingBox(points);

  if (bounds === null || !hasUsableBounds(bounds)) {
    return null;
  }

  const diagonal = Math.hypot(bounds.width, bounds.height);

  if (!Number.isFinite(diagonal) || diagonal < MINIMUM_STROKE_LENGTH) {
    return null;
  }

  const closureThreshold = clamp(
    diagonal * CLOSURE_SCALE_RATIO,
    MINIMUM_CLOSURE_THRESHOLD,
    MAXIMUM_CLOSURE_THRESHOLD,
  );

  if (isClosedShape(points, closureThreshold)) {
    return null;
  }

  const shaftStart = points[0];
  const tip = findFarthestPoint(points, shaftStart);

  if (
    tip === null ||
    tip.index <= 0 ||
    tip.index >= points.length - 2
  ) {
    return null;
  }

  const shaftLength = tip.distance;
  const shaftPathLength = pathLength(points.slice(0, tip.index + 1));
  const strokeLength = pathLength(points);
  const direction = angleBetween(shaftStart, tip.point);

  if (
    shaftPathLength === null ||
    strokeLength === null ||
    direction === null ||
    !Number.isFinite(shaftLength) ||
    !Number.isFinite(shaftPathLength) ||
    !Number.isFinite(strokeLength) ||
    shaftLength <= 0 ||
    shaftPathLength <= 0 ||
    strokeLength <= 0
  ) {
    return null;
  }

  const tipProgress = shaftPathLength / strokeLength;

  if (
    tipProgress < MINIMUM_TIP_PROGRESS ||
    tipProgress > MAXIMUM_TIP_PROGRESS
  ) {
    return null;
  }

  const headMetrics = analyzeArrowhead(
    points.slice(tip.index + 1),
    tip.point,
    direction,
    shaftLength,
  );

  if (headMetrics === null) {
    return null;
  }

  const shaftScore = clampScore(shaftLength / shaftPathLength);
  const headSizeScore = clampScore(
    1 - Math.abs(headMetrics.sizeRatio - 0.3) / 0.3,
  );
  const confidence = clampScore(
    shaftScore * 0.4 +
      headMetrics.behindScore * 0.15 +
      headMetrics.branchBalanceScore * 0.2 +
      headMetrics.branchAngleScore * 0.15 +
      headSizeScore * 0.1,
  );

  if (confidence < MINIMUM_CONFIDENCE) {
    return null;
  }

  return {
    type: "arrow",
    confidence,
    metadata: {
      direction,
    },
  };
}

/**
 * Find the first farthest point from a stroke origin.
 *
 * @param {Array<{ x: number, y: number }>} points - Stroke points.
 * @param {{ x: number, y: number }} origin - Shaft origin.
 * @returns {{ point: { x: number, y: number }, index: number, distance: number }|null}
 */
function findFarthestPoint(points, origin) {
  const distances = [];
  let maximumDistance = 0;

  for (let index = 1; index < points.length; index += 1) {
    const pointDistance = distance(origin, points[index]);

    if (pointDistance === null || !Number.isFinite(pointDistance)) {
      return null;
    }

    distances.push({ point: points[index], index, distance: pointDistance });
    maximumDistance = Math.max(maximumDistance, pointDistance);
  }

  return (
    distances.find(
      (candidate) =>
        candidate.distance >= maximumDistance * TIP_DISTANCE_TOLERANCE,
    ) ?? null
  );
}

/**
 * Analyze arrowhead points relative to the shaft direction.
 *
 * @param {Array<{ x: number, y: number }>} points - Points drawn after the tip.
 * @param {{ x: number, y: number }} tip - Arrow tip.
 * @param {number} direction - Shaft direction in radians.
 * @param {number} shaftLength - Direct shaft length.
 * @returns {{
 *   behindScore: number,
 *   branchBalanceScore: number,
 *   branchAngleScore: number,
 *   sizeRatio: number
 * }|null} Arrowhead metrics.
 */
function analyzeArrowhead(points, tip, direction, shaftLength) {
  const directionX = Math.cos(direction);
  const directionY = Math.sin(direction);
  const minimumBranchLength = shaftLength * 0.03;
  let usablePointCount = 0;
  let behindPointCount = 0;
  let positiveLateralExtent = 0;
  let negativeLateralExtent = 0;
  let maximumHeadLength = 0;
  let branchAngleScoreSum = 0;

  for (const point of points) {
    const relativeX = point.x - tip.x;
    const relativeY = point.y - tip.y;
    const headLength = Math.hypot(relativeX, relativeY);

    if (!Number.isFinite(headLength)) {
      return null;
    }

    if (headLength < minimumBranchLength) {
      continue;
    }

    const projection = relativeX * directionX + relativeY * directionY;
    const lateral = directionX * relativeY - directionY * relativeX;
    const backwardComponent = clampScore(-projection / headLength);
    const lateralComponent = clampScore(Math.abs(lateral) / headLength);

    usablePointCount += 1;
    behindPointCount += projection < 0 ? 1 : 0;
    maximumHeadLength = Math.max(maximumHeadLength, headLength);
    branchAngleScoreSum += Math.min(
      clampScore(backwardComponent / 0.4),
      clampScore(lateralComponent / 0.3),
    );

    if (lateral > 0) {
      positiveLateralExtent = Math.max(positiveLateralExtent, lateral);
    } else {
      negativeLateralExtent = Math.max(negativeLateralExtent, -lateral);
    }
  }

  if (
    usablePointCount < 2 ||
    positiveLateralExtent <= 0 ||
    negativeLateralExtent <= 0 ||
    maximumHeadLength <= 0
  ) {
    return null;
  }

  const sizeRatio = maximumHeadLength / shaftLength;

  if (
    sizeRatio < MINIMUM_HEAD_SIZE_RATIO ||
    sizeRatio > MAXIMUM_HEAD_SIZE_RATIO
  ) {
    return null;
  }

  return {
    behindScore: behindPointCount / usablePointCount,
    branchBalanceScore:
      Math.min(positiveLateralExtent, negativeLateralExtent) /
      Math.max(positiveLateralExtent, negativeLateralExtent),
    branchAngleScore: branchAngleScoreSum / usablePointCount,
    sizeRatio,
  };
}

/**
 * Determine whether stroke bounds describe a non-dot geometry.
 *
 * @param {{ width: number, height: number }} bounds - Stroke bounds.
 * @returns {boolean} Whether the bounds are usable.
 */
function hasUsableBounds(bounds) {
  return (
    Number.isFinite(bounds.width) &&
    Number.isFinite(bounds.height) &&
    (bounds.width > 1 || bounds.height > 1)
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
