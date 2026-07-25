import { angleBetween, distance } from "../utils/index.js";
import { getValidPoints } from "./fitUtils.js";

const TIP_DISTANCE_TOLERANCE = 0.97;

/**
 * Compute best-fit arrow geometry after arrow intent has been detected.
 *
 * @param {Array<{ x: number, y: number }>} points - Ordered stroke points.
 * @param {object|null} detection - Metadata produced by the arrow detector.
 * @returns {{
 *   direction: number,
 *   shaft: {
 *     start: { x: number, y: number },
 *     end: { x: number, y: number },
 *     length: number,
 *     angle: number
 *   },
 *   head: {
 *     tip: { x: number, y: number },
 *     left: { x: number, y: number },
 *     right: { x: number, y: number },
 *     depth: number,
 *     width: number,
 *     length: number,
 *     angle: number
 *   }
 * }|null} Straight shaft and symmetric arrowhead geometry.
 */
export function fitArrow(points, detection) {
  const validPoints = getValidPoints(points);

  if (validPoints.length < 5) {
    return null;
  }

  const rawStart = validPoints[0];
  const tip = findArrowTip(validPoints, rawStart);

  if (
    tip === null ||
    tip.index <= 0 ||
    tip.index >= validPoints.length - 2
  ) {
    return null;
  }

  let direction = Number.isFinite(detection?.metadata?.direction)
    ? detection.metadata.direction
    : angleBetween(rawStart, tip.point);

  if (direction === null || !Number.isFinite(direction)) {
    return null;
  }

  let directionX = Math.cos(direction);
  let directionY = Math.sin(direction);
  const rawShaftX = tip.point.x - rawStart.x;
  const rawShaftY = tip.point.y - rawStart.y;
  let shaftLength = rawShaftX * directionX + rawShaftY * directionY;

  if (!Number.isFinite(shaftLength) || shaftLength <= 0) {
    direction = angleBetween(rawStart, tip.point);

    if (direction === null) {
      return null;
    }

    directionX = Math.cos(direction);
    directionY = Math.sin(direction);
    shaftLength = distance(rawStart, tip.point);
  }

  if (
    shaftLength === null ||
    !Number.isFinite(shaftLength) ||
    shaftLength <= 0
  ) {
    return null;
  }

  const branchGeometry = measureArrowhead(
    validPoints.slice(tip.index + 1),
    tip.point,
    directionX,
    directionY,
  );

  if (branchGeometry === null) {
    return null;
  }

  const start = {
    x: tip.point.x - directionX * shaftLength,
    y: tip.point.y - directionY * shaftLength,
  };
  const normalX = -directionY;
  const normalY = directionX;
  const headBaseX = tip.point.x - directionX * branchGeometry.depth;
  const headBaseY = tip.point.y - directionY * branchGeometry.depth;
  const left = {
    x: headBaseX + normalX * branchGeometry.halfWidth,
    y: headBaseY + normalY * branchGeometry.halfWidth,
  };
  const right = {
    x: headBaseX - normalX * branchGeometry.halfWidth,
    y: headBaseY - normalY * branchGeometry.halfWidth,
  };
  const headLength = Math.hypot(
    branchGeometry.depth,
    branchGeometry.halfWidth,
  );

  return {
    direction,
    shaft: {
      start,
      end: { ...tip.point },
      length: shaftLength,
      angle: direction,
    },
    head: {
      tip: { ...tip.point },
      left,
      right,
      depth: branchGeometry.depth,
      width: branchGeometry.halfWidth * 2,
      length: headLength,
      angle: Math.atan2(
        branchGeometry.halfWidth,
        branchGeometry.depth,
      ),
    },
  };
}

/**
 * Find the first point within tolerance of the maximum origin distance.
 *
 * @param {Array<{ x: number, y: number }>} points - Stroke points.
 * @param {{ x: number, y: number }} origin - Shaft origin.
 * @returns {{ point: { x: number, y: number }, index: number }|null}
 */
function findArrowTip(points, origin) {
  const candidates = [];
  let maximumDistance = 0;

  for (let index = 1; index < points.length; index += 1) {
    const pointDistance = distance(origin, points[index]);

    if (pointDistance === null || !Number.isFinite(pointDistance)) {
      return null;
    }

    candidates.push({
      point: points[index],
      index,
      distance: pointDistance,
    });
    maximumDistance = Math.max(maximumDistance, pointDistance);
  }

  const tip = candidates.find(
    (candidate) =>
      candidate.distance >= maximumDistance * TIP_DISTANCE_TOLERANCE,
  );

  return tip
    ? {
        point: { ...tip.point },
        index: tip.index,
      }
    : null;
}

/**
 * Measure one strong branch on each side of the shaft.
 *
 * @param {Array<{ x: number, y: number }>} points - Arrowhead stroke points.
 * @param {{ x: number, y: number }} tip - Arrow tip.
 * @param {number} directionX - Shaft unit vector x.
 * @param {number} directionY - Shaft unit vector y.
 * @returns {{ depth: number, halfWidth: number }|null}
 */
function measureArrowhead(points, tip, directionX, directionY) {
  let positiveBranch = null;
  let negativeBranch = null;

  for (const point of points) {
    const relativeX = point.x - tip.x;
    const relativeY = point.y - tip.y;
    const projection = relativeX * directionX + relativeY * directionY;
    const lateral = directionX * relativeY - directionY * relativeX;
    const branchLength = Math.hypot(relativeX, relativeY);

    if (
      !Number.isFinite(projection) ||
      !Number.isFinite(lateral) ||
      !Number.isFinite(branchLength) ||
      branchLength === 0 ||
      projection >= 0
    ) {
      continue;
    }

    const candidate = {
      depth: -projection,
      halfWidth: Math.abs(lateral),
      length: branchLength,
    };

    if (lateral > 0) {
      if (
        positiveBranch === null ||
        candidate.length > positiveBranch.length
      ) {
        positiveBranch = candidate;
      }
    } else if (
      lateral < 0 &&
      (negativeBranch === null ||
        candidate.length > negativeBranch.length)
    ) {
      negativeBranch = candidate;
    }
  }

  if (positiveBranch === null || negativeBranch === null) {
    return null;
  }

  const depth = (positiveBranch.depth + negativeBranch.depth) / 2;
  const halfWidth =
    (positiveBranch.halfWidth + negativeBranch.halfWidth) / 2;

  return depth > 0 && halfWidth > 0
    ? { depth, halfWidth }
    : null;
}
