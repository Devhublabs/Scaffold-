import {
  DEFAULT_MAX_PRESSURE_FACTOR,
  DEFAULT_MIN_PRESSURE_FACTOR,
  DEFAULT_PRESSURE,
} from "../brushes/pressureStroke.js";
import * as ShapeFactory from "./ShapeFactory.js";
import { smoothFreeformStroke } from "./freeform/smoothFreeformStroke.js";
import { snapToShape } from "./snapToShape.js";

/**
 * Clean a completed pressure path while preserving its drawing style.
 *
 * Known geometry uses the detector/fitter pipeline. Other strokes receive
 * deterministic freeform smoothing.
 *
 * @param {object} path - Fabric object created by a drawing brush.
 * @returns {object} A cleaned Fabric object, or the original invalid path.
 */
export function snapCreatedPath(path) {
  const stroke = path?.scaffoldStrokeData;
  const points = getStrokePoints(stroke?.points);

  if (points.length < 2) {
    return path;
  }

  const snapped = snapToShape(points, getSnapOptions(path, stroke));

  if (snapped) {
    snapped.scaffoldStrokeData = copyStrokeData(stroke);
    return snapped;
  }

  return smoothCreatedPath(path, stroke, points);
}

/**
 * Convert stored brush points into the detector point contract.
 *
 * @param {unknown} rawPoints - Pressure-brush point tuples.
 * @returns {Array<{ x: number, y: number }>} Finite point copies.
 */
export function getStrokePoints(rawPoints) {
  if (!Array.isArray(rawPoints)) {
    return [];
  }

  return rawPoints
    .map((point) =>
      Array.isArray(point)
        ? { x: point[0], y: point[1] }
        : { x: point?.x, y: point?.y },
    )
    .filter(
      (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
    );
}

function getSnapOptions(path, stroke) {
  const options = {
    stroke: stroke?.color ?? path?.stroke ?? path?.fill,
    strokeWidth: stroke?.width ?? path?.strokeWidth,
    strokeLineCap: stroke ? "round" : path?.strokeLineCap,
    strokeLineJoin: stroke ? "round" : path?.strokeLineJoin,
    opacity: path?.opacity,
    shadow: path?.shadow,
    visible: path?.visible,
    selectable: path?.selectable,
    evented: path?.evented,
    objectCaching: path?.objectCaching,
  };

  return Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined),
  );
}

function smoothCreatedPath(path, stroke, points) {
  const pressures = getStrokePressures(
    stroke?.pressures,
    points.length,
  );
  const geometry = smoothFreeformStroke(points, pressures);

  if (geometry === null) {
    return path;
  }

  const width = getPositiveNumber(
    stroke?.width,
    getPositiveNumber(path?.strokeWidth, 3),
  );
  const minFactor = getFiniteNumber(
    stroke?.minFactor,
    DEFAULT_MIN_PRESSURE_FACTOR,
  );
  const maxFactor = getFiniteNumber(
    stroke?.maxFactor,
    DEFAULT_MAX_PRESSURE_FACTOR,
  );
  const color = stroke?.color ?? path?.fill ?? path?.stroke ?? "#000000";
  const smoothed = ShapeFactory.createFreeformPath(
    {
      ...geometry,
      color,
      width,
      minFactor,
      maxFactor,
    },
    getSnapOptions(path, stroke),
  );

  if (smoothed === null) {
    return path;
  }

  smoothed.scaffoldStrokeData = {
    ...copyStrokeData(stroke),
    points: geometry.points.map((point) => [point.x, point.y]),
    pressures: [...geometry.pressures],
    color,
    width,
    minFactor,
    maxFactor,
  };
  return smoothed;
}

function getStrokePressures(rawPressures, pointCount) {
  return Array.from({ length: pointCount }, (_, index) => {
    const pressure = rawPressures?.[index];
    return Number.isFinite(pressure)
      ? Math.min(1, Math.max(0, pressure))
      : DEFAULT_PRESSURE;
  });
}

function copyStrokeData(stroke) {
  return {
    ...stroke,
    points: Array.isArray(stroke?.points)
      ? stroke.points.map((point) =>
          Array.isArray(point) ? [...point] : { ...point },
        )
      : [],
    pressures: Array.isArray(stroke?.pressures)
      ? [...stroke.pressures]
      : [],
  };
}

function getPositiveNumber(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getFiniteNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}
