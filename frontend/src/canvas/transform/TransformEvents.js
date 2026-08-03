const EVENT_NAMES = [
  "before:transform",
  "selection:created",
  "selection:updated",
  "selection:cleared",
  "object:moving",
  "object:scaling",
  "object:rotating",
  "object:modified",
];

export class TransformEvents {
  constructor(canvas, state, callbacks = {}) {
    this.canvas = canvas;
    this.state = state;
    this.callbacks = callbacks;
    this.isBound = false;

    this.handlers = {
      "before:transform": (event) => {
        this.state.setTransforming(true);
        this.callbacks.onBeforeTransform?.(
          event.transform?.target ?? event.target ?? null,
          event,
        );
      },
      "selection:created": (event) => {
        this.syncSelection();
        this.callbacks.onSelectionCreated?.(event);
      },
      "selection:updated": (event) => {
        this.syncSelection();
        this.callbacks.onSelectionUpdated?.(event);
      },
      "selection:cleared": (event) => {
        this.state.clearSelection();
        this.callbacks.onSelectionCleared?.(event);
      },
      "object:moving": (event) => {
        this.handleTransform(event, "onObjectMoved");
      },
      "object:scaling": (event) => {
        this.handleTransform(event, "onObjectScaled");
      },
      "object:rotating": (event) => {
        this.handleTransform(event, "onObjectRotated");
      },
      "object:modified": (event) => {
        this.state.setTransforming(false);
        this.syncSelection();
        this.callbacks.onObjectModified?.(event.target ?? null, event);
      },
    };
  }

  bind() {
    if (this.isBound) return;

    EVENT_NAMES.forEach((eventName) => {
      this.canvas.on(eventName, this.handlers[eventName]);
    });
    this.isBound = true;
  }

  unbind() {
    if (!this.isBound) return;

    EVENT_NAMES.forEach((eventName) => {
      this.canvas.off(eventName, this.handlers[eventName]);
    });
    this.isBound = false;
    this.state.setTransforming(false);
  }

  syncSelection() {
    const selectedObjects = this.canvas.getActiveObjects?.() ?? [];
    const activeObject = this.canvas.getActiveObject?.() ?? null;
    this.state.setSelection(selectedObjects, activeObject);
    this.callbacks.onSelectionChanged?.(
      this.state.getSnapshot(),
    );
  }

  handleTransform(event, callbackName) {
    this.state.setTransforming(true);
    this.callbacks[callbackName]?.(event.target ?? null, event);
  }
}
