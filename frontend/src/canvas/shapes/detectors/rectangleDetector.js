import {
  boundingBox,
  distance,
  isClosedShape,
  pathLength,
} from "../utils/index.js";

const MINIMUM_POINT_COUNT = 4;
const MINIMUM_DIMENSION = 8;
const MINIMUM_CLOSURE_THRESHOLD = 4;
const MAXIMUM_CLOSURE_THRESHOLD = 96;
const CLOSURE_SCALE_RATIO = 0.25;
const EDGE_TOLERANCE_RATIO = 0.15;
const CORNER_TOLERANCE_RATIO = 0.15;
const MINIMUM_CONFIDENCE = 0.75;

/**
 * Detect whether a stroke resembles a rectangle.
 *
 * Confidence combines closure, proximity to the four bounding-box edges,
 * corner coverage, horizontal or vertical segment alignment, perimeter
 * agreement, and opposite-side similarity.
 *
 * @param {Array<{ x: number, y: number }>} points - Ordered stroke points.
 * @returns {{
 *   type: "rectangle",
 *   confidence: number,
 *   metadata: {
 *     corners: Array<{ x: number, y: number }>,
 *     boundingBox: {
 *       minX: number,
 *       minY: number,
 *       maxX: number,
 *       maxY: number,
 *       width: number,
 *       height: number,
 *       centerX: number,
 *       centerY: number
 *     }
 *   }
 * }|null} Rectangle detection result, or null when confidence is insufficient.
 */
export function detectRectangle(points) {
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

  const strokeLength = pathLength(points);
  const closureDistance = distance(points[points.length - 1], points[0]);

  if (
    strokeLength === null ||
    closureDistance === null ||
    !Number.isFinite(strokeLength) ||
    strokeLength <= 0
  ) {
    return null;
  }

  const targetCorners = getBoundingCorners(bounds);
  const corners = targetCorners.map((corner) =>
    findClosestPoint(points, corner),
  );
  const edgeScore = calculateEdgeScore(points, bounds);
  const cornerScore = calculateCornerScore(corners, targetCorners, diagonal);
  const alignmentScore = calculateAxisAlignmentScore(points);
  const perimeterScore = calculatePerimeterScore(
    strokeLength + closureDistance,
    bounds,
  );
  const oppositeSideScore = calculateOppositeSideScore(corners);

  if (
    edgeScore === null ||
    cornerScore === null ||
    alignmentScore === null ||
    perimeterScore === null ||
    oppositeSideScore === null
  ) {
    return null;
  }

  const confidence = clampScore(
    edgeScore * 0.3 +
      cornerScore * 0.2 +
      alignmentScore * 0.2 +
      perimeterScore * 0.15 +
      oppositeSideScore * 0.15,
  );

  if (confidence < MINIMUM_CONFIDENCE) {
    return null;
  }

  return {
    type: "rectangle",
    confidence,
    metadata: {
      corners,
      boundingBox: bounds,
    },
  };
}

/**
 * Build clockwise corners from an axis-aligned bounding box.
 *
 * @param {{ minX: number, minY: number, maxX: number, maxY: number }} bounds
 * @returns {Array<{ x: number, y: number }>} Bounding-box corners.
 */
function getBoundingCorners(bounds) {
  return [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ];
}

/**
 * Find the stroke point nearest to a target location.
 *
 * @param {Array<{ x: number, y: number }>} points - Stroke points.
 * @param {{ x: number, y: number }} target - Target location.
 * @returns {{ x: number, y: number }} A copy of the closest point.
 */
function findClosestPoint(points, target) {
  let closestPoint = points[0];
  let closestDistance = distance(points[0], target);

  for (let index = 1; index < points.length; index += 1) {
    const candidateDistance = distance(points[index], target);

    if (
      candidateDistance !== null &&
      closestDistance !== null &&
      candidateDistance < closestDistance
    ) {
      closestPoint = points[index];
      closestDistance = candidateDistance;
    }
  }

  return { x: closestPoint.x, y: closestPoint.y };
}

/**
 * Score how closely stroke points follow the bounding-box perimeter.
 *
 * @param {Array<{ x: number, y: number }>} points - Stroke points.
 * @param {{ minX: number, minY: number, maxX: number, maxY: number, width: number, height: number }} bounds
 * @returns {number|null} Edge adherence score.
 */
function calculateEdgeScore(points, bounds) {
  const tolerance = Math.min(bounds.width, bounds.height) * EDGE_TOLERANCE_RATIO;

  if (tolerance <= 0) {
    return null;
  }

  let totalDistance = 0;

  for (const point of points) {
    totalDistance += Math.min(
      Math.abs(point.x - bounds.minX),
      Math.abs(point.x - bounds.maxX),
      Math.abs(point.y - bounds.minY),
      Math.abs(point.y - bounds.maxY),
    );
  }

  return clampScore(1 - totalDistance / points.length / tolerance);
}

/**
 * Score how closely the stroke reaches all four bounding-box corners.
 *
 * @param {Array<{ x: number, y: number }>} corners - Detected corner points.
 * @param {Array<{ x: number, y: number }>} targets - Bounding-box corners.
 * @param {number} diagonal - Bounding-box diagonal.
 * @returns {number|null} Corner coverage score.
 */
function calculateCornerScore(corners, targets, diagonal) {
  const tolerance = diagonal * CORNER_TOLERANCE_RATIO;

  if (tolerance <= 0) {
    return null;
  }

  let totalDistance = 0;

  for (let index = 0; index < corners.length; index += 1) {
    const cornerDistance = distance(corners[index], targets[index]);

    if (cornerDistance === null) {
      return null;
    }

    totalDistance += cornerDistance;
  }

  return clampScore(1 - totalDistance / corners.length / tolerance);
}

/**
 * Score whether stroke segments are predominantly horizontal or vertical.
 *
 * @param {Array<{ x: number, y: number }>} points - Ordered stroke points.
 * @returns {number|null} Length-weighted axis alignment score.
 */
function calculateAxisAlignmentScore(points) {
  let weightedAlignment = 0;
  let measuredLength = 0;

  for (let index = 1; index < points.length; index += 1) {
    const deltaX = Math.abs(points[index].x - points[index - 1].x);
    const deltaY = Math.abs(points[index].y - points[index - 1].y);
    const segmentLength = distance(points[index - 1], points[index]);

    if (segmentLength === null) {
      return null;
    }

    const dominantDelta = Math.max(deltaX, deltaY);

    if (segmentLength === 0 || dominantDelta === 0) {
      continue;
    }

    const alignment = 1 - Math.min(deltaX, deltaY) / dominantDelta;
    weightedAlignment += alignment * segmentLength;
    measuredLength += segmentLength;
  }

  return measuredLength > 0 ? clampScore(weightedAlignment / measuredLength) : null;
}

/**
 * Compare the measured stroke perimeter with its bounding-box perimeter.
 *
 * @param {number} measuredPerimeter - Stroke length including its closure gap.
 * @param {{ width: number, height: number }} bounds - Stroke bounds.
 * @returns {number|null} Perimeter agreement score.
 */
function calculatePerimeterScore(measuredPerimeter, bounds) {
  const expectedPerimeter = 2 * (bounds.width + bounds.height);

  if (expectedPerimeter <= 0) {
    return null;
  }

  return clampScore(
    1 - Math.abs(measuredPerimeter - expectedPerimeter) / expectedPerimeter,
  );
}

/**
 * Compare lengths of opposite sides formed by the detected corners.
 *
 * @param {Array<{ x: number, y: number }>} corners - Clockwise corner points.
 * @returns {number|null} Opposite-side similarity score.
 */
function calculateOppositeSideScore(corners) {
  const sideLengths = corners.map((corner, index) =>
    distance(corner, corners[(index + 1) % corners.length]),
  );

  if (sideLengths.some((sideLength) => sideLength === null)) {
    return null;
  }

  const horizontalSimilarity = ratioSimilarity(sideLengths[0], sideLengths[2]);
  const verticalSimilarity = ratioSimilarity(sideLengths[1], sideLengths[3]);

  return (horizontalSimilarity + verticalSimilarity) / 2;
}

/**
 * Compare two non-negative values as a ratio from zero to one.
 *
 * @param {number} firstValue - First value.
 * @param {number} secondValue - Second value.
 * @returns {number} Similarity score.
 */
function ratioSimilarity(firstValue, secondValue) {
  const maximum = Math.max(firstValue, secondValue);
  return maximum > 0 ? Math.min(firstValue, secondValue) / maximum : 0;
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
