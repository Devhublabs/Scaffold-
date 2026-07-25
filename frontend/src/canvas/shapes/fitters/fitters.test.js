import assert from "node:assert/strict";
import test from "node:test";

import { detectArrow } from "../detectors/arrowDetector.js";
import { detectCircle } from "../detectors/circleDetector.js";
import { detectEllipse } from "../detectors/ellipseDetector.js";
import { detectPolygon } from "../detectors/polygonDetector.js";
import { detectRectangle } from "../detectors/rectangleDetector.js";
import { detectStar } from "../detectors/starDetector.js";
import { fitArrow } from "./fitArrow.js";
import { fitCircle } from "./fitCircle.js";
import { fitEllipse } from "./fitEllipse.js";
import { fitPolygon } from "./fitPolygon.js";
import { fitRectangle } from "./fitRectangle.js";
import { fitSpeechBubble } from "./fitSpeechBubble.js";
import { fitStar } from "./fitStar.js";

const FULL_ROTATION = Math.PI * 2;

test("fitRectangle returns cleaned axis-aligned bounds", () => {
  const points = [
    { x: 10, y: 20 },
    { x: 70, y: 19 },
    { x: 72, y: 55 },
    { x: 9, y: 57 },
    { x: 10, y: 20 },
  ];
  const detection = {
    metadata: {
      boundingBox: {
        minX: 9,
        minY: 19,
        maxX: 72,
        maxY: 57,
        width: 63,
        height: 38,
        centerX: 40.5,
        centerY: 38,
      },
    },
  };

  const result = fitRectangle(points, detection);

  assert.deepEqual(result, {
    left: 9,
    top: 19,
    width: 63,
    height: 38,
    center: { x: 40.5, y: 38 },
    angle: 0,
    corners: [
      { x: 9, y: 19 },
      { x: 72, y: 19 },
      { x: 72, y: 57 },
      { x: 9, y: 57 },
    ],
  });
});

test("fitCircle recovers least-squares center and radius", () => {
  const points = sampleParametric(80, (angle) => ({
    x: 42 + Math.cos(angle) * 18,
    y: -15 + Math.sin(angle) * 18,
  }));

  const result = fitCircle(points, null);

  assert.ok(result);
  assertPointClose(result.center, { x: 42, y: -15 }, 1e-8);
  assertClose(result.radius, 18, 1e-8);
  assertClose(result.diameter, 36, 1e-8);
});

test("fitEllipse preserves oriented principal axes", () => {
  const center = { x: 120, y: 80 };
  const radiusX = 45;
  const radiusY = 20;
  const angle = Math.PI / 6;
  const points = sampleParametric(120, (parameter) =>
    ellipsePoint(center, radiusX, radiusY, angle, parameter),
  );

  const result = fitEllipse(points, null);

  assert.ok(result);
  assertPointClose(result.center, center, 1e-8);
  assertClose(result.radiusX, radiusX, 1e-8);
  assertClose(result.radiusY, radiusY, 1e-8);
  assertClose(axisAngleDifference(result.angle, angle), 0, 1e-8);
});

test("fitPolygon straightens detected corners into polygon vertices", () => {
  const corners = [
    { x: 5, y: 0 },
    { x: 30, y: 4 },
    { x: 24, y: 25 },
    { x: 2, y: 20 },
  ];
  const points = [...corners, corners[0]];
  const result = fitPolygon(points, {
    metadata: {
      sides: 4,
      corners: [...corners, corners[0]],
    },
  });

  assert.ok(result);
  assert.equal(result.sides, 4);
  assert.deepEqual(result.vertices, corners);
  assert.equal(result.closed, true);
  assertPointClose(result.center, { x: 15.25, y: 12.25 }, 1e-8);
});

test("fitArrow creates a straight shaft and symmetric head", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 25, y: 1 },
    { x: 50, y: -1 },
    { x: 75, y: 0 },
    { x: 100, y: 0 },
    { x: 78, y: -18 },
    { x: 100, y: 0 },
    { x: 78, y: 22 },
  ];
  const result = fitArrow(points, {
    metadata: { direction: 0 },
  });

  assert.ok(result);
  assertPointClose(result.shaft.start, { x: 0, y: 0 }, 1e-8);
  assertPointClose(result.shaft.end, { x: 100, y: 0 }, 1e-8);
  assertClose(result.shaft.length, 100, 1e-8);
  assertPointClose(result.head.tip, { x: 100, y: 0 }, 1e-8);
  assertClose(result.head.left.x, result.head.right.x, 1e-8);
  assertClose(result.head.left.y, -result.head.right.y, 1e-8);
  assertClose(result.head.width, 40, 1e-8);
});

test("fitSpeechBubble separates an ellipse body from its tail", () => {
  const center = { x: 60, y: 45 };
  const bodyRadiusX = 42;
  const bodyRadiusY = 24;
  const tailTip = { x: 82, y: 92 };
  const points = [];

  for (let index = 0; index <= 96; index += 1) {
    const angle = (index / 96) * FULL_ROTATION;

    if (index === 22) {
      points.push({ x: 79, y: 67 });
      points.push(tailTip);
      points.push({ x: 92, y: 61 });
      continue;
    }

    if (index > 22 && index < 28) {
      continue;
    }

    points.push(
      ellipsePoint(center, bodyRadiusX, bodyRadiusY, 0, angle),
    );
  }

  const result = fitSpeechBubble(points, {
    metadata: { tailPosition: tailTip },
  });

  assert.ok(result);
  assertPointClose(result.tail.tip, tailTip, 1e-8);
  assert.ok(result.body.radiusX > result.body.radiusY);
  assert.ok(result.body.radiusX > 30);
  assert.ok(result.body.radiusY > 15);
  assert.ok(result.tail.anchor.y > result.body.center.y);
});

test("fitStar regularizes point count, radii, and orientation", () => {
  const center = { x: 100, y: 90 };
  const pointCount = 5;
  const outerRadius = 50;
  const innerRadius = 22;
  const rotation = -Math.PI / 2;
  const vertices = createStarVertices(
    center,
    pointCount,
    outerRadius,
    innerRadius,
    rotation,
  );
  const points = sampleClosedPolyline(vertices, 12);
  const result = fitStar(points, {
    metadata: { points: pointCount },
  });

  assert.ok(result);
  assert.equal(result.points, pointCount);
  assert.equal(result.vertices.length, pointCount * 2);
  assert.equal(result.closed, true);
  assertPointClose(result.center, center, 0.5);
  assertClose(result.outerRadius, outerRadius, 1);
  assertClose(result.innerRadius, innerRadius, 1);
  assertClose(axisAngleDifference(result.rotation, rotation, pointCount), 0, 0.05);
});

test("remaining fitters reject unusable input", () => {
  assert.equal(fitRectangle([], null), null);
  assert.equal(fitCircle([{ x: 0, y: 0 }], null), null);
  assert.equal(fitEllipse([], null), null);
  assert.equal(fitPolygon([], null), null);
  assert.equal(fitArrow([], null), null);
  assert.equal(fitSpeechBubble([], null), null);
  assert.equal(fitStar([], null), null);
});

test("fitters consume the current detector metadata contracts", () => {
  const rectangle = sampleClosedPolyline(
    [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 60 },
      { x: 0, y: 60 },
    ],
    12,
  );
  const polygon = sampleClosedPolyline(
    [
      { x: 0, y: 0 },
      { x: 70, y: -10 },
      { x: 100, y: 45 },
      { x: 45, y: 85 },
      { x: -15, y: 50 },
    ],
    12,
  );
  const circle = sampleParametric(80, (angle) => ({
    x: 50 + Math.cos(angle) * 30,
    y: 40 + Math.sin(angle) * 30,
  }));
  const ellipse = sampleParametric(100, (angle) =>
    ellipsePoint({ x: 60, y: 50 }, 45, 20, Math.PI / 5, angle),
  );
  const arrow = [
    { x: 0, y: 0 },
    { x: 25, y: 0 },
    { x: 50, y: 0 },
    { x: 75, y: 0 },
    { x: 100, y: 0 },
    { x: 78, y: -20 },
    { x: 100, y: 0 },
    { x: 78, y: 20 },
  ];
  const star = sampleClosedPolyline(
    createStarVertices(
      { x: 80, y: 80 },
      5,
      50,
      22,
      -Math.PI / 2,
    ),
    12,
  );
  const cases = [
    [rectangle, detectRectangle, fitRectangle],
    [polygon, detectPolygon, fitPolygon],
    [circle, detectCircle, fitCircle],
    [ellipse, detectEllipse, fitEllipse],
    [arrow, detectArrow, fitArrow],
    [star, detectStar, fitStar],
  ];

  for (const [points, detect, fit] of cases) {
    const detection = detect(points);

    assert.ok(detection);
    assert.ok(fit(points, detection));
  }
});

function sampleParametric(count, createPoint) {
  return Array.from({ length: count }, (_, index) =>
    createPoint((index / count) * FULL_ROTATION),
  );
}

function ellipsePoint(center, radiusX, radiusY, angle, parameter) {
  const localX = Math.cos(parameter) * radiusX;
  const localY = Math.sin(parameter) * radiusY;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);

  return {
    x: center.x + localX * cosine - localY * sine,
    y: center.y + localX * sine + localY * cosine,
  };
}

function createStarVertices(
  center,
  pointCount,
  outerRadius,
  innerRadius,
  rotation,
) {
  return Array.from({ length: pointCount * 2 }, (_, index) => {
    const angle = rotation + (index * Math.PI) / pointCount;
    const radius = index % 2 === 0 ? outerRadius : innerRadius;

    return {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    };
  });
}

function sampleClosedPolyline(vertices, samplesPerEdge) {
  const points = [];

  for (let index = 0; index < vertices.length; index += 1) {
    const start = vertices[index];
    const end = vertices[(index + 1) % vertices.length];

    for (let sample = 0; sample < samplesPerEdge; sample += 1) {
      const interpolation = sample / samplesPerEdge;

      points.push({
        x: start.x + (end.x - start.x) * interpolation,
        y: start.y + (end.y - start.y) * interpolation,
      });
    }
  }

  points.push({ ...points[0] });
  return points;
}

function axisAngleDifference(first, second, symmetry = 2) {
  const period = FULL_ROTATION / symmetry;
  const difference = Math.abs(first - second) % period;
  return Math.min(difference, period - difference);
}

function assertPointClose(actual, expected, tolerance) {
  assertClose(actual.x, expected.x, tolerance);
  assertClose(actual.y, expected.y, tolerance);
}

function assertClose(actual, expected, tolerance) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}
