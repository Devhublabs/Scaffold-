import assert from "node:assert/strict";
import test from "node:test";
import * as fabric from "fabric";

import { createPathCreatedHandler } from "./pathCreatedHandler.js";

test("path handler replaces, remembers, and emits the snapped object", () => {
  const path = createPressurePath([
    [0, 0],
    [25, 1],
    [50, -1],
    [75, 0],
    [100, 0],
  ]);
  const before = new fabric.Rect({ width: 10, height: 10 });
  const after = new fabric.Circle({ radius: 5 });
  const canvas = createCanvasStub([before, path, after]);
  const remembered = [];
  const emitted = [];
  const handler = createPathCreatedHandler({
    canvas,
    shouldSnap: () => true,
    getLayerId: () => "ink-layer",
    rememberObject: (object, layerId) => remembered.push({ object, layerId }),
    emitCanvasObject: (object) => emitted.push(object),
  });

  const finalObject = handler({ path });

  assert.notEqual(finalObject, path);
  assert.equal(finalObject.type, "line");
  assert.deepEqual(canvas.objects, [before, finalObject, after]);
  assert.deepEqual(remembered, [
    { object: finalObject, layerId: "ink-layer" },
  ]);
  assert.deepEqual(emitted, [finalObject]);
  assert.equal(canvas.renderCount, 1);
});

test("path handler replaces an unmatched path with a smoothed freehand path", () => {
  const path = createPressurePath([
    [20, 20],
    [31, 31],
    [42, 27],
    [53, 43],
    [66, 57],
    [80, 65],
    [95, 58],
    [110, 43],
    [122, 30],
  ]);
  const canvas = createCanvasStub([path]);
  const committed = [];
  const handler = createPathCreatedHandler({
    canvas,
    shouldSnap: () => true,
    getLayerId: () => "sketch-layer",
    rememberObject: (object, layerId) => committed.push({ object, layerId }),
    emitCanvasObject: (object) => committed.push({ emitted: object }),
  });

  const finalObject = handler({ path });

  assert.notEqual(finalObject, path);
  assert.equal(finalObject.type, "path");
  assert.deepEqual(canvas.objects, [finalObject]);
  assert.deepEqual(committed, [
    { object: finalObject, layerId: "sketch-layer" },
    { emitted: finalObject },
  ]);
  assert.equal(canvas.renderCount, 1);
});

test("path handler preserves the original path when snapping is disabled", () => {
  const path = createPressurePath([
    [20, 20],
    [31, 31],
    [42, 27],
    [53, 43],
    [66, 57],
    [80, 65],
    [95, 58],
    [110, 43],
    [122, 30],
  ]);
  const canvas = createCanvasStub([path]);
  const remembered = [];
  const emitted = [];
  const handler = createPathCreatedHandler({
    canvas,
    shouldSnap: () => false,
    getLayerId: () => "sketch-layer",
    rememberObject: (object) => remembered.push(object),
    emitCanvasObject: (object) => emitted.push(object),
  });

  const finalObject = handler({ path });

  assert.equal(finalObject, path);
  assert.deepEqual(canvas.objects, [path]);
  assert.deepEqual(remembered, [path]);
  assert.deepEqual(emitted, [path]);
  assert.equal(canvas.renderCount, 0);
});

test("path handler bypasses snapping for eraser paths", () => {
  const path = createPressurePath([
    [0, 0],
    [25, 0],
    [50, 0],
    [75, 0],
    [100, 0],
  ]);
  const canvas = createCanvasStub([path]);
  const remembered = [];
  const emitted = [];
  const handler = createPathCreatedHandler({
    canvas,
    shouldSnap: () => false,
    getLayerId: () => "sketch-layer",
    rememberObject: (object) => remembered.push(object),
    emitCanvasObject: (object) => emitted.push(object),
  });

  const finalObject = handler({ path });

  assert.equal(finalObject, path);
  assert.deepEqual(canvas.objects, [path]);
  assert.deepEqual(remembered, [path]);
  assert.deepEqual(emitted, [path]);
  assert.equal(canvas.renderCount, 0);
});

function createPressurePath(points) {
  const path = new fabric.Path([
    ["M", points[0][0], points[0][1]],
    ...points.slice(1).map(([x, y]) => ["L", x, y]),
  ]);

  path.scaffoldStrokeData = {
    points,
    pressures: points.map(() => 0.5),
    color: "#111111",
    width: 4,
  };

  return path;
}

function createCanvasStub(initialObjects) {
  return {
    objects: [...initialObjects],
    renderCount: 0,
    getObjects() {
      return [...this.objects];
    },
    remove(object) {
      this.objects = this.objects.filter((candidate) => candidate !== object);
    },
    insertAt(index, object) {
      this.objects.splice(index, 0, object);
    },
    add(object) {
      this.objects.push(object);
    },
    requestRenderAll() {
      this.renderCount += 1;
    },
  };
}
