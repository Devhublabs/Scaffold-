function isEditableTarget(target) {
  const tagName = target?.tagName?.toLowerCase();
  return (
    ["input", "textarea", "select"].includes(tagName) ||
    target?.isContentEditable === true ||
    Boolean(target?.closest?.("[contenteditable='true']"))
  );
}

function runAsync(action) {
  Promise.resolve(action()).catch(() => {});
}

export class KeyboardShortcuts {
  constructor(
    manager,
    target = typeof window === "undefined" ? null : window,
  ) {
    this.manager = manager;
    this.target = target;
    this.isBound = false;
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  bind() {
    if (this.isBound || !this.target?.addEventListener) return;

    this.target.addEventListener("keydown", this.handleKeyDown);
    this.isBound = true;
  }

  unbind() {
    if (!this.isBound || !this.target?.removeEventListener) return;

    this.target.removeEventListener("keydown", this.handleKeyDown);
    this.isBound = false;
  }

  handleKeyDown(event) {
    if (!this.manager.isEnabled() || isEditableTarget(event.target)) {
      return;
    }

    const key = event.key.toLowerCase();
    const hasCommandModifier = event.ctrlKey || event.metaKey;

    if (hasCommandModifier && this.handleCommandShortcut(key, event)) {
      return;
    }

    if (key === "delete" || key === "backspace") {
      if (this.manager.delete().length) {
        event.preventDefault();
      }
      return;
    }

    if (key === "escape") {
      this.manager.clearSelection();
      event.preventDefault();
      return;
    }

    const movement = this.getArrowMovement(key, event.shiftKey);
    if (movement && this.manager.move(movement.x, movement.y)) {
      event.preventDefault();
    }
  }

  handleCommandShortcut(key, event) {
    const shortcuts = {
      a: () => this.manager.selectAll(),
      c: () => runAsync(() => this.manager.copy()),
      d: () => runAsync(() => this.manager.duplicate()),
      v: () => runAsync(() => this.manager.paste()),
    };
    const action = shortcuts[key];
    if (!action) return false;

    action();
    event.preventDefault();
    return true;
  }

  getArrowMovement(key, isShiftPressed) {
    const distance = isShiftPressed ? 10 : 1;
    const movements = {
      arrowup: { x: 0, y: -distance },
      arrowdown: { x: 0, y: distance },
      arrowleft: { x: -distance, y: 0 },
      arrowright: { x: distance, y: 0 },
    };

    return movements[key] ?? null;
  }
}

export { isEditableTarget };
