import { distance, pathLength } from "../utils/index.js";
import { DEFAULT_PRESSURE } from "../../brushes/pressureStroke.js";

const TARGET_SAMPLE_SPACING = 4;
const MAXIMUM_SAMPLE_COUNT = 192;
const SMOOTHING_PASSES = 2;
const DUPLICATE_POINT_THRESHOLD = 0.01;
const MINIMUM_CORNER_TURN = Math.PI / 6;
const FULL_CORNER_TURN = Math.PI / 2;
const SMOOTH_BLEND = 0.9;
const CORNER_BLEND = 0.25;

/**
 * Smooth an arbitrary open pressure stroke without changing its endpoints.
 *
 * @param {Array<{ x: number, y: number }>} points - Ordered centerline points.
 * @param {Array<number>} pressures - Pressure samples matching the points.
 * @returns {{
 *   points: Array<{ x: number, y: number }>,
 *   pressures: Array<number>
 * }|null} Smoothed freeform geometry.
 */
export function smoothFreeformStroke(points, pressures = []) {
  const samples = normalizeSamples(points, pressures);

  if (samples.length < 3) {
    return null;
  }

  const totalLength = pathLength(samples);

  if (
    totalLength === null ||
    !Number.isFinite(totalLength) ||
    totalLength <= 0
  ) {
    return null;
  }

  const sampleCount = clamp(
    Math.ceil(totalLength / TARGET_SAMPLE_SPACING) + 1,
    3,
    MAXIMUM_SAMPLE_COUNT,
  );
  const resampled = resampleOpenStroke(samples, sampleCount, totalLength);

  if (resampled === null) {
    return null;
  }

  let smoothedPoints = resampled.map(({ x, y }) => ({ x, y }));

  for (let pass = 0; pass < SMOOTHING_PASSES; pass += 1) {
    smoothedPoints = smoothPointPass(smoothedPoints);
  }

  return {
    points: smoothedPoints,
    pressures: smoothPressures(
      resampled.map((sample) => sample.pressure),
    ),
  };
}

function normalizeSamples(points, pressures) {
  if (!Array.isArray(points)) {
    return [];
  }

  const samples = [];

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];

    if (!isFinitePoint(point)) {
      continue;
    }

    const previous = samples.at(-1);
    const separation = previous ? distance(previous, point) : null;

    if (
      previous &&
      separation !== null &&
      separation <= DUPLICATE_POINT_THRESHOLD
    ) {
      continue;
    }

    samples.push({
      x: point.x,
      y: point.y,
      pressure: normalizePressure(pressures[index]),
    });
  }

  return samples;
}

function resampleOpenStroke(samples, sampleCount, totalLength) {
  const cumulativeLengths = [0];

  for (let index = 1; index < samples.length; index += 1) {
    const segmentLength = distance(samples[index - 1], samples[index]);

    if (segmentLength === null) {
      return null;
    }

    cumulativeLengths.push(
      cumulativeLengths[index - 1] + segmentLength,
    );
  }

  const output = [];
  let segmentIndex = 1;

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const targetLength =
      (sampleIndex / (sampleCount - 1)) * totalLength;

    while (
      segmentIndex < cumulativeLengths.length - 1 &&
      cumulativeLengths[segmentIndex] < targetLength
    ) {
      segmentIndex += 1;
    }

    const startIndex = Math.max(0, segmentIndex - 1);
    const endIndex = Math.min(segmentIndex, samples.length - 1);
    const segmentStartLength = cumulativeLengths[startIndex];
    const segmentEndLength = cumulativeLengths[endIndex];
    const segmentLength = segmentEndLength - segmentStartLength;
    const interpolation =
      segmentLength > 0
        ? (targetLength - segmentStartLength) / segmentLength
        : 0;
    const start = samples[startIndex];
    const end = samples[endIndex];

    output.push({
      x: interpolate(start.x, end.x, interpolation),
      y: interpolate(start.y, end.y, interpolation),
      pressure: interpolate(
        start.pressure,
        end.pressure,
        interpolation,
      ),
    });
  }

  output[0] = { ...samples[0] };
  output[output.length - 1] = { ...samples.at(-1) };
  return output;
}

function smoothPointPass(points) {
  return points.map((point, index) => {
    if (index === 0 || index === points.length - 1) {
      return { ...point };
    }

    const previous = points[index - 1];
    const next = points[index + 1];
    const average = {
      x: (previous.x + point.x * 2 + next.x) / 4,
      y: (previous.y + point.y * 2 + next.y) / 4,
    };
    const turn = calculateWideTurn(points, index);
    const cornerStrength = clamp(
      (turn - MINIMUM_CORNER_TURN) /
        (FULL_CORNER_TURN - MINIMUM_CORNER_TURN),
      0,
      1,
    );
    const blend = interpolate(
      SMOOTH_BLEND,
      CORNER_BLEND,
      cornerStrength,
    );

    return {
      x: interpolate(point.x, average.x, blend),
      y: interpolate(point.y, average.y, blend),
    };
  });
}

function calculateWideTurn(points, index) {
  const offset = Math.min(2, index, points.length - 1 - index);
  const previous = points[index - offset];
  const point = points[index];
  const next = points[index + offset];
  const incoming = Math.atan2(
    point.y - previous.y,
    point.x - previous.x,
  );
  const outgoing = Math.atan2(next.y - point.y, next.x - point.x);

  return Math.abs(
    Math.atan2(
      Math.sin(outgoing - incoming),
      Math.cos(outgoing - incoming),
    ),
  );
}

function smoothPressures(pressures) {
  return pressures.map((pressure, index) => {
    if (index === 0 || index === pressures.length - 1) {
      return pressure;
    }

    return (
      pressures[index - 1] +
      pressure * 2 +
      pressures[index + 1]
    ) / 4;
  });
}

function normalizePressure(pressure) {
  return clamp(
    Number.isFinite(pressure) ? pressure : DEFAULT_PRESSURE,
    0,
    1,
  );
}

function interpolate(start, end, progress) {
  return start + (end - start) * progress;
}

function isFinitePoint(point) {
  return (
    point !== null &&
    typeof point === "object" &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y)
  );
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
