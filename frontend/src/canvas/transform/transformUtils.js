import * as fabric from "fabric";

const CLONE_PROPERTIES = ["scaffoldStrokeData"];
const DEFAULT_PASTE_OFFSET = 12;

function requestRender(canvas) {
  canvas.requestRenderAll?.();
}

function getActiveTarget(canvas, target) {
  return target ?? canvas.getActiveObject?.() ?? null;
}

function beginTransform(canvas, target, action) {
  canvas.fire?.("before:transform", {
    target,
    transform: {
      target,
      action,
      actionPerformed: false,
    },
  });
}

function finishTransform(canvas, target, eventName, action) {
  const transform = {
    target,
    action,
    actionPerformed: true,
  };
  target.setCoords?.();
  canvas.fire?.(eventName, {
    target,
    transform,
  });
  canvas.fire?.("object:modified", {
    target,
    transform,
  });
  requestRender(canvas);
}

export function getSelectedObjects(canvas) {
  return canvas.getActiveObjects?.().filter(Boolean) ?? [];
}

export function move(canvas, deltaX, deltaY, target = null) {
  const activeTarget = getActiveTarget(canvas, target);
  if (!activeTarget) return null;

  beginTransform(canvas, activeTarget, "drag");
  activeTarget.set({
    left: (activeTarget.left ?? 0) + deltaX,
    top: (activeTarget.top ?? 0) + deltaY,
  });
  finishTransform(canvas, activeTarget, "object:moving", "drag");
  return activeTarget;
}

export function scale(
  canvas,
  scaleX,
  scaleY = scaleX,
  target = null,
) {
  const activeTarget = getActiveTarget(canvas, target);
  if (!activeTarget) return null;

  beginTransform(canvas, activeTarget, "scale");
  activeTarget.set({ scaleX, scaleY });
  finishTransform(canvas, activeTarget, "object:scaling", "scale");
  return activeTarget;
}

export function rotate(canvas, angle, target = null) {
  const activeTarget = getActiveTarget(canvas, target);
  if (!activeTarget) return null;

  beginTransform(canvas, activeTarget, "rotate");
  activeTarget.rotate(angle);
  finishTransform(canvas, activeTarget, "object:rotating", "rotate");
  return activeTarget;
}

export async function copy(canvas) {
  const activeObject = canvas.getActiveObject?.();
  if (!activeObject?.clone) return null;

  return activeObject.clone(CLONE_PROPERTIES);
}

export async function paste(
  canvas,
  clipboard,
  {
    offsetX = DEFAULT_PASTE_OFFSET,
    offsetY = DEFAULT_PASTE_OFFSET,
  } = {},
) {
  if (!clipboard?.clone) {
    return { activeObject: null, objects: [] };
  }

  const clonedObject = await clipboard.clone(CLONE_PROPERTIES);
  canvas.discardActiveObject?.();
  clonedObject.set({
    left: (clonedObject.left ?? 0) + offsetX,
    top: (clonedObject.top ?? 0) + offsetY,
    evented: true,
    selectable: true,
  });

  const addedObjects = [];
  if (clonedObject instanceof fabric.ActiveSelection) {
    clonedObject.canvas = canvas;
    clonedObject.forEachObject((object) => {
      canvas.add(object);
      addedObjects.push(object);
    });
    clonedObject.setCoords();
  } else {
    canvas.add(clonedObject);
    addedObjects.push(clonedObject);
  }

  canvas.setActiveObject?.(clonedObject);
  clipboard.set({
    left: (clipboard.left ?? 0) + offsetX,
    top: (clipboard.top ?? 0) + offsetY,
  });
  requestRender(canvas);

  return {
    activeObject: clonedObject,
    objects: addedObjects,
  };
}

export async function duplicate(canvas, options) {
  const clipboard = await copy(canvas);
  if (!clipboard) {
    return { activeObject: null, objects: [] };
  }

  return paste(canvas, clipboard, options);
}

export function deleteSelection(canvas, objects = getSelectedObjects(canvas)) {
  const objectsToDelete = objects.filter(Boolean);
  if (!objectsToDelete.length) return [];

  canvas.discardActiveObject?.();
  canvas.remove(...objectsToDelete);
  requestRender(canvas);
  return objectsToDelete;
}

export function selectAll(canvas) {
  const objects = (canvas.getObjects?.() ?? []).filter(
    (object) => object.visible !== false && object.selectable !== false,
  );

  if (!objects.length) {
    clearSelection(canvas);
    return null;
  }

  const activeObject =
    objects.length === 1
      ? objects[0]
      : new fabric.ActiveSelection(objects, { canvas });
  canvas.setActiveObject?.(activeObject);
  requestRender(canvas);
  return activeObject;
}

export function clearSelection(canvas) {
  canvas.discardActiveObject?.();
  requestRender(canvas);
}

export function bringForward(
  canvas,
  objects = getSelectedObjects(canvas),
) {
  const stack = canvas.getObjects?.() ?? [];
  const orderedObjects = objects
    .filter((object) => stack.includes(object))
    .sort((left, right) => stack.indexOf(right) - stack.indexOf(left));

  orderedObjects.forEach((object) => canvas.bringObjectForward(object));
  requestRender(canvas);
  return orderedObjects;
}

export function sendBackward(
  canvas,
  objects = getSelectedObjects(canvas),
) {
  const stack = canvas.getObjects?.() ?? [];
  const orderedObjects = objects
    .filter((object) => stack.includes(object))
    .sort((left, right) => stack.indexOf(left) - stack.indexOf(right));

  orderedObjects.forEach((object) => canvas.sendObjectBackwards(object));
  requestRender(canvas);
  return orderedObjects;
}
