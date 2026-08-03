export class TransformState {
  constructor() {
    this.selectedObjects = [];
    this.activeObject = null;
    this.isSelecting = false;
    this.isTransforming = false;
    this.listeners = new Set();
  }

  getSnapshot() {
    return {
      selectedObjects: [...this.selectedObjects],
      activeObject: this.activeObject,
      isSelecting: this.isSelecting,
      isTransforming: this.isTransforming,
    };
  }

  subscribe(listener) {
    if (typeof listener !== "function") {
      return () => {};
    }

    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setSelection(selectedObjects = [], activeObject = null) {
    this.selectedObjects = selectedObjects.filter(Boolean);
    this.activeObject =
      activeObject ??
      (this.selectedObjects.length === 1 ? this.selectedObjects[0] : null);
    this.notify();
  }

  clearSelection() {
    this.selectedObjects = [];
    this.activeObject = null;
    this.isTransforming = false;
    this.notify();
  }

  setSelecting(isSelecting) {
    this.isSelecting = Boolean(isSelecting);
    this.notify();
  }

  setTransforming(isTransforming) {
    this.isTransforming = Boolean(isTransforming);
    this.notify();
  }

  notify() {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
