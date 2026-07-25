import {
  angleBetween,
  boundingBox,
  distance,
  isClosedShape,
  normalizeAngle,
  pathLength,
} from "../utils/index.js";

const MINIMUM_POINT_COUNT = 6;
const MINIMUM_DIMENSION = 8;
const RESAMPLE_COUNT = 48;
const MINIMUM_CORNER_TURN = Math.PI / 9;
const MINIMUM_CORNER_SPACING = 4;
const TURN_SAMPLE_OFFSET = 2;
const CORNER_LOCAL_MAXIMUM_WINDOW = 2;
const CORNER_CONCENTRATION_WINDOW = 1;
const MINIMUM_TURN_CONCENTRATION = 0.55;
const EDGE_DEVIATION_TOLERANCE_RATIO = 0.18;
const MINIMUM_SIDES = 3;
const MAXIMUM_SIDES = 12;
const MINIMUM_CLOSURE_THRESHOLD = 4;
const MAXIMUM_CLOSURE_THRESHOLD = 20;
const CLOSURE_SCALE_RATIO = 0.12;
const MINIMUM_CONFIDENCE = 0.72;

/**
 * Detect whether a stroke resembles a polygon.
 *
 * The closed contour is resampled uniformly so significant direction changes
 * can be separated from sampling density. Confidence combines concentrated
 * corner turns with straightness between consecutive corner candidates.
 *
 * @param {Array<{ x: number, y: number }>} points - Ordered stroke points.
 * @returns {{
 *   type: "polygon",
 *   confidence: number,
 *   metadata: {
 *     sides: number,
 *     corners: Array<{ x: number, y: number }>
 *   }
 * }|null} Polygon detection result, or null when confidence is insufficient.
 */
export function detectPolygon(points) {
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

  const sampledPoints = resampleClosedPath(points, RESAMPLE_COUNT);

  if (sampledPoints === null) {
    return null;
  }

  const turns = calculateTurns(sampledPoints);

  if (turns === null) {
    return null;
  }

  const cornerIndices = selectCornerIndices(turns);

  if (
    cornerIndices.length < MINIMUM_SIDES ||
    cornerIndices.length > MAXIMUM_SIDES
  ) {
    return null;
  }

  const edgeScore = calculateEdgeConsistency(sampledPoints, cornerIndices);
  const cornerScore = calculateCornerScore(turns, cornerIndices);
  const turnConcentration = calculateTurnConcentration(turns, cornerIndices);

  if (
    edgeScore === null ||
    cornerScore === null ||
    turnConcentration < MINIMUM_TURN_CONCENTRATION
  ) {
    return null;
  }

  const confidence = clampScore(
    edgeScore * 0.4 + cornerScore * 0.25 + turnConcentration * 0.35,
  );

  if (confidence < MINIMUM_CONFIDENCE) {
    return null;
  }

  return {
    type: "polygon",
    confidence,
    metadata: {
      sides: cornerIndices.length,
      corners: cornerIndices.map((index) => ({ ...sampledPoints[index] })),
    },
  };
}

/**
 * Uniformly resample a closed stroke by travelled contour distance.
 *
 * @param {Array<{ x: number, y: number }>} points - Closed stroke points.
 * @param {number} sampleCount - Number of samples to produce.
 * @returns {Array<{ x: number, y: number }>|null} Uniform contour samples.
 */
function resampleClosedPath(points, sampleCount) {
  const loopPoints = points.map((point) => ({ x: point.x, y: point.y }));
  const closingDistance = distance(loopPoints[loopPoints.length - 1], loopPoints[0]);

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
        x: segmentStart.x + (segmentEnd.x - segmentStart.x) * interpolation,
        y: segmentStart.y + (segmentEnd.y - segmentStart.y) * interpolation,
      });
      targetLength += spacing;
    }

    traversedLength += segmentLength;
  }

  return samples.length === sampleCount ? samples : null;
}

/**
 * Calculate absolute direction changes at each closed contour sample.
 *
 * @param {Array<{ x: number, y: number }>} points - Uniform contour samples.
 * @returns {Array<number>|null} Turn magnitudes in radians.
 */
function calculateTurns(points) {
  const turns = [];

  for (let index = 0; index < points.length; index += 1) {
    const previousPoint =
      points[
        (index - TURN_SAMPLE_OFFSET + points.length) % points.length
      ];
    const currentPoint = points[index];
    const nextPoint =
      points[(index + TURN_SAMPLE_OFFSET) % points.length];
    const incomingAngle = angleBetween(previousPoint, currentPoint);
    const outgoingAngle = angleBetween(currentPoint, nextPoint);

    if (incomingAngle === null || outgoingAngle === null) {
      return null;
    }

    turns.push(smallestAngleDifference(outgoingAngle - incomingAngle));
  }

  return turns;
}

/**
 * Select separated local turn maxima as polygon corner candidates.
 *
 * @param {Array<number>} turns - Turn magnitudes by contour index.
 * @returns {Array<number>} Sorted corner indices.
 */
function selectCornerIndices(turns) {
  const candidates = turns
    .map((turn, index) => ({ turn, index }))
    .filter(
      (candidate) =>
        candidate.turn >= MINIMUM_CORNER_TURN &&
        isLocalTurnMaximum(
          turns,
          candidate.index,
          CORNER_LOCAL_MAXIMUM_WINDOW,
        ),
    )
    .sort((first, second) => second.turn - first.turn);
  const selected = [];

  for (const candidate of candidates) {
    const isSeparated = selected.every(
      (selectedIndex) =>
        circularIndexDistance(candidate.index, selectedIndex, turns.length) >=
        MINIMUM_CORNER_SPACING,
    );

    if (isSeparated) {
      selected.push(candidate.index);
    }
  }

  return selected.sort((first, second) => first - second);
}

/**
 * Determine whether a turn is the local maximum in a circular window.
 *
 * @param {Array<number>} turns - Turn magnitudes by contour index.
 * @param {number} index - Candidate turn index.
 * @param {number} halfWindow - Comparison radius.
 * @returns {boolean} Whether the candidate is a local maximum.
 */
function isLocalTurnMaximum(turns, index, halfWindow) {
  for (let offset = -halfWindow; offset <= halfWindow; offset += 1) {
    if (offset === 0) {
      continue;
    }

    const comparisonIndex = (index + offset + turns.length) % turns.length;

    if (turns[comparisonIndex] > turns[index]) {
      return false;
    }
  }

  return true;
}

/**
 * Score directness of contour sections between consecutive corners.
 *
 * @param {Array<{ x: number, y: number }>} points - Uniform contour samples.
 * @param {Array<number>} cornerIndices - Ordered corner indices.
 * @returns {number|null} Mean edge directness score.
 */
function calculateEdgeConsistency(points, cornerIndices) {
  let totalScore = 0;

  for (let index = 0; index < cornerIndices.length; index += 1) {
    const startIndex = cornerIndices[index];
    const endIndex = cornerIndices[(index + 1) % cornerIndices.length];
    const directLength = distance(points[startIndex], points[endIndex]);
    const contourLength = calculateContourLength(points, startIndex, endIndex);

    if (
      directLength === null ||
      contourLength === null ||
      contourLength <= 0
    ) {
      return null;
    }

    const maximumDeviation = calculateMaximumEdgeDeviation(
      points,
      startIndex,
      endIndex,
    );

    if (maximumDeviation === null) {
      return null;
    }

    const directnessScore = clampScore(directLength / contourLength);
    const deviationScore = clampScore(
      1 -
        maximumDeviation /
          (directLength * EDGE_DEVIATION_TOLERANCE_RATIO),
    );
    totalScore += directnessScore * 0.3 + deviationScore * 0.7;
  }

  return totalScore / cornerIndices.length;
}

/**
 * Find maximum perpendicular deviation along a candidate polygon edge.
 *
 * @param {Array<{ x: number, y: number }>} points - Closed contour samples.
 * @param {number} startIndex - Edge start index.
 * @param {number} endIndex - Edge end index.
 * @returns {number|null} Maximum deviation from the direct edge.
 */
function calculateMaximumEdgeDeviation(points, startIndex, endIndex) {
  const edgeAngle = angleBetween(points[startIndex], points[endIndex]);

  if (edgeAngle === null) {
    return null;
  }

  const directionX = Math.cos(edgeAngle);
  const directionY = Math.sin(edgeAngle);
  let maximumDeviation = 0;
  let index = (startIndex + 1) % points.length;

  while (index !== endIndex) {
    const relativeX = points[index].x - points[startIndex].x;
    const relativeY = points[index].y - points[startIndex].y;
    const deviation = Math.abs(
      directionX * relativeY - directionY * relativeX,
    );

    if (!Number.isFinite(deviation)) {
      return null;
    }

    maximumDeviation = Math.max(maximumDeviation, deviation);
    index = (index + 1) % points.length;
  }

  return maximumDeviation;
}

/**
 * Score corner strength and total turning expected for a closed polygon.
 *
 * @param {Array<number>} turns - Turn magnitudes by contour index.
 * @param {Array<number>} cornerIndices - Selected corner indices.
 * @returns {number} Corner concentration score.
 */
function calculateCornerScore(turns, cornerIndices) {
  const selectedTurns = cornerIndices.map((index) => turns[index]);
  const totalTurn = selectedTurns.reduce((sum, turn) => sum + turn, 0);
  const expectedTurn = Math.PI * 2;
  const totalTurnScore = clampScore(
    1 - Math.abs(totalTurn - expectedTurn) / expectedTurn,
  );
  const expectedCornerTurn = expectedTurn / cornerIndices.length;
  const meanCornerTurn = totalTurn / cornerIndices.length;
  const cornerStrengthScore = ratioSimilarity(
    meanCornerTurn,
    expectedCornerTurn,
  );

  return totalTurnScore * 0.6 + cornerStrengthScore * 0.4;
}

/**
 * Measure how much contour turning is concentrated near selected corners.
 *
 * @param {Array<number>} turns - Turn magnitudes by contour index.
 * @param {Array<number>} cornerIndices - Selected corner indices.
 * @returns {number} Turn concentration score.
 */
function calculateTurnConcentration(turns, cornerIndices) {
  const cornerNeighborhoods = new Set();

  for (const cornerIndex of cornerIndices) {
    for (
      let offset = -CORNER_CONCENTRATION_WINDOW;
      offset <= CORNER_CONCENTRATION_WINDOW;
      offset += 1
    ) {
      cornerNeighborhoods.add(
        (cornerIndex + offset + turns.length) % turns.length,
      );
    }
  }

  const totalTurn = turns.reduce((sum, turn) => sum + turn, 0);
  const concentratedTurn = [...cornerNeighborhoods].reduce(
    (sum, index) => sum + turns[index],
    0,
  );

  return totalTurn > 0 ? clampScore(concentratedTurn / totalTurn) : 0;
}

/**
 * Calculate contour length while walking forward between circular indices.
 *
 * @param {Array<{ x: number, y: number }>} points - Closed contour samples.
 * @param {number} startIndex - Starting sample index.
 * @param {number} endIndex - Ending sample index.
 * @returns {number|null} Travelled contour length.
 */
function calculateContourLength(points, startIndex, endIndex) {
  let contourLength = 0;
  let index = startIndex;

  while (index !== endIndex) {
    const nextIndex = (index + 1) % points.length;
    const segmentLength = distance(points[index], points[nextIndex]);

    if (segmentLength === null) {
      return null;
    }

    contourLength += segmentLength;
    index = nextIndex;
  }

  return contourLength;
}

/**
 * Calculate the shortest unsigned difference between two angles.
 *
 * @param {number} angleDifference - Raw angle difference in radians.
 * @returns {number} Difference in the range from zero to π.
 */
function smallestAngleDifference(angleDifference) {
  const normalizedDifference = normalizeAngle(angleDifference);

  if (normalizedDifference === null) {
    return 0;
  }

  return Math.min(
    normalizedDifference,
    Math.PI * 2 - normalizedDifference,
  );
}

/**
 * Calculate circular distance between two sample indices.
 *
 * @param {number} firstIndex - First index.
 * @param {number} secondIndex - Second index.
 * @param {number} sampleCount - Number of circular samples.
 * @returns {number} Shortest index distance.
 */
function circularIndexDistance(firstIndex, secondIndex, sampleCount) {
  const directDistance = Math.abs(firstIndex - secondIndex);
  return Math.min(directDistance, sampleCount - directDistance);
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
