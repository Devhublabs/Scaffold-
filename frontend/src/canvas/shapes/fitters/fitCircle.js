import { getValidPoints, isFinitePoint } from "./fitUtils.js";

/**
 * Compute best-fit circle geometry after circle intent has been detected.
 *
 * @param {Array<{ x: number, y: number }>} points - Ordered stroke points.
 * @param {object|null} detection - Metadata produced by the circle detector.
 * @returns {{
 *   center: { x: number, y: number },
 *   radius: number,
 *   diameter: number
 * }|null} Least-squares circle geometry.
 */
export function fitCircle(points, detection) {
  const validPoints = getValidPoints(points);

  if (validPoints.length < 3) {
    return null;
  }

  const fitted = fitLeastSquaresCircle(validPoints);
  const fallback = getDetectedCircle(detection);
  const circle = fitted ?? fallback;

  if (circle === null || circle.radius <= 0) {
    return null;
  }

  return {
    center: { ...circle.center },
    radius: circle.radius,
    diameter: circle.radius * 2,
  };
}

/**
 * Fit a circle with a centered algebraic least-squares system.
 *
 * @param {Array<{ x: number, y: number }>} points - Finite points.
 * @returns {{ center: { x: number, y: number }, radius: number }|null}
 */
function fitLeastSquaresCircle(points) {
  const origin = points.reduce(
    (center, point, index) => ({
      x: center.x + (point.x - center.x) / (index + 1),
      y: center.y + (point.y - center.y) / (index + 1),
    }),
    { x: points[0].x, y: points[0].y },
  );
  let scale = 0;

  for (const point of points) {
    scale = Math.max(scale, Math.hypot(point.x - origin.x, point.y - origin.y));
  }

  if (!Number.isFinite(scale) || scale <= 0) {
    return null;
  }

  const matrix = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const vector = [0, 0, 0];

  for (const point of points) {
    const x = (point.x - origin.x) / scale;
    const y = (point.y - origin.y) / scale;
    const squaredRadius = x * x + y * y;
    const row = [x, y, 1];

    for (let rowIndex = 0; rowIndex < 3; rowIndex += 1) {
      vector[rowIndex] += row[rowIndex] * squaredRadius;

      for (let columnIndex = 0; columnIndex < 3; columnIndex += 1) {
        matrix[rowIndex][columnIndex] +=
          row[rowIndex] * row[columnIndex];
      }
    }
  }

  const solution = solveThreeByThree(matrix, vector);

  if (solution === null) {
    return null;
  }

  const [coefficientX, coefficientY, constant] = solution;
  const centerOffsetX = coefficientX / 2;
  const centerOffsetY = coefficientY / 2;
  const normalizedRadiusSquared =
    constant +
    centerOffsetX * centerOffsetX +
    centerOffsetY * centerOffsetY;

  if (
    !Number.isFinite(normalizedRadiusSquared) ||
    normalizedRadiusSquared <= 0
  ) {
    return null;
  }

  return {
    center: {
      x: origin.x + centerOffsetX * scale,
      y: origin.y + centerOffsetY * scale,
    },
    radius: Math.sqrt(normalizedRadiusSquared) * scale,
  };
}

/**
 * Solve a 3x3 linear system with partial-pivot Gaussian elimination.
 *
 * @param {Array<Array<number>>} matrix - Coefficient matrix.
 * @param {Array<number>} vector - Right-hand-side vector.
 * @returns {Array<number>|null} Solution vector.
 */
function solveThreeByThree(matrix, vector) {
  const rows = matrix.map((row, index) => [...row, vector[index]]);

  for (let column = 0; column < 3; column += 1) {
    let pivotRow = column;

    for (let row = column + 1; row < 3; row += 1) {
      if (Math.abs(rows[row][column]) > Math.abs(rows[pivotRow][column])) {
        pivotRow = row;
      }
    }

    if (Math.abs(rows[pivotRow][column]) <= Number.EPSILON) {
      return null;
    }

    [rows[column], rows[pivotRow]] = [rows[pivotRow], rows[column]];

    const pivot = rows[column][column];

    for (let index = column; index < 4; index += 1) {
      rows[column][index] /= pivot;
    }

    for (let row = 0; row < 3; row += 1) {
      if (row === column) {
        continue;
      }

      const factor = rows[row][column];

      for (let index = column; index < 4; index += 1) {
        rows[row][index] -= factor * rows[column][index];
      }
    }
  }

  const solution = rows.map((row) => row[3]);
  return solution.every(Number.isFinite) ? solution : null;
}

/**
 * Read valid detector circle metadata as a fallback.
 *
 * @param {object|null} detection - Circle detection result.
 * @returns {{ center: { x: number, y: number }, radius: number }|null}
 */
function getDetectedCircle(detection) {
  const metadata = detection?.metadata;

  if (
    !isFinitePoint(metadata?.center) ||
    !Number.isFinite(metadata.radius) ||
    metadata.radius <= 0
  ) {
    return null;
  }

  return {
    center: { ...metadata.center },
    radius: metadata.radius,
  };
}
