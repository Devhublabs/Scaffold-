import assert from "node:assert/strict";
import test from "node:test";
import * as fabric from "fabric";

import { TransformManager } from "./TransformManager.js";

test("transform manager switches modes and configures object controls", () => {
  const object = new fabric.Rect({ width: 20, height: 20 });
  const canvas = new ManagerCanvasStub([object]);
  const keyboardTarget = new KeyboardTarget();
  const manager = new TransformManager(canvas, { keyboardTarget });

  assert.equal(object.selectable, false);
  assert.equal(object.evented, false);
  assert.equal(canvas.selection, false);

  manager.enable();

  assert.equal(manager.isEnabled(), true);
  assert.equal(canvas.isDrawingMode, false);
  assert.equal(canvas.selection, true);
  assert.equal(canvas.skipTargetFind, false);
  assert.equal(object.selectable, true);
  assert.equal(object.evented, true);
  assert.equal(object.cornerSize, 10);
  assert.equal(object.touchCornerSize, 28);
  assert.equal(object.borderColor, "#3d7edb");
  assert.equal(keyboardTarget.listeners.size, 1);

  manager.disable();

  assert.equal(manager.isEnabled(), false);
  assert.equal(canvas.isDrawingMode, true);
  assert.equal(object.selectable, false);
  assert.equal(object.evented, false);
  assert.equal(keyboardTarget.listeners.size, 0);
});

test("transform manager reports added, deleted, and reordered objects", async () => {
  const first = new fabric.Rect({ left: 0, top: 0, width: 20, height: 20 });
  const second = new fabric.Rect({ left: 30, top: 0, width: 20, height: 20 });
  const canvas = new ManagerCanvasStub([first, second]);
  const callbacks = [];
  const manager = new TransformManager(canvas, {
    keyboardTarget: new KeyboardTarget(),
    onObjectsAdded: (objects, metadata) =>
      callbacks.push(["added", objects, metadata.operation]),
    onObjectsDeleted: (objects, metadata) =>
      callbacks.push(["deleted", objects, metadata.items]),
    onStackOrderChanged: (objects, direction) =>
      callbacks.push(["ordered", objects, direction]),
  });
  manager.enable();
  canvas.setActiveObject(first);

  const duplicateResult = await manager.duplicate();
  manager.sendBackward();
  const deletedObjects = manager.delete();

  assert.equal(duplicateResult.objects.length, 1);
  assert.deepEqual(callbacks, [
    ["added", duplicateResult.objects, "duplicate"],
    ["ordered", duplicateResult.objects, "backward"],
    [
      "deleted",
      deletedObjects,
      deletedObjects.map((object) => ({
        object,
        stackIndex: 1,
      })),
    ],
  ]);
});

class ManagerCanvasStub {
  constructor(objects = []) {
    this.objects = [...objects];
    this.activeObject = null;
    this.isDrawingMode = true;
    this.listeners = new Map();
  }

  on(eventName, handler) {
    const handlers = this.listeners.get(eventName) ?? new Set();
    handlers.add(handler);
    this.listeners.set(eventName, handlers);
  }

  off(eventName, handler) {
    this.listeners.get(eventName)?.delete(handler);
  }

  fire(eventName, event) {
    this.listeners.get(eventName)?.forEach((handler) => handler(event));
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
    const hadSelection = Boolean(this.activeObject);
    this.activeObject = object;
    this.fire(hadSelection ? "selection:updated" : "selection:created", {
      selected: this.getActiveObjects(),
    });
  }

  discardActiveObject() {
    if (!this.activeObject) return;
    const deselected = this.getActiveObjects();
    this.activeObject = null;
    this.fire("selection:cleared", { deselected });
  }

  add(...objects) {
    objects.forEach((object) => {
      this.objects.push(object);
      this.fire("object:added", { target: object });
    });
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

  requestRenderAll() {}
}

class KeyboardTarget {
  constructor() {
    this.listeners = new Set();
  }

  addEventListener(eventName, listener) {
    if (eventName === "keydown") {
      this.listeners.add(listener);
    }
  }

  removeEventListener(eventName, listener) {
    if (eventName === "keydown") {
      this.listeners.delete(listener);
    }
  }
}
