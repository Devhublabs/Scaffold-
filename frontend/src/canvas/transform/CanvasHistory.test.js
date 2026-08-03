import assert from "node:assert/strict";
import test from "node:test";
import * as fabric from "fabric";

import { CanvasHistory } from "../history/CanvasHistory.js";

test("undo and redo treat a multi-object add as one history operation", () => {
  const base = new fabric.Rect({ width: 10, height: 10 });
  const first = new fabric.Rect({ width: 20, height: 20 });
  const second = new fabric.Circle({ radius: 8 });
  const canvas = new HistoryCanvasStub([base, first, second]);
  const calls = [];
  const history = createHistory(canvas, calls);

  history.recordAdd([
    { object: first, layerId: "sketch", stackIndex: 1 },
    { object: second, layerId: "sketch", stackIndex: 2 },
  ]);

  assert.equal(history.undo(), true);
  assert.deepEqual(canvas.objects, [base]);
  assert.deepEqual(
    calls.filter(([type]) => type === "removed"),
    [
      ["removed", first, "sketch"],
      ["removed", second, "sketch"],
    ],
  );

  assert.equal(history.redo(), true);
  assert.deepEqual(canvas.objects, [base, first, second]);
});

test("undo restores deleted objects to their layers and stack positions", () => {
  const first = new fabric.Rect({ width: 10, height: 10 });
  const second = new fabric.Rect({ width: 20, height: 20 });
  const third = new fabric.Rect({ width: 30, height: 30 });
  const canvas = new HistoryCanvasStub([first, second, third]);
  const calls = [];
  const history = createHistory(canvas, calls);

  canvas.remove(second);
  history.recordDelete([
    { object: second, layerId: "ink", stackIndex: 1 },
  ]);

  assert.equal(history.undo(), true);
  assert.deepEqual(canvas.objects, [first, second, third]);
  assert.ok(
    calls.some(
      ([type, object, layerId]) =>
        type === "restored" && object === second && layerId === "ink",
    ),
  );

  assert.equal(history.redo(), true);
  assert.deepEqual(canvas.objects, [first, third]);
});

test("undo and redo restore completed object transforms", () => {
  const object = new fabric.Rect({
    left: 10,
    top: 15,
    width: 40,
    height: 20,
  });
  const canvas = new HistoryCanvasStub([object]);
  const history = createHistory(canvas, []);
  const before = [...object.calcTransformMatrix()];

  history.beginTransform(object);
  object.set({
    left: 70,
    top: 45,
    scaleX: 1.8,
    scaleY: 1.4,
    angle: 25,
  });
  object.setCoords();
  const after = [...object.calcTransformMatrix()];

  assert.equal(history.commitTransform(), true);
  assert.equal(history.undo(), true);
  assertMatrixClose(object.calcTransformMatrix(), before);

  assert.equal(history.redo(), true);
  assertMatrixClose(object.calcTransformMatrix(), after);
});

function createHistory(canvas, calls) {
  return new CanvasHistory(canvas, {
    clearSelection: () => {
      canvas.discardActiveObject();
      calls.push(["selection-cleared"]);
    },
    onObjectRestored: ({ object, layerId }) =>
      calls.push(["restored", object, layerId]),
    onObjectRemoved: ({ object, layerId }) =>
      calls.push(["removed", object, layerId]),
    onStackOrderChanged: () => calls.push(["stack-synced"]),
  });
}

function assertMatrixClose(actual, expected, epsilon = 1e-8) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => {
    assert.ok(
      Math.abs(value - expected[index]) <= epsilon,
      `matrix value ${index} differs: ${value} !== ${expected[index]}`,
    );
  });
}

class HistoryCanvasStub {
  constructor(objects = []) {
    this.objects = [...objects];
    this.activeObject = null;
    this.renderCount = 0;
  }

  getObjects() {
    return [...this.objects];
  }

  insertAt(index, object) {
    this.objects.splice(index, 0, object);
  }

  add(...objects) {
    this.objects.push(...objects);
  }

  remove(...objects) {
    const removed = new Set(objects);
    this.objects = this.objects.filter((object) => !removed.has(object));
  }

  moveObjectTo(object, index) {
    const currentIndex = this.objects.indexOf(object);
    if (currentIndex < 0) return;
    this.objects.splice(currentIndex, 1);
    this.objects.splice(index, 0, object);
  }

  discardActiveObject() {
    this.activeObject = null;
  }

  requestRenderAll() {
    this.renderCount += 1;
  }
}
