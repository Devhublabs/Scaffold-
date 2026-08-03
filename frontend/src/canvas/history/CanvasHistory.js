import * as fabric from "fabric";

const OperationType = Object.freeze({
  ADD: "add",
  DELETE: "delete",
  MODIFY: "modify",
});

export class CanvasHistory {
  constructor(
    canvas,
    {
      clearSelection = () => canvas.discardActiveObject?.(),
      onObjectRestored = () => {},
      onObjectRemoved = () => {},
      onStackOrderChanged = () => {},
    } = {},
  ) {
    if (!canvas) {
      throw new Error("CanvasHistory requires a Fabric canvas.");
    }

    this.canvas = canvas;
    this.clearSelection = clearSelection;
    this.onObjectRestored = onObjectRestored;
    this.onObjectRemoved = onObjectRemoved;
    this.onStackOrderChanged = onStackOrderChanged;
    this.undoStack = [];
    this.redoStack = [];
    this.pendingTransform = null;
  }

  recordAdd(items) {
    return this.recordObjectOperation(OperationType.ADD, items);
  }

  recordDelete(items) {
    return this.recordObjectOperation(OperationType.DELETE, items);
  }

  beginTransform(target) {
    const snapshots = getHistoryObjects(target)
      .map(captureTransform)
      .filter(Boolean);

    this.pendingTransform = snapshots.length ? snapshots : null;
  }

  commitTransform() {
    const beforeSnapshots = this.pendingTransform;
    this.pendingTransform = null;

    if (!beforeSnapshots?.length) {
      return false;
    }

    const items = beforeSnapshots
      .map(({ object, matrix: before }) => {
        const afterSnapshot = captureTransform(object);
        if (!afterSnapshot || matricesMatch(before, afterSnapshot.matrix)) {
          return null;
        }

        return {
          object,
          before,
          after: afterSnapshot.matrix,
        };
      })
      .filter(Boolean);

    return items.length
      ? this.record({ type: OperationType.MODIFY, items })
      : false;
  }

  undo() {
    const entry = this.undoStack.pop();
    if (!entry) return false;

    this.apply(entry, "undo");
    this.redoStack.push(entry);
    return true;
  }

  redo() {
    const entry = this.redoStack.pop();
    if (!entry) return false;

    this.apply(entry, "redo");
    this.undoStack.push(entry);
    return true;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.pendingTransform = null;
  }

  recordObjectOperation(type, items) {
    const normalizedItems = normalizeCanvasItems(items);
    return normalizedItems.length
      ? this.record({ type, items: normalizedItems })
      : false;
  }

  record(entry) {
    this.undoStack.push(entry);
    this.redoStack = [];
    return true;
  }

  apply(entry, direction) {
    this.pendingTransform = null;
    this.clearSelection();

    if (entry.type === OperationType.ADD) {
      if (direction === "undo") {
        this.removeObjects(entry.items);
      } else {
        this.restoreObjects(entry.items);
      }
      return;
    }

    if (entry.type === OperationType.DELETE) {
      if (direction === "undo") {
        this.restoreObjects(entry.items);
      } else {
        this.removeObjects(entry.items);
      }
      return;
    }

    if (entry.type === OperationType.MODIFY) {
      this.restoreTransforms(entry.items, direction);
    }
  }

  restoreObjects(items) {
    [...items]
      .sort((left, right) => left.stackIndex - right.stackIndex)
      .forEach((item) => {
        if (this.canvas.getObjects?.().includes(item.object)) {
          return;
        }

        const stackSize = this.canvas.getObjects?.().length ?? 0;
        const stackIndex = Math.min(item.stackIndex, stackSize);

        if (typeof this.canvas.insertAt === "function") {
          this.canvas.insertAt(stackIndex, item.object);
        } else {
          this.canvas.add?.(item.object);
          this.canvas.moveObjectTo?.(item.object, stackIndex);
        }

        this.onObjectRestored(item);
      });

    this.onStackOrderChanged();
    this.canvas.requestRenderAll?.();
  }

  removeObjects(items) {
    const canvasObjects = this.canvas.getObjects?.() ?? [];
    const objects = items
      .map(({ object }) => object)
      .filter((object) => canvasObjects.includes(object));

    if (objects.length) {
      this.canvas.remove?.(...objects);
      items
        .filter(({ object }) => objects.includes(object))
        .forEach(this.onObjectRemoved);
    }

    this.onStackOrderChanged();
    this.canvas.requestRenderAll?.();
  }

  restoreTransforms(items, direction) {
    const snapshotKey = direction === "undo" ? "before" : "after";

    items.forEach((item) => {
      const matrix = item[snapshotKey];
      if (!item.object || !isTransformMatrix(matrix)) {
        return;
      }

      fabric.util.applyTransformToObject(item.object, matrix);
      item.object.setCoords?.();
      item.object.dirty = true;
    });

    this.canvas.requestRenderAll?.();
  }
}

function normalizeCanvasItems(items) {
  if (!Array.isArray(items)) return [];

  const seen = new Set();
  return items
    .filter(({ object } = {}) => {
      if (!object || seen.has(object)) return false;
      seen.add(object);
      return true;
    })
    .map(({ object, layerId = null, stackIndex = 0 }) => ({
      object,
      layerId,
      stackIndex:
        Number.isInteger(stackIndex) && stackIndex >= 0 ? stackIndex : 0,
    }));
}

function getHistoryObjects(target) {
  const candidates = Array.isArray(target)
    ? target
    : target instanceof fabric.ActiveSelection
      ? target.getObjects()
      : [target];
  const seen = new Set();

  return candidates.filter((object) => {
    if (!object || seen.has(object)) return false;
    seen.add(object);
    return true;
  });
}

function captureTransform(object) {
  const matrix = object?.calcTransformMatrix?.();
  return isTransformMatrix(matrix)
    ? { object, matrix: [...matrix] }
    : null;
}

function isTransformMatrix(matrix) {
  return (
    Array.isArray(matrix) &&
    matrix.length === 6 &&
    matrix.every(Number.isFinite)
  );
}

function matricesMatch(first, second, epsilon = 1e-8) {
  return first.every(
    (value, index) => Math.abs(value - second[index]) <= epsilon,
  );
}
