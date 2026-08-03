import assert from "node:assert/strict";
import test from "node:test";
import * as fabric from "fabric";

import { snapCreatedPath } from "./snapCreatedPath.js";

test("snapCreatedPath preserves pressure-stroke color and width", () => {
  const path = new fabric.Path(
    [
      ["M", 0, 0],
      ["L", 100, 0],
    ],
    {
      fill: "#d43f3f",
      stroke: null,
      strokeWidth: 0,
      opacity: 0.8,
    },
  );
  path.scaffoldStrokeData = {
    points: [
      [0, 0],
      [25, 1],
      [50, -1],
      [75, 0],
      [100, 0],
    ],
    pressures: [0.4, 0.5, 0.6, 0.5, 0.4],
    color: "#d43f3f",
    width: 7,
  };

  const snapped = snapCreatedPath(path);

  assert.notEqual(snapped, path);
  assert.equal(snapped.type, "line");
  assert.equal(snapped.stroke, "#d43f3f");
  assert.equal(snapped.strokeWidth, 7);
  assert.equal(snapped.strokeLineCap, "round");
  assert.equal(snapped.strokeLineJoin, "round");
  assert.equal(snapped.opacity, 0.8);
  assert.deepEqual(snapped.scaffoldStrokeData, path.scaffoldStrokeData);
  assert.notEqual(
    snapped.scaffoldStrokeData.points,
    path.scaffoldStrokeData.points,
  );
});

test("snapCreatedPath smooths an unmatched pressure stroke", () => {
  const path = new fabric.Path([["M", 0, 0], ["L", 10, 5]]);
  path.scaffoldStrokeData = {
    points: [
      [20, 20],
      [31, 31],
      [42, 27],
      [53, 43],
      [66, 57],
      [80, 65],
      [95, 58],
      [110, 43],
      [122, 30],
    ],
    pressures: [0.25, 0.35, 0.45, 0.55, 0.7, 0.8, 0.65, 0.45, 0.3],
    color: "#243b78",
    width: 7,
    minFactor: 0.6,
    maxFactor: 1.8,
  };

  const smoothed = snapCreatedPath(path);

  assert.notEqual(smoothed, path);
  assert.equal(smoothed.type, "path");
  assert.equal(smoothed.fill, "#243b78");
  assert.equal(smoothed.stroke, null);
  assert.equal(smoothed.strokeWidth, 0);
  assert.equal(smoothed.scaffoldStrokeData.color, "#243b78");
  assert.equal(smoothed.scaffoldStrokeData.width, 7);
  assert.equal(smoothed.scaffoldStrokeData.minFactor, 0.6);
  assert.equal(smoothed.scaffoldStrokeData.maxFactor, 1.8);
  assert.equal(
    smoothed.scaffoldStrokeData.points.length,
    smoothed.scaffoldStrokeData.pressures.length,
  );
  assert.deepEqual(smoothed.scaffoldStrokeData.points[0], [20, 20]);
  assert.deepEqual(smoothed.scaffoldStrokeData.points.at(-1), [122, 30]);
  assert.notDeepEqual(
    smoothed.scaffoldStrokeData.points,
    path.scaffoldStrokeData.points,
  );
});
