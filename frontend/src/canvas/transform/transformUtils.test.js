import assert from "node:assert/strict";
import test from "node:test";
import * as fabric from "fabric";

import {
  bringForward,
  copy,
  deleteSelection,
  duplicate,
  move,
  rotate,
  scale,
  selectAll,
  sendBackward,
} from "./transformUtils.js";

test("move, scale, and rotate update the active object and fire events", () => {
  const object = new fabric.Rect({
    left: 20,
    top: 30,
    width: 40,
    height: 20,
  });
  const canvas = new CanvasStub([object]);
  canvas.activeObject = object;

  move(canvas, 5, -3);
  scale(canvas, 2, 1.5);
  rotate(canvas, 35);

  assert.equal(object.left, 25);
  assert.equal(object.top, 27);
  assert.equal(object.scaleX, 2);
  assert.equal(object.scaleY, 1.5);
  assert.equal(object.angle, 35);
  assert.deepEqual(
    canvas.firedEvents.map(({ eventName }) => eventName),
    [
      "before:transform",
      "object:moving",
      "object:modified",
      "before:transform",
      "object:scaling",
      "object:modified",
      "before:transform",
      "object:rotating",
      "object:modified",
    ],
  );
});

test("copy and duplicate preserve object data and select the clone", async () => {
  const object = new fabric.Path("M 0 0 L 40 20", {
    left: 10,
    top: 15,
    stroke: "#234567",
    strokeWidth: 6,
  });
  object.scaffoldStrokeData = {
    points: [[0, 0], [40, 20]],
    color: "#234567",
    width: 6,
  };
  const canvas = new CanvasStub([object]);
  canvas.activeObject = object;

  const clipboard = await copy(canvas);
  const result = await duplicate(canvas);

  assert.ok(clipboard);
  assert.equal(result.objects.length, 1);
  assert.notEqual(result.objects[0], object);
  assert.equal(result.objects[0].left, object.left + 12);
  assert.equal(result.objects[0].top, object.top + 12);
  assert.deepEqual(
    result.objects[0].scaffoldStrokeData,
    object.scaffoldStrokeData,
  );
  assert.equal(canvas.activeObject, result.activeObject);
});

test("duplicate keeps a multi-selection grouped and adds each clone", async () => {
  const first = new fabric.Rect({ left: 10, top: 10, width: 20, height: 20 });
  const second = new fabric.Circle({ left: 50, top: 50, radius: 10 });
  const canvas = new CanvasStub([first, second]);
  canvas.activeObject = new fabric.ActiveSelection(
    [first, second],
    { canvas },
  );

  const result = await duplicate(canvas);

  assert.equal(result.objects.length, 2);
  assert.ok(result.activeObject instanceof fabric.ActiveSelection);
  assert.equal(canvas.objects.length, 4);
  assert.deepEqual(canvas.getActiveObjects(), result.objects);
});

test("selection utilities select, delete, and preserve multi-object ordering", () => {
  const first = new fabric.Rect({ width: 10, height: 10 });
  const second = new fabric.Rect({ width: 10, height: 10 });
  const third = new fabric.Rect({ width: 10, height: 10 });
  const fourth = new fabric.Rect({ width: 10, height: 10 });
  const canvas = new CanvasStub([first, second, third, fourth]);

  const activeSelection = selectAll(canvas);
  assert.ok(activeSelection instanceof fabric.ActiveSelection);
  assert.deepEqual(canvas.getActiveObjects(), [first, second, third, fourth]);

  canvas.activeObject = new fabric.ActiveSelection(
    [second, third],
    { canvas },
  );
  bringForward(canvas);
  assert.deepEqual(canvas.objects, [first, fourth, second, third]);

  sendBackward(canvas);
  assert.deepEqual(canvas.objects, [second, third, first, fourth]);

  const deleted = deleteSelection(canvas);
  assert.deepEqual(deleted, [second, third]);
  assert.deepEqual(canvas.objects, [first, fourth]);
  assert.equal(canvas.activeObject, null);
});

class CanvasStub {
  constructor(objects = []) {
    this.objects = [...objects];
    this.activeObject = null;
    this.firedEvents = [];
    this.renderCount = 0;
  }

  getObjects() {
    return [...this.objects];
  }

  getActiveObject() {
    return this.activeObject;
  }

  getActiveObjects() {
    if (!this.activeObject) return [];
    if (this.activeObject instanceof fabric.ActiveSelection) {
      return this.activeObject.getObjects();
    }
    return [this.activeObject];
  }

  setActiveObject(object) {
    this.activeObject = object;
  }

  discardActiveObject() {
    this.activeObject = null;
  }

  add(...objects) {
    this.objects.push(...objects);
  }

  remove(...objects) {
    const removed = new Set(objects);
    this.objects = this.objects.filter((object) => !removed.has(object));
  }

  bringObjectForward(object) {
    const index = this.objects.indexOf(object);
    if (index < 0 || index === this.objects.length - 1) return;
    this.objects.splice(index, 1);
    this.objects.splice(index + 1, 0, object);
  }

  sendObjectBackwards(object) {
    const index = this.objects.indexOf(object);
    if (index <= 0) return;
    this.objects.splice(index, 1);
    this.objects.splice(index - 1, 0, object);
  }

  fire(eventName, event) {
    this.firedEvents.push({ eventName, event });
  }

  requestRenderAll() {
    this.renderCount += 1;
  }
}
