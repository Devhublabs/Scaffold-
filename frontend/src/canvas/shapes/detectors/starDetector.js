import {
  angleBetween,
  boundingBox,
  centroid,
  distance,
  isClosedShape,
  normalizeAngle,
  pathLength,
} from "../utils/index.js";

const MINIMUM_POINT_COUNT = 10;
const MINIMUM_DIMENSION = 12;
const RESAMPLE_COUNT = 64;
const MINIMUM_CORNER_TURN = Math.PI / 7;
const CORNER_TURN_WINDOW = 2;
const MINIMUM_CORNER_COUNT = 8;
const MAXIMUM_CORNER_COUNT = 16;
const MINIMUM_RADIAL_SEPARATION = 0.15;
const MAXIMUM_RADIAL_VARIATION = 0.2;
const MAXIMUM_ANGULAR_VARIATION = 0.3;
const MINIMUM_CLOSURE_THRESHOLD = 4;
const MAXIMUM_CLOSURE_THRESHOLD = 20;
const CLOSURE_SCALE_RATIO = 0.12;
const MINIMUM_CONFIDENCE = 0.72;

/**
 * Detect whether a stroke resembles a star.
 *
 * Significant contour turns are tested for alternating inner and outer radii.
 * Confidence also considers radial symmetry and spacing between outer points.
 *
 * @param {Array<{ x: number, y: number }>} points - Ordered stroke points.
 * @returns {{
 *   type: "star",
 *   confidence: number,
 *   metadata: { points: number }
 * }|null} Star detection result, or null when confidence is insufficient.
 */
export function detectStar(points) {
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

  const center = centroid(sampledPoints);

  if (center === null) {
    return null;
  }

  const cornerIndices = selectCornerIndices(turns, sampledPoints, center);

  if (
    cornerIndices === null ||
    cornerIndices.length < MINIMUM_CORNER_COUNT ||
    cornerIndices.length > MAXIMUM_CORNER_COUNT ||
    cornerIndices.length % 2 !== 0
  ) {
    return null;
  }

  const radialPattern = analyzeRadialPattern(
    sampledPoints,
    cornerIndices,
    center,
  );

  if (radialPattern === null) {
    return null;
  }

  const angularScore = calculateAngularSymmetry(
    sampledPoints,
    radialPattern.outerIndices,
    center,
  );

  if (angularScore === null) {
    return null;
  }

  const meanTurn =
    cornerIndices.reduce((sum, index) => sum + turns[index], 0) /
    cornerIndices.length;
  const cornerScore = clampScore(meanTurn / (Math.PI / 2));
  const separationScore = clampScore(
    (radialPattern.separation - MINIMUM_RADIAL_SEPARATION) / 0.3,
  );
  const confidence = clampScore(
    radialPattern.alternationScore * 0.35 +
      separationScore * 0.25 +
      radialPattern.symmetryScore * 0.2 +
      angularScore * 0.15 +
      cornerScore * 0.05,
  );

  if (confidence < MINIMUM_CONFIDENCE) {
    return null;
  }

  return {
    type: "star",
    confidence,
    metadata: {
      points: radialPattern.outerIndices.length,
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
    const previousPoint = points[(index - 1 + points.length) % points.length];
    const currentPoint = points[index];
    const nextPoint = points[(index + 1) % points.length];
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
 * Select smoothed radial extrema that also contain a nearby sharp contour turn.
 *
 * @param {Array<number>} turns - Turn magnitudes by contour index.
 * @param {Array<{ x: number, y: number }>} points - Uniform contour samples.
 * @param {{ x: number, y: number }} center - Candidate star center.
 * @returns {Array<number>|null} Sorted corner indices.
 */
function selectCornerIndices(turns, points, center) {
  const radii = [];

  for (const point of points) {
    const radius = distance(point, center);

    if (radius === null || !Number.isFinite(radius)) {
      return null;
    }

    radii.push(radius);
  }

  const smoothedRadii = radii.map((radius, index) => {
    const previousTwo = radii[(index - 2 + radii.length) % radii.length];
    const previous = radii[(index - 1 + radii.length) % radii.length];
    const next = radii[(index + 1) % radii.length];
    const nextTwo = radii[(index + 2) % radii.length];

    return (
      previousTwo + previous * 2 + radius * 3 + next * 2 + nextTwo
    ) / 9;
  });

  return smoothedRadii
    .map((radius, index) => ({ radius, index }))
    .filter((candidate) => {
      const previousRadius =
        smoothedRadii[
          (candidate.index - 1 + smoothedRadii.length) %
            smoothedRadii.length
        ];
      const nextRadius =
        smoothedRadii[(candidate.index + 1) % smoothedRadii.length];
      const isRadialMaximum =
        candidate.radius >= previousRadius && candidate.radius > nextRadius;
      const isRadialMinimum =
        candidate.radius <= previousRadius && candidate.radius < nextRadius;

      if (!isRadialMaximum && !isRadialMinimum) {
        return false;
      }

      let localMaximumTurn = 0;

      for (
        let offset = -CORNER_TURN_WINDOW;
        offset <= CORNER_TURN_WINDOW;
        offset += 1
      ) {
        const turnIndex =
          (candidate.index + offset + turns.length) % turns.length;
        localMaximumTurn = Math.max(localMaximumTurn, turns[turnIndex]);
      }

      return localMaximumTurn >= MINIMUM_CORNER_TURN;
    })
    .map((candidate) => candidate.index);
}

/**
 * Analyze alternating radial extrema at selected contour corners.
 *
 * @param {Array<{ x: number, y: number }>} points - Uniform contour samples.
 * @param {Array<number>} cornerIndices - Ordered corner indices.
 * @param {{ x: number, y: number }} center - Candidate star center.
 * @returns {{
 *   outerIndices: Array<number>,
 *   alternationScore: number,
 *   separation: number,
 *   symmetryScore: number
 * }|null} Radial-pattern metrics.
 */
function analyzeRadialPattern(points, cornerIndices, center) {
  const radii = [];

  for (const index of cornerIndices) {
    const radius = distance(points[index], center);

    if (radius === null || !Number.isFinite(radius) || radius <= 0) {
      return null;
    }

    radii.push(radius);
  }

  const evenMean = mean(radii.filter((_, index) => index % 2 === 0));
  const oddMean = mean(radii.filter((_, index) => index % 2 === 1));
  const outerParity = evenMean >= oddMean ? 0 : 1;
  const outerRadii = radii.filter((_, index) => index % 2 === outerParity);
  const innerRadii = radii.filter((_, index) => index % 2 !== outerParity);
  const outerMean = mean(outerRadii);
  const innerMean = mean(innerRadii);
  const separation = (outerMean - innerMean) / outerMean;

  if (separation < MINIMUM_RADIAL_SEPARATION) {
    return null;
  }

  let alternatingCornerCount = 0;

  for (let index = 0; index < radii.length; index += 1) {
    const shouldBeOuter = index % 2 === outerParity;
    const previousRadius = radii[(index - 1 + radii.length) % radii.length];
    const nextRadius = radii[(index + 1) % radii.length];
    const alternates = shouldBeOuter
      ? radii[index] > previousRadius && radii[index] > nextRadius
      : radii[index] < previousRadius && radii[index] < nextRadius;

    alternatingCornerCount += alternates ? 1 : 0;
  }

  const radialVariation =
    (coefficientOfVariation(outerRadii) +
      coefficientOfVariation(innerRadii)) /
    2;
  const outerIndices = cornerIndices.filter(
    (_, index) => index % 2 === outerParity,
  );

  return {
    outerIndices,
    alternationScore: alternatingCornerCount / radii.length,
    separation,
    symmetryScore: clampScore(
      1 - radialVariation / MAXIMUM_RADIAL_VARIATION,
    ),
  };
}

/**
 * Score equal angular spacing between outer star points.
 *
 * @param {Array<{ x: number, y: number }>} points - Uniform contour samples.
 * @param {Array<number>} outerIndices - Outer-corner indices.
 * @param {{ x: number, y: number }} center - Candidate star center.
 * @returns {number|null} Angular symmetry score.
 */
function calculateAngularSymmetry(points, outerIndices, center) {
  const angles = [];

  for (const index of outerIndices) {
    const angle = angleBetween(center, points[index]);
    const normalizedAngle = angle === null ? null : normalizeAngle(angle);

    if (normalizedAngle === null) {
      return null;
    }

    angles.push(normalizedAngle);
  }

  angles.sort((first, second) => first - second);
  const expectedSpacing = (Math.PI * 2) / angles.length;
  let totalRelativeError = 0;

  for (let index = 0; index < angles.length; index += 1) {
    const nextAngle =
      index === angles.length - 1 ? angles[0] + Math.PI * 2 : angles[index + 1];
    totalRelativeError +=
      Math.abs(nextAngle - angles[index] - expectedSpacing) / expectedSpacing;
  }

  const meanRelativeError = totalRelativeError / angles.length;
  return clampScore(
    1 - meanRelativeError / MAXIMUM_ANGULAR_VARIATION,
  );
}

/**
 * Calculate the arithmetic mean of a non-empty numeric array.
 *
 * @param {Array<number>} values - Numeric values.
 * @returns {number} Arithmetic mean.
 */
function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Calculate relative standard deviation for positive values.
 *
 * @param {Array<number>} values - Positive values.
 * @returns {number} Coefficient of variation.
 */
function coefficientOfVariation(values) {
  const average = mean(values);
  const variance =
    values.reduce((sum, value) => {
      const deviation = value - average;
      return sum + deviation * deviation;
    }, 0) / values.length;

  return average > 0 ? Math.sqrt(variance) / average : Infinity;
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
