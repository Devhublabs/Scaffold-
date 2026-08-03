import assert from "node:assert/strict";
import test from "node:test";

import { TransformState } from "./TransformState.js";

test("transform state publishes selection and transform changes", () => {
  const state = new TransformState();
  const object = { id: "object-1" };
  const snapshots = [];
  const unsubscribe = state.subscribe((snapshot) => snapshots.push(snapshot));

  state.setSelecting(true);
  state.setSelection([object], object);
  state.setTransforming(true);

  assert.deepEqual(state.getSnapshot(), {
    selectedObjects: [object],
    activeObject: object,
    isSelecting: true,
    isTransforming: true,
  });
  assert.equal(snapshots.length, 3);

  unsubscribe();
  state.clearSelection();

  assert.equal(snapshots.length, 3);
  assert.deepEqual(state.getSnapshot(), {
    selectedObjects: [],
    activeObject: null,
    isSelecting: true,
    isTransforming: false,
  });
});
