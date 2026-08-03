import assert from "node:assert/strict";
import test from "node:test";

import { snapToShape } from "./snapToShape.js";

const STYLE = {
  stroke: "#111111",
  strokeWidth: 4,
  strokeLineCap: "round",
  strokeLineJoin: "round",
};

const CASES = [
  {
    name: "line",
    points: roughPolyline(
      [
        { x: 100, y: 100 },
        { x: 560, y: 110 },
      ],
      28,
      7,
    ),
    verify(object) {
      assert.equal(object.type, "line");
    },
  },
  {
    name: "rectangle",
    points: roughPolyline(
      [
        { x: 120, y: 100 },
        { x: 520, y: 108 },
        { x: 514, y: 340 },
        { x: 112, y: 332 },
        { x: 139, y: 112 },
      ],
      14,
      7,
    ),
    verify(object) {
      assert.equal(object.type, "rect");
    },
  },
  {
    name: "circle",
    points: roughEllipse(
      { x: 330, y: 235 },
      135,
      130,
      48,
      10,
      0.12,
      1.7,
    ),
    verify(object) {
      assert.equal(object.type, "circle");
    },
  },
  {
    name: "ellipse",
    points: roughEllipse(
      { x: 340, y: 235 },
      190,
      95,
      48,
      10,
      0.1,
      1.7,
    ),
    verify(object) {
      assert.equal(object.type, "ellipse");
    },
  },
  {
    name: "polygon",
    points: roughPolyline(
      [
        { x: 330, y: 70 },
        { x: 520, y: 190 },
        { x: 455, y: 390 },
        { x: 205, y: 390 },
        { x: 135, y: 190 },
        { x: 350, y: 84 },
      ],
      10,
      7,
    ),
    verify(object) {
      assert.equal(object.type, "polygon");
      assert.equal(object.points.length, 5);
    },
  },
  {
    name: "arrow",
    points: roughPolyline(
      [
        { x: 100, y: 240 },
        { x: 560, y: 245 },
        { x: 475, y: 170 },
        { x: 560, y: 245 },
        { x: 472, y: 330 },
      ],
      10,
      6,
    ),
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
    points: createRoughSpeechBubble(),
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
    points: roughPolyline(
      createStarVertices({ x: 335, y: 235 }, 5, 170, 72),
      6,
      6,
      { x: 16, y: 12 },
    ),
    verify(object) {
      assert.equal(object.type, "polygon");
      assert.equal(object.points.length, 10);
    },
  },
];

for (const shapeCase of CASES) {
  test(`snapToShape recognizes a rough ${shapeCase.name}`, () => {
    const object = snapToShape(shapeCase.points, STYLE);

    assert.ok(object);
    shapeCase.verify(object);
  });
}

const GAPPED_CLOSED_CASES = [
  {
    name: "rectangle",
    points: roughPolyline(
      [
        { x: 120, y: 100 },
        { x: 520, y: 108 },
        { x: 514, y: 340 },
        { x: 112, y: 332 },
        { x: 116, y: 172 },
      ],
      14,
      7,
    ),
    verify(object) {
      assert.equal(object.type, "rect");
    },
  },
  {
    name: "circle",
    points: roughEllipse(
      { x: 330, y: 235 },
      135,
      130,
      48,
      8,
      0.55,
      1.4,
    ),
    verify(object) {
      assert.equal(object.type, "circle");
    },
  },
  {
    name: "ellipse",
    points: roughEllipse(
      { x: 340, y: 235 },
      190,
      95,
      48,
      8,
      0.65,
      1.4,
    ),
    verify(object) {
      assert.equal(object.type, "ellipse");
    },
  },
  {
    name: "polygon",
    points: roughPolyline(
      [
        { x: 330, y: 70 },
        { x: 520, y: 190 },
        { x: 455, y: 390 },
        { x: 205, y: 390 },
        { x: 135, y: 190 },
        { x: 270, y: 108 },
      ],
      10,
      6,
    ),
    verify(object) {
      assert.equal(object.type, "polygon");
      assert.equal(object.points.length, 5);
    },
  },
  {
    name: "speech bubble",
    points: createRoughSpeechBubble(0.55),
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
    points: roughPolyline(
      createStarVertices({ x: 335, y: 235 }, 5, 170, 72),
      6,
      6,
      { x: -21, y: 56 },
    ),
    verify(object) {
      assert.equal(object.type, "polygon");
      assert.equal(object.points.length, 10);
    },
  },
];

for (const shapeCase of GAPPED_CLOSED_CASES) {
  test(`snapToShape closes a visible gap in a rough ${shapeCase.name}`, () => {
    const first = shapeCase.points[0];
    const last = shapeCase.points.at(-1);

    assert.ok(Math.hypot(last.x - first.x, last.y - first.y) > 40);

    const object = snapToShape(shapeCase.points, STYLE);

    assert.ok(object);
    shapeCase.verify(object);
  });
}

test("snapToShape leaves rough non-shape strokes untouched", () => {
  const fullRotation = Math.PI * 2;
  const figureEight = Array.from({ length: 81 }, (_, index) => {
    const angle = (index / 80) * fullRotation;

    return {
      x: 200 + Math.sin(angle) * 120,
      y: 200 + Math.sin(angle * 2) * 80,
    };
  });
  const spiral = Array.from({ length: 80 }, (_, index) => {
    const angle = (index / 79) * fullRotation * 2.5;
    const radius = 15 + index * 1.5;

    return {
      x: 200 + Math.cos(angle) * radius,
      y: 200 + Math.sin(angle) * radius,
    };
  });
  const zigzag = [
    { x: 0, y: 0 },
    { x: 60, y: 50 },
    { x: 120, y: -20 },
    { x: 180, y: 60 },
    { x: 240, y: 0 },
  ];

  assert.equal(snapToShape(figureEight, STYLE), null);
  assert.equal(snapToShape(spiral, STYLE), null);
  assert.equal(snapToShape(zigzag, STYLE), null);
});

function roughPolyline(
  vertices,
  samplesPerEdge,
  amplitude = 3,
  endOffset = null,
) {
  const points = [];

  for (let edge = 0; edge < vertices.length - 1; edge += 1) {
    const start = vertices[edge];
    const end = vertices[edge + 1];
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const length = Math.hypot(deltaX, deltaY) || 1;
    const normalX = -deltaY / length;
    const normalY = deltaX / length;

    for (let sample = 0; sample < samplesPerEdge; sample += 1) {
      const progress = sample / samplesPerEdge;
      const jitter =
        Math.sin((points.length + 1) * 1.7) * amplitude +
        Math.sin((points.length + 1) * 0.41) * amplitude * 0.35;

      points.push({
        x: start.x + deltaX * progress + normalX * jitter,
        y: start.y + deltaY * progress + normalY * jitter,
      });
    }
  }

  const finalPoint = { ...vertices.at(-1) };

  if (endOffset) {
    finalPoint.x += endOffset.x;
    finalPoint.y += endOffset.y;
  }

  points.push(finalPoint);
  return points;
}

function roughEllipse(
  center,
  radiusX,
  radiusY,
  count,
  noise,
  closureGap,
  samplingPower,
) {
  return Array.from({ length: count + 1 }, (_, index) => {
    const progress = index / count;
    const angle =
      Math.pow(progress, samplingPower) * (Math.PI * 2 - closureGap);
    const radialNoise =
      Math.sin(index * 1.73) * noise +
      Math.sin(index * 0.37) * noise * 0.4;

    return {
      x: center.x + Math.cos(angle) * (radiusX + radialNoise),
      y: center.y + Math.sin(angle) * (radiusY + radialNoise * 0.7),
    };
  });
}

function createRoughSpeechBubble(closureGap = 0) {
  const body = roughEllipse(
    { x: 330, y: 210 },
    190,
    105,
    56,
    8,
    closureGap,
    1,
  );
  const tailIndex = 10;

  return [
    ...body.slice(0, tailIndex),
    { x: 500, y: 320 },
    { x: 520, y: 410 },
    { x: 455, y: 306 },
    ...body.slice(tailIndex + 2),
  ];
}

function createStarVertices(center, pointCount, outerRadius, innerRadius) {
  return Array.from({ length: pointCount * 2 + 1 }, (_, index) => {
    const normalizedIndex = index % (pointCount * 2);
    const angle =
      -Math.PI / 2 + (normalizedIndex * Math.PI) / pointCount;
    const radius = normalizedIndex % 2 === 0 ? outerRadius : innerRadius;

    return {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    };
  });
}
