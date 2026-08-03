import assert from "node:assert/strict";
import test from "node:test";

import { snapToShape } from "./snapToShape.js";

const FULL_ROTATION = Math.PI * 2;
const STYLE = {
  stroke: "#2468ac",
  strokeWidth: 7,
  strokeLineCap: "round",
  strokeLineJoin: "round",
};

const CASES = [
  {
    name: "line",
    points: Array.from({ length: 20 }, (_, index) => ({
      x: 10 + index * 5,
      y: 20 + (index % 2 === 0 ? -0.4 : 0.4),
    })),
    verify(object) {
      assert.equal(object.type, "line");
    },
  },
  {
    name: "rectangle",
    points: sampleClosedPolyline([
      { x: 10, y: 20 },
      { x: 110, y: 20 },
      { x: 110, y: 80 },
      { x: 10, y: 80 },
    ]),
    verify(object) {
      assert.equal(object.type, "rect");
    },
  },
  {
    name: "circle",
    points: sampleParametric(80, (angle) => ({
      x: 160 + Math.cos(angle) * 35,
      y: 90 + Math.sin(angle) * 35,
    })),
    verify(object) {
      assert.equal(object.type, "circle");
    },
  },
  {
    name: "ellipse",
    points: sampleParametric(100, (angle) =>
      ellipsePoint({ x: 180, y: 120 }, 55, 24, Math.PI / 6, angle),
    ),
    verify(object) {
      assert.equal(object.type, "ellipse");
    },
  },
  {
    name: "polygon",
    points: sampleClosedPolyline([
      { x: 10, y: 10 },
      { x: 90, y: 0 },
      { x: 125, y: 60 },
      { x: 65, y: 110 },
      { x: 0, y: 70 },
    ]),
    verify(object) {
      assert.equal(object.type, "polygon");
      assert.equal(object.points.length, 5);
    },
  },
  {
    name: "arrow",
    points: [
      { x: 0, y: 0 },
      { x: 25, y: 0 },
      { x: 50, y: 0 },
      { x: 75, y: 0 },
      { x: 100, y: 0 },
      { x: 78, y: -20 },
      { x: 100, y: 0 },
      { x: 78, y: 20 },
    ],
    verify(object) {
      assert.equal(object.type, "group");
      assert.deepEqual(
        object.getObjects().map((part) => part.type),
        ["line", "triangle"],
      );
    },
  },
  {
    name: "speech bubble",
    points: createSpeechBubblePoints(),
    verify(object) {
      assert.equal(object.type, "group");
      assert.deepEqual(
        object.getObjects().map((part) => part.type),
        ["polygon", "ellipse"],
      );
    },
  },
  {
    name: "star",
    points: sampleClosedPolyline(
      createStarVertices(
        { x: 100, y: 100 },
        5,
        55,
        24,
        -Math.PI / 2,
      ),
    ),
    verify(object) {
      assert.equal(object.type, "polygon");
      assert.equal(object.points.length, 10);
    },
  },
];

for (const shapeCase of CASES) {
  test(`snapToShape creates a styled ${shapeCase.name}`, () => {
    const object = snapToShape(shapeCase.points, STYLE);

    assert.ok(object);
    shapeCase.verify(object);
    assertObjectStyle(object, STYLE);
  });
}

test("snapToShape keeps non-shape strokes untouched by returning null", () => {
  const scribble = [
    { x: 0, y: 0 },
    { x: 20, y: 10 },
    { x: 5, y: 30 },
    { x: 35, y: 20 },
    { x: 10, y: 5 },
  ];

  assert.equal(snapToShape(scribble, STYLE), null);
});

function assertObjectStyle(object, style) {
  const objects = object.type === "group" ? object.getObjects() : [object];

  for (const item of objects) {
    assert.equal(item.stroke, style.stroke);
    assert.equal(item.strokeWidth, style.strokeWidth);
    assert.equal(item.strokeLineCap, style.strokeLineCap);
    assert.equal(item.strokeLineJoin, style.strokeLineJoin);
  }
}

function sampleParametric(count, createPoint) {
  const points = Array.from({ length: count }, (_, index) =>
    createPoint((index / count) * FULL_ROTATION),
  );
  points.push({ ...points[0] });
  return points;
}

function sampleClosedPolyline(vertices, samplesPerEdge = 12) {
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

function createSpeechBubblePoints() {
  const center = { x: 100, y: 100 };
  const radiusX = 40;
  const radiusY = 14;
  const tailAngle = 0;
  const tailGap = 0.04;
  const sampleCount = 120;
  const points = [];
  const startAngle = tailAngle + tailGap;
  const bodySpan = FULL_ROTATION - tailGap * 2;

  for (let index = 0; index <= sampleCount; index += 1) {
    points.push(
      ellipsePoint(
        center,
        radiusX,
        radiusY,
        0,
        startAngle + (index / sampleCount) * bodySpan,
      ),
    );
  }

  points.push(
    { x: center.x + radiusX * 1.25, y: center.y },
    ellipsePoint(center, radiusX, radiusY, 0, tailAngle - tailGap),
    { ...points[0] },
  );
  return points;
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
