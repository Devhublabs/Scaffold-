import { TransformEvents } from "./TransformEvents.js";
import { TransformState } from "./TransformState.js";
import {
  bringForward,
  clearSelection,
  copy,
  deleteSelection,
  duplicate,
  move,
  paste,
  rotate,
  scale,
  selectAll,
  sendBackward,
} from "./transformUtils.js";
import { KeyboardShortcuts } from "./keyboardShortcuts.js";

const DEFAULT_CONTROL_OPTIONS = {
  selectable: true,
  evented: true,
  hasControls: true,
  hasBorders: true,
  cornerSize: 10,
  touchCornerSize: 28,
  transparentCorners: false,
  cornerColor: "#ffffff",
  cornerStrokeColor: "#3d7edb",
  borderColor: "#3d7edb",
  cornerStyle: "circle",
};

const CONTROL_VISIBILITY = {
  tl: true,
  tr: true,
  br: true,
  bl: true,
  ml: true,
  mt: true,
  mr: true,
  mb: true,
  mtr: true,
};

export class TransformManager {
  constructor(
    canvas,
    {
      state = new TransformState(),
      keyboardTarget,
      controlOptions = {},
      ...callbacks
    } = {},
  ) {
    if (!canvas) {
      throw new Error("TransformManager requires a Fabric canvas.");
    }

    this.canvas = canvas;
    this.state = state;
    this.callbacks = callbacks;
    this.controlOptions = {
      ...DEFAULT_CONTROL_OPTIONS,
      ...controlOptions,
    };
    this.enabled = false;
    this.previousDrawingMode = canvas.isDrawingMode;
    this.clipboard = null;

    this.events = new TransformEvents(canvas, state, callbacks);
    this.shortcuts = new KeyboardShortcuts(this, keyboardTarget);
    this.handleObjectAdded = this.handleObjectAdded.bind(this);

    this.events.bind();
    this.canvas.on("object:added", this.handleObjectAdded);
    this.configureCanvas(false);
    this.configureObjects(false);
  }

  isEnabled() {
    return this.enabled;
  }

  enable() {
    if (this.enabled) return;

    this.previousDrawingMode = this.canvas.isDrawingMode;
    this.enabled = true;
    this.canvas.isDrawingMode = false;
    this.configureCanvas(true);
    this.configureObjects(true);
    this.state.setSelecting(true);
    this.shortcuts.bind();
    this.canvas.requestRenderAll?.();
  }

  disable() {
    const shouldRestoreDrawingMode = this.enabled;
    this.enabled = false;
    this.shortcuts.unbind();
    clearSelection(this.canvas);
    this.configureCanvas(false);
    this.configureObjects(false);
    this.state.setSelecting(false);
    this.state.setTransforming(false);

    if (shouldRestoreDrawingMode) {
      this.canvas.isDrawingMode = this.previousDrawingMode;
    }
  }

  subscribe(listener) {
    return this.state.subscribe(listener);
  }

  getSnapshot() {
    return this.state.getSnapshot();
  }

  move(deltaX, deltaY) {
    return move(this.canvas, deltaX, deltaY);
  }

  scale(scaleX, scaleY = scaleX) {
    return scale(this.canvas, scaleX, scaleY);
  }

  rotate(angle) {
    return rotate(this.canvas, angle);
  }

  async copy() {
    this.clipboard = await copy(this.canvas);
    return this.clipboard;
  }

  async paste() {
    const result = await paste(this.canvas, this.clipboard);
    this.notifyObjectsAdded(result, "paste");
    return result;
  }

  async duplicate() {
    const result = await duplicate(this.canvas);
    this.notifyObjectsAdded(result, "duplicate");
    return result;
  }

  delete() {
    const selectedObjects = this.canvas.getActiveObjects?.() ?? [];
    const canvasObjects = this.canvas.getObjects?.() ?? [];
    const items = selectedObjects.map((object) => ({
      object,
      stackIndex: canvasObjects.indexOf(object),
    }));
    const deletedObjects = deleteSelection(this.canvas, selectedObjects);

    if (deletedObjects.length) {
      this.callbacks.onObjectsDeleted?.(deletedObjects, { items });
    }
    return deletedObjects;
  }

  bringForward() {
    const objects = bringForward(this.canvas);
    if (objects.length) {
      this.callbacks.onStackOrderChanged?.(objects, "forward");
    }
    return objects;
  }

  sendBackward() {
    const objects = sendBackward(this.canvas);
    if (objects.length) {
      this.callbacks.onStackOrderChanged?.(objects, "backward");
    }
    return objects;
  }

  selectAll() {
    return selectAll(this.canvas);
  }

  clearSelection() {
    clearSelection(this.canvas);
  }

  dispose() {
    this.disable();
    this.events.unbind();
    this.canvas.off("object:added", this.handleObjectAdded);
    this.clipboard = null;
  }

  handleObjectAdded({ target } = {}) {
    if (!target) return;
    this.configureObject(target, this.enabled);
  }

  configureCanvas(enabled) {
    this.canvas.selection = enabled;
    this.canvas.skipTargetFind = !enabled;
    this.canvas.preserveObjectStacking = true;
    this.canvas.selectionColor = "rgba(61, 126, 219, 0.12)";
    this.canvas.selectionBorderColor = "#3d7edb";
    this.canvas.selectionLineWidth = 1;
  }

  configureObjects(enabled) {
    this.canvas.getObjects?.().forEach((object) => {
      this.configureObject(object, enabled);
    });
  }

  configureObject(object, enabled) {
    if (!enabled) {
      object.set({
        selectable: false,
        evented: false,
      });
      return;
    }

    object.set(this.controlOptions);
    object.setControlsVisibility?.(CONTROL_VISIBILITY);
    object.setCoords?.();
  }

  notifyObjectsAdded(result, operation) {
    if (!result.objects.length) return;

    this.callbacks.onObjectsAdded?.(result.objects, {
      operation,
      activeObject: result.activeObject,
    });
  }
}
