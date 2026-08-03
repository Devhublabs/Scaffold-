import { snapCreatedPath } from "./shapes/snapCreatedPath.js";

/**
 * Create the canvas handler that commits a completed drawing path.
 *
 * @param {{
 *   canvas: object,
 *   shouldSnap: () => boolean,
 *   getLayerId: () => string|null,
 *   rememberObject: (object: object, layerId: string|null) => void,
 *   emitCanvasObject: (object: object) => void
 * }} dependencies - Canvas commit dependencies.
 * @returns {(event: { path?: object }) => object|null} Fabric event handler.
 */
export function createPathCreatedHandler({
  canvas,
  shouldSnap,
  getLayerId,
  rememberObject,
  emitCanvasObject,
}) {
  return ({ path } = {}) => {
    if (!path) {
      return null;
    }

    const finalObject = shouldSnap() ? snapCreatedPath(path) : path;

    replaceCreatedPath(canvas, path, finalObject);
    rememberObject(finalObject, getLayerId());
    emitCanvasObject(finalObject);

    return finalObject;
  };
}

function replaceCreatedPath(canvas, path, finalObject) {
  if (finalObject === path) {
    return;
  }

  const pathIndex = canvas.getObjects().indexOf(path);

  canvas.remove(path);

  if (pathIndex >= 0) {
    canvas.insertAt(pathIndex, finalObject);
  } else {
    canvas.add(finalObject);
  }

  finalObject.setCoords();
  canvas.requestRenderAll();
}
