import assert from "node:assert/strict";
import test from "node:test";
import * as fabric from "fabric";

import {
  reviveCanvasObject,
  serializeCanvasObject,
} from "./canvasObjects.js";

test("serialized Fabric objects revive with their final geometry and style", async () => {
  const object = new fabric.Group([
    new fabric.Line([0, 0, 80, 0], {
      stroke: "#2468ac",
      strokeWidth: 7,
    }),
    new fabric.Triangle({
      left: 80,
      top: 0,
      width: 24,
      height: 30,
      fill: "#2468ac",
      stroke: "#2468ac",
      strokeWidth: 7,
    }),
  ]);
  object.scaffoldStrokeData = {
    points: [
      [0, 0],
      [80, 0],
    ],
    pressures: [0.5, 0.5],
    color: "#2468ac",
    width: 7,
  };

  const serialized = serializeCanvasObject(object);
  const revived = await reviveCanvasObject(serialized);

  assert.ok(serialized);
  assert.ok(revived);
  assert.equal(revived.type, "group");
  assert.deepEqual(
    revived.getObjects().map((part) => part.type),
    ["line", "triangle"],
  );
  assert.equal(revived.getObjects()[0].stroke, "#2468ac");
  assert.equal(revived.getObjects()[0].strokeWidth, 7);
  assert.deepEqual(
    revived.scaffoldStrokeData,
    object.scaffoldStrokeData,
  );
});

test("invalid collaboration objects fail without throwing", async () => {
  assert.equal(serializeCanvasObject(null), null);
  assert.equal(await reviveCanvasObject(null), null);
  assert.equal(await reviveCanvasObject({ type: "UnknownShape" }), null);
});
