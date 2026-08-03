import {
  angleBetween,
  boundingBox,
  centroid,
  distance,
  isClosedShape,
  normalizeAngle,
  pathLength,
  smoothClosedPath,
} from "../utils/index.js";

const MINIMUM_POINT_COUNT = 10;
const MINIMUM_DIMENSION = 10;
const RESAMPLE_COUNT = 64;
const TURN_SAMPLE_OFFSET = 2;
const TAIL_HALF_WINDOW = 6;
const MINIMUM_SHARP_TURN = Math.PI / 7;
const MINIMUM_LOCALIZED_SHARP_FRACTION = 0.45;
const MINIMUM_TAIL_EXTENSION = 1.1;
const MAXIMUM_TAIL_EXTENSION = 2.5;
const FULL_CONFIDENCE_TAIL_EXTENSION = 1.6;
const MAXIMUM_BODY_ERROR = 0.3;
const MINIMUM_CLOSURE_THRESHOLD = 4;
const MAXIMUM_CLOSURE_THRESHOLD = 96;
const CLOSURE_SCALE_RATIO = 0.25;
const MINIMUM_CONFIDENCE = 0.7;

/**
 * Detect whether a stroke resembles a speech bubble.
 *
 * A speech bubble is modeled as an approximately elliptical closed body with a
 * small, localized region of sharp turns that extends beyond that body.
 *
 * @param {Array<{ x: number, y: number }>} points - Ordered stroke points.
 * @returns {{
 *   type: "speechBubble",
 *   confidence: number,
 *   metadata: { tailPosition: { x: number, y: number } }
 * }|null} Speech-bubble detection result, or null when confidence is insufficient.
 */
export function detectSpeechBubble(points) {
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
  const analysisPoints = smoothClosedPath(sampledPoints, 1);

  if (analysisPoints === null) {
    return null;
  }

  const turns = calculateTurns(analysisPoints);

  if (turns === null) {
    return null;
  }

  const sharpIndices = turns
    .map((turn, index) => ({ turn, index }))
    .filter((candidate) => candidate.turn >= MINIMUM_SHARP_TURN);

  if (sharpIndices.length === 0) {
    return null;
  }

  const sharpest = sharpIndices.reduce((current, candidate) =>
    candidate.turn > current.turn ? candidate : current,
  );
  const totalSharpTurn = sharpIndices.reduce(
    (sum, candidate) => sum + candidate.turn,
    0,
  );
  const localizedSharpTurn = sharpIndices
    .filter((candidate) =>
      isWithinCircularWindow(
        candidate.index,
        sharpest.index,
        TAIL_HALF_WINDOW,
        analysisPoints.length,
      ),
    )
    .reduce((sum, candidate) => sum + candidate.turn, 0);
  const localizationScore = localizedSharpTurn / totalSharpTurn;

  if (localizationScore < MINIMUM_LOCALIZED_SHARP_FRACTION) {
    return null;
  }

  const bodyPoints = analysisPoints.filter(
    (_, index) =>
      !isWithinCircularWindow(
        index,
        sharpest.index,
        TAIL_HALF_WINDOW,
        analysisPoints.length,
      ),
  );
  const bodyBounds = boundingBox(bodyPoints);
  const bodyCenter = centroid(bodyPoints);

  if (
    bodyBounds === null ||
    bodyCenter === null ||
    bodyBounds.width < MINIMUM_DIMENSION ||
    bodyBounds.height < MINIMUM_DIMENSION
  ) {
    return null;
  }

  const bodyGeometry = calculateBodyGeometry(bodyPoints, bodyCenter);

  if (bodyGeometry === null) {
    return null;
  }

  const bodyError = calculateEllipseError(bodyPoints, bodyGeometry);

  if (bodyError === null) {
    return null;
  }

  const tail = findTailTip(
    analysisPoints,
    sharpest.index,
    bodyGeometry,
    TAIL_HALF_WINDOW,
  );

  if (
    tail === null ||
    tail.normalizedRadius < MINIMUM_TAIL_EXTENSION ||
    tail.normalizedRadius > MAXIMUM_TAIL_EXTENSION
  ) {
    return null;
  }

  const bodyScore = clampScore(1 - bodyError / MAXIMUM_BODY_ERROR);
  const extensionScore = clampScore(
    (tail.normalizedRadius - MINIMUM_TAIL_EXTENSION) /
      (FULL_CONFIDENCE_TAIL_EXTENSION - MINIMUM_TAIL_EXTENSION),
  );
  const tipTurnScore = clampScore(turns[tail.index] / (Math.PI / 2));
  const confidence = clampScore(
    bodyScore * 0.45 +
      extensionScore * 0.25 +
      tipTurnScore * 0.15 +
      localizationScore * 0.15,
  );

  if (confidence < MINIMUM_CONFIDENCE) {
    return null;
  }

  return {
    type: "speechBubble",
    confidence,
    metadata: {
      tailPosition: { ...sampledPoints[tail.index] },
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

    const normalizedDifference = normalizeAngle(outgoingAngle - incomingAngle);

    if (normalizedDifference === null) {
      return null;
    }

    turns.push(
      Math.min(normalizedDifference, Math.PI * 2 - normalizedDifference),
    );
  }

  return turns;
}

/**
 * Estimate body radii and orientation from covariance around its centroid.
 *
 * @param {Array<{ x: number, y: number }>} points - Candidate body points.
 * @param {{ x: number, y: number }} center - Body centroid.
 * @returns {{
 *   center: { x: number, y: number },
 *   radiusX: number,
 *   radiusY: number,
 *   angle: number
 * }|null} Principal-axis body geometry.
 */
function calculateBodyGeometry(points, center) {
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
    angle: 0.5 * Math.atan2(covarianceXY * 2, covarianceXX - covarianceYY),
  };
}

/**
 * Measure mean normalized radial error against principal-axis body geometry.
 *
 * @param {Array<{ x: number, y: number }>} points - Candidate body points.
 * @param {{ center: { x: number, y: number }, radiusX: number, radiusY: number, angle: number }} geometry
 * @returns {number|null} Mean absolute ellipse residual.
 */
function calculateEllipseError(points, geometry) {
  if (geometry.radiusX <= 0 || geometry.radiusY <= 0) {
    return null;
  }

  let totalError = 0;

  for (const point of points) {
    const normalizedRadius = getNormalizedEllipseRadius(point, geometry);

    if (!Number.isFinite(normalizedRadius)) {
      return null;
    }

    totalError += Math.abs(normalizedRadius - 1);
  }

  return totalError / points.length;
}

/**
 * Find the strongest ellipse-normalized protrusion in the tail region.
 *
 * @param {Array<{ x: number, y: number }>} points - Uniform contour samples.
 * @param {number} centerIndex - Center of the candidate tail region.
 * @param {{ center: { x: number, y: number }, radiusX: number, radiusY: number, angle: number }} geometry
 * @param {number} halfWindow - Tail-region radius in samples.
 * @returns {{ index: number, normalizedRadius: number }|null} Tail tip.
 */
function findTailTip(points, centerIndex, geometry, halfWindow) {
  let tail = null;

  for (let offset = -halfWindow; offset <= halfWindow; offset += 1) {
    const index = (centerIndex + offset + points.length) % points.length;
    const normalizedRadius = getNormalizedEllipseRadius(
      points[index],
      geometry,
    );

    if (!Number.isFinite(normalizedRadius)) {
      return null;
    }

    if (tail === null || normalizedRadius > tail.normalizedRadius) {
      tail = { index, normalizedRadius };
    }
  }

  return tail;
}

/**
 * Calculate a point's radial coordinate in normalized ellipse space.
 *
 * @param {{ x: number, y: number }} point - Point to measure.
 * @param {{ center: { x: number, y: number }, radiusX: number, radiusY: number, angle: number }} geometry
 * @returns {number} Normalized radius.
 */
function getNormalizedEllipseRadius(point, geometry) {
  const deltaX = point.x - geometry.center.x;
  const deltaY = point.y - geometry.center.y;
  const cosine = Math.cos(geometry.angle);
  const sine = Math.sin(geometry.angle);
  const majorCoordinate = deltaX * cosine + deltaY * sine;
  const minorCoordinate = -deltaX * sine + deltaY * cosine;

  return Math.hypot(
    majorCoordinate / geometry.radiusX,
    minorCoordinate / geometry.radiusY,
  );
}

/**
 * Determine whether an index lies inside a circular index window.
 *
 * @param {number} index - Candidate index.
 * @param {number} centerIndex - Window center.
 * @param {number} halfWindow - Window radius.
 * @param {number} sampleCount - Number of circular samples.
 * @returns {boolean} Whether the index is inside the window.
 */
function isWithinCircularWindow(
  index,
  centerIndex,
  halfWindow,
  sampleCount,
) {
  const directDistance = Math.abs(index - centerIndex);
  const circularDistance = Math.min(
    directDistance,
    sampleCount - directDistance,
  );
  return circularDistance <= halfWindow;
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
