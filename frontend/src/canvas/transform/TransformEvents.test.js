import assert from "node:assert/strict";
import test from "node:test";

import { TransformEvents } from "./TransformEvents.js";
import { TransformState } from "./TransformState.js";

test("transform events keep state current and expose modification callbacks", () => {
  const object = { id: "selected-object" };
  const canvas = createEventCanvas();
  const state = new TransformState();
  const calls = [];
  const events = new TransformEvents(canvas, state, {
    onBeforeTransform: (target) => calls.push(["before", target]),
    onObjectMoved: (target) => calls.push(["moved", target]),
    onObjectScaled: (target) => calls.push(["scaled", target]),
    onObjectRotated: (target) => calls.push(["rotated", target]),
    onObjectModified: (target) => calls.push(["modified", target]),
  });

  events.bind();
  canvas.activeObject = object;
  canvas.activeObjects = [object];
  canvas.fire("selection:created", { selected: [object] });

  assert.equal(state.activeObject, object);
  assert.deepEqual(state.selectedObjects, [object]);

  canvas.fire("before:transform", {
    transform: { target: object, action: "drag" },
  });
  canvas.fire("object:moving", { target: object });
  canvas.fire("object:scaling", { target: object });
  canvas.fire("object:rotating", { target: object });
  assert.equal(state.isTransforming, true);

  canvas.fire("object:modified", { target: object });
  assert.equal(state.isTransforming, false);
  assert.deepEqual(calls, [
    ["before", object],
    ["moved", object],
    ["scaled", object],
    ["rotated", object],
    ["modified", object],
  ]);

  canvas.activeObject = null;
  canvas.activeObjects = [];
  canvas.fire("selection:cleared", { deselected: [object] });
  assert.deepEqual(state.selectedObjects, []);
  assert.equal(state.activeObject, null);

  events.unbind();
  canvas.fire("object:moving", { target: object });
  assert.equal(calls.length, 5);
});

function createEventCanvas() {
  const listeners = new Map();

  return {
    activeObject: null,
    activeObjects: [],
    on(eventName, handler) {
      const handlers = listeners.get(eventName) ?? new Set();
      handlers.add(handler);
      listeners.set(eventName, handlers);
    },
    off(eventName, handler) {
      listeners.get(eventName)?.delete(handler);
    },
    fire(eventName, event) {
      listeners.get(eventName)?.forEach((handler) => handler(event));
    },
    getActiveObject() {
      return this.activeObject;
    },
    getActiveObjects() {
      return [...this.activeObjects];
    },
  };
}
