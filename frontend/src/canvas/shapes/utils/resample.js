import { distance } from "./distance.js";
import { pathLength } from "./geometry.js";
import { angleBetween, normalizeAngle } from "./angle.js";

/**
 * Uniformly resample a closed contour by travelled path distance.
 *
 * @param {Array<{ x: number, y: number }>} points - Ordered contour points.
 * @param {number} sampleCount - Number of samples to return.
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
  const closingDistance = distance(loopPoints.at(-1), loopPoints[0]);

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
 * Smooth a closed contour with a circular weighted moving average.
 *
 * @param {Array<{ x: number, y: number }>} points - Uniform contour samples.
 * @param {number} [radius=1] - Neighbor count on each side.
 * @returns {Array<{ x: number, y: number }>|null} Smoothed point copies.
 */
export function smoothClosedPath(points, radius = 1) {
  if (
    !Array.isArray(points) ||
    points.length < 3 ||
    !Number.isInteger(radius) ||
    radius < 1
  ) {
    return null;
  }

  return points.map((_, index) => {
    let weightedX = 0;
    let weightedY = 0;
    let totalWeight = 0;

    for (let offset = -radius; offset <= radius; offset += 1) {
      const point =
        points[(index + offset + points.length) % points.length];
      const weight = radius + 1 - Math.abs(offset);

      if (
        point === null ||
        typeof point !== "object" ||
        !Number.isFinite(point.x) ||
        !Number.isFinite(point.y)
      ) {
        return null;
      }

      weightedX += point.x * weight;
      weightedY += point.y * weight;
      totalWeight += weight;
    }

    return {
      x: weightedX / totalWeight,
      y: weightedY / totalWeight,
    };
  });
}

/**
 * Count sharp direction changes around a uniformly sampled closed contour.
 *
 * @param {Array<{ x: number, y: number }>} points - Closed contour samples.
 * @param {number} [threshold=Math.PI / 4] - Minimum sharp turn in radians.
 * @param {number} [sampleOffset=2] - Neighbor offset used for turn measurement.
 * @returns {number|null} Sharp turn count, or null for invalid geometry.
 */
export function countSharpTurns(
  points,
  threshold = Math.PI / 4,
  sampleOffset = 2,
) {
  if (
    !Array.isArray(points) ||
    points.length < 3 ||
    !Number.isFinite(threshold) ||
    threshold < 0 ||
    !Number.isInteger(sampleOffset) ||
    sampleOffset < 1
  ) {
    return null;
  }

  let sharpTurnCount = 0;

  for (let index = 0; index < points.length; index += 1) {
    const previous =
      points[
        (index - sampleOffset + points.length) % points.length
      ];
    const point = points[index];
    const next = points[(index + sampleOffset) % points.length];
    const incoming = angleBetween(previous, point);
    const outgoing = angleBetween(point, next);

    if (incoming === null || outgoing === null) {
      return null;
    }

    const normalizedTurn = normalizeAngle(outgoing - incoming);

    if (normalizedTurn === null) {
      return null;
    }

    const turn = Math.min(
      normalizedTurn,
      Math.PI * 2 - normalizedTurn,
    );

    if (turn >= threshold) {
      sharpTurnCount += 1;
    }
  }

  return sharpTurnCount;
}
