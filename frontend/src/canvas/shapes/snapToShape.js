import * as ShapeFactory from "./ShapeFactory.js";
import { ShapeType } from "./constants/ShapeType.js";
import { detectArrow } from "./detectors/arrowDetector.js";
import { detectCircle } from "./detectors/circleDetector.js";
import { detectEllipse } from "./detectors/ellipseDetector.js";
import { detectLine } from "./detectors/lineDetector.js";
import { detectPolygon } from "./detectors/polygonDetector.js";
import { detectRectangle } from "./detectors/rectangleDetector.js";
import { detectSpeechBubble } from "./detectors/speechBubbleDetector.js";
import { detectStar } from "./detectors/starDetector.js";
import { fitArrow } from "./fitters/fitArrow.js";
import { fitCircle } from "./fitters/fitCircle.js";
import { fitEllipse } from "./fitters/fitEllipse.js";
import { fitLine } from "./fitters/fitLine.js";
import { fitPolygon } from "./fitters/fitPolygon.js";
import { fitRectangle } from "./fitters/fitRectangle.js";
import { fitSpeechBubble } from "./fitters/fitSpeechBubble.js";
import { fitStar } from "./fitters/fitStar.js";

const SHAPE_TYPES = Object.freeze(Object.values(ShapeType));

const DETECTORS = Object.freeze({
  [ShapeType.LINE]: detectLine,
  [ShapeType.RECTANGLE]: detectRectangle,
  [ShapeType.CIRCLE]: detectCircle,
  [ShapeType.ELLIPSE]: detectEllipse,
  [ShapeType.POLYGON]: detectPolygon,
  [ShapeType.ARROW]: detectArrow,
  [ShapeType.SPEECH_BUBBLE]: detectSpeechBubble,
  [ShapeType.STAR]: detectStar,
});

const FITTERS = Object.freeze({
  [ShapeType.LINE]: fitLine,
  [ShapeType.RECTANGLE]: fitRectangle,
  [ShapeType.CIRCLE]: fitCircle,
  [ShapeType.ELLIPSE]: fitEllipse,
  [ShapeType.POLYGON]: fitPolygon,
  [ShapeType.ARROW]: fitArrow,
  [ShapeType.SPEECH_BUBBLE]: fitSpeechBubble,
  [ShapeType.STAR]: fitStar,
});

const FACTORIES = Object.freeze({
  [ShapeType.LINE]: ShapeFactory.createLine,
  [ShapeType.RECTANGLE]: ShapeFactory.createRectangle,
  [ShapeType.CIRCLE]: ShapeFactory.createCircle,
  [ShapeType.ELLIPSE]: ShapeFactory.createEllipse,
  [ShapeType.POLYGON]: ShapeFactory.createPolygon,
  [ShapeType.ARROW]: ShapeFactory.createArrow,
  [ShapeType.SPEECH_BUBBLE]: ShapeFactory.createSpeechBubble,
  [ShapeType.STAR]: ShapeFactory.createStar,
});

/**
 * Analyze a completed stroke and return the highest-confidence snapped shape.
 *
 * Every registered detector runs in `ShapeType` declaration order. When multiple
 * detections have equal confidence, the first detector in that order wins.
 * The winning shape type routes through the matching fitter and ShapeFactory
 * registries.
 *
 * This function does not add the returned object to a canvas, render a canvas,
 * or modify layer state.
 *
 * @param {Array<{ x: number, y: number }>} points - Ordered stroke points.
 * @param {object} [options={}] - Fabric options forwarded to ShapeFactory.
 * @returns {object|null} Fabric object produced by ShapeFactory, or null when
 * input validation, detection, fitting, or object creation fails.
 */
export function snapToShape(points, options = {}) {
  if (!isValidStroke(points)) {
    return null;
  }

  const detections = SHAPE_TYPES.map((shapeType) =>
    runDetector(shapeType, points),
  ).filter(
    (detection) => detection !== null,
  );

  if (detections.length === 0) {
    return null;
  }

  const bestDetection = detections.reduce((best, candidate) =>
    candidate.confidence > best.confidence ? candidate : best,
  );
  const fitter = FITTERS[bestDetection.type];
  const factory = FACTORIES[bestDetection.type];

  if (typeof fitter !== "function" || typeof factory !== "function") {
    return null;
  }

  try {
    const geometry = fitter(points, bestDetection);

    if (geometry === null || geometry === undefined) {
      return null;
    }

    return factory(geometry, options) ?? null;
  } catch {
    return null;
  }
}

/**
 * Run one detector without allowing a failed detector to stop the pipeline.
 *
 * @param {string} shapeType - Registered shape type.
 * @param {Array<{ x: number, y: number }>} points - Valid stroke points.
 * @returns {{ type: string, confidence: number }|null} Valid detection result.
 */
function runDetector(shapeType, points) {
  const detector = DETECTORS[shapeType];

  if (typeof detector !== "function") {
    return null;
  }

  try {
    const detection = detector(points);

    if (
      detection === null ||
      detection === undefined ||
      detection.type !== shapeType ||
      !Number.isFinite(detection.confidence)
    ) {
      return null;
    }

    return detection;
  } catch {
    return null;
  }
}

/**
 * Validate the minimum point contract shared by every detector.
 *
 * @param {unknown} points - Candidate ordered stroke points.
 * @returns {boolean} Whether the input is safe to pass to detectors.
 */
function isValidStroke(points) {
  return (
    Array.isArray(points) &&
    points.length >= 2 &&
    points.every(
      (point) =>
        point !== null &&
        typeof point === "object" &&
        Number.isFinite(point.x) &&
        Number.isFinite(point.y),
    )
  );
}
