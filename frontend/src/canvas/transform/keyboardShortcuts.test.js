import assert from "node:assert/strict";
import test from "node:test";

import { KeyboardShortcuts } from "./keyboardShortcuts.js";

test("keyboard shortcuts map commands, arrows, and shift movement", () => {
  const calls = [];
  const manager = createManager(calls);
  const target = new KeyboardTarget();
  const shortcuts = new KeyboardShortcuts(manager, target);
  shortcuts.bind();

  target.dispatch(createKeyEvent("Delete"));
  target.dispatch(createKeyEvent("Backspace"));
  target.dispatch(createKeyEvent("ArrowRight"));
  target.dispatch(createKeyEvent("ArrowDown", { shiftKey: true }));
  target.dispatch(createKeyEvent("a", { ctrlKey: true }));
  target.dispatch(createKeyEvent("c", { metaKey: true }));
  target.dispatch(createKeyEvent("v", { ctrlKey: true }));
  target.dispatch(createKeyEvent("d", { ctrlKey: true }));
  target.dispatch(createKeyEvent("Escape"));

  assert.deepEqual(calls, [
    ["delete"],
    ["delete"],
    ["move", 1, 0],
    ["move", 0, 10],
    ["selectAll"],
    ["copy"],
    ["paste"],
    ["duplicate"],
    ["clearSelection"],
  ]);

  shortcuts.unbind();
  target.dispatch(createKeyEvent("Delete"));
  assert.equal(calls.length, 9);
});

test("keyboard shortcuts ignore editable targets and disabled selection mode", () => {
  const calls = [];
  const manager = createManager(calls);
  const target = new KeyboardTarget();
  const shortcuts = new KeyboardShortcuts(manager, target);
  shortcuts.bind();

  target.dispatch(
    createKeyEvent("Delete", {
      target: { tagName: "INPUT" },
    }),
  );
  manager.enabled = false;
  target.dispatch(createKeyEvent("Delete"));

  assert.deepEqual(calls, []);
});

function createManager(calls) {
  return {
    enabled: true,
    isEnabled() {
      return this.enabled;
    },
    delete() {
      calls.push(["delete"]);
      return [{}];
    },
    move(x, y) {
      calls.push(["move", x, y]);
      return {};
    },
    selectAll() {
      calls.push(["selectAll"]);
    },
    copy() {
      calls.push(["copy"]);
    },
    paste() {
      calls.push(["paste"]);
    },
    duplicate() {
      calls.push(["duplicate"]);
    },
    clearSelection() {
      calls.push(["clearSelection"]);
    },
  };
}

function createKeyEvent(key, options = {}) {
  return {
    key,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    target: null,
    prevented: false,
    preventDefault() {
      this.prevented = true;
    },
    ...options,
  };
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

  dispatch(event) {
    this.listeners.forEach((listener) => listener(event));
  }
}
