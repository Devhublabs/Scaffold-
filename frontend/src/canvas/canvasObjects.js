import * as fabric from "fabric";

const SERIALIZED_PROPERTIES = ["scaffoldStrokeData"];

/**
 * Serialize the committed Fabric object for collaboration and persistence.
 *
 * @param {object} object - Fabric canvas object.
 * @returns {object|null} JSON-safe Fabric data.
 */
export function serializeCanvasObject(object) {
  if (typeof object?.toObject !== "function") {
    return null;
  }

  try {
    return object.toObject(SERIALIZED_PROPERTIES);
  } catch {
    return null;
  }
}

/**
 * Recreate a Fabric object received from collaboration.
 *
 * @param {unknown} serializedObject - Fabric object data.
 * @returns {Promise<object|null>} Revived Fabric object.
 */
export async function reviveCanvasObject(serializedObject) {
  if (
    serializedObject === null ||
    typeof serializedObject !== "object" ||
    Array.isArray(serializedObject)
  ) {
    return null;
  }

  try {
    const [object] = await fabric.util.enlivenObjects([serializedObject]);
    return object ?? null;
  } catch {
    return null;
  }
}
