export const DEFAULT_PRESSURE = 0.5;
export const DEFAULT_MIN_PRESSURE_FACTOR = 0.35;
export const DEFAULT_MAX_PRESSURE_FACTOR = 1.6;

/**
 * Resolve the rendered width for one pressure sample.
 *
 * @param {number} width - Base brush width.
 * @param {number} pressure - Normalized pressure.
 * @param {number} minFactor - Width factor at zero pressure.
 * @param {number} maxFactor - Width factor at full pressure.
 * @returns {number} Positive rendered width.
 */
export function getPressureWidth(
  width,
  pressure,
  minFactor = DEFAULT_MIN_PRESSURE_FACTOR,
  maxFactor = DEFAULT_MAX_PRESSURE_FACTOR,
) {
  const baseWidth = Number.isFinite(width) && width > 0 ? width : 1;
  const normalizedPressure = clamp(
    Number.isFinite(pressure) ? pressure : DEFAULT_PRESSURE,
    0,
    1,
  );
  const minimum = Number.isFinite(minFactor)
    ? minFactor
    : DEFAULT_MIN_PRESSURE_FACTOR;
  const maximum = Number.isFinite(maxFactor)
    ? maxFactor
    : DEFAULT_MAX_PRESSURE_FACTOR;
  const lowerFactor = Math.min(minimum, maximum);
  const upperFactor = Math.max(minimum, maximum);

  return (
    baseWidth *
    (lowerFactor + (upperFactor - lowerFactor) * normalizedPressure)
  );
}

/**
 * Build a closed pressure outline around an ordered centerline.
 *
 * @param {Array<{ x: number, y: number }>} points - Stroke centerline.
 * @param {Array<number>} pressures - Pressure samples matching the centerline.
 * @param {{
 *   width: number,
 *   minFactor?: number,
 *   maxFactor?: number
 * }} options - Brush width settings.
 * @returns {Array<Array<string|number>>|null} Fabric-compatible path commands.
 */
export function buildPressureOutlinePath(
  points,
  pressures,
  {
    width,
    minFactor = DEFAULT_MIN_PRESSURE_FACTOR,
    maxFactor = DEFAULT_MAX_PRESSURE_FACTOR,
  },
) {
  if (
    !Array.isArray(points) ||
    points.length < 2 ||
    !points.every(isFinitePoint)
  ) {
    return null;
  }

  const left = [];
  const right = [];

  for (let index = 0; index < points.length; index += 1) {
    const tangent = getTangent(points, index);
    const normalX = -tangent.y;
    const normalY = tangent.x;
    const halfWidth =
      getPressureWidth(
        width,
        pressures?.[index],
        minFactor,
        maxFactor,
      ) / 2;

    left.push({
      x: points[index].x + normalX * halfWidth,
      y: points[index].y + normalY * halfWidth,
    });
    right.push({
      x: points[index].x - normalX * halfWidth,
      y: points[index].y - normalY * halfWidth,
    });
  }

  return [
    ["M", left[0].x, left[0].y],
    ...left.slice(1).map((point) => ["L", point.x, point.y]),
    ...[...right].reverse().map((point) => ["L", point.x, point.y]),
    ["Z"],
  ];
}

function getTangent(points, index) {
  const current = points[index];
  const previous = findDistinctPoint(points, index, -1) ?? current;
  const next = findDistinctPoint(points, index, 1) ?? current;
  let deltaX = next.x - previous.x;
  let deltaY = next.y - previous.y;
  const length = Math.hypot(deltaX, deltaY);

  if (!Number.isFinite(length) || length === 0) {
    return { x: 1, y: 0 };
  }

  deltaX /= length;
  deltaY /= length;
  return { x: deltaX, y: deltaY };
}

function findDistinctPoint(points, startIndex, direction) {
  const current = points[startIndex];

  for (
    let index = startIndex + direction;
    index >= 0 && index < points.length;
    index += direction
  ) {
    if (
      points[index].x !== current.x ||
      points[index].y !== current.y
    ) {
      return points[index];
    }
  }

  return null;
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
