import * as ShapeFactory from "./ShapeFactory.js";
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

/**
 * Analyze a completed stroke and replace it with a fitted geometric shape.
 *
 * @param {Array<{ x: number, y: number }>} points - Ordered stroke points.
 * @param {object} canvas - Canvas instance that will eventually receive the shape.
 * @param {string|null} activeLayerId - Identifier of the active drawing layer.
 * @returns {null}
 */
export function snapToShape(points, canvas, activeLayerId) {
  void points;
  void canvas;
  void activeLayerId;
  void detectLine;
  void detectRectangle;
  void detectCircle;
  void detectEllipse;
  void detectPolygon;
  void detectArrow;
  void detectSpeechBubble;
  void detectStar;
  void fitLine;
  void fitRectangle;
  void fitCircle;
  void fitEllipse;
  void fitPolygon;
  void fitArrow;
  void fitSpeechBubble;
  void fitStar;
  void ShapeFactory;

  // TODO: Validate and normalize the incoming stroke points.
  // TODO: Run detectors and select the highest-confidence shape candidate.
  // TODO: Pass the selected candidate to its corresponding geometry fitter.
  // TODO: Create the fitted shape through ShapeFactory and assign its layer.
  // TODO: Replace the freehand stroke on the canvas and synchronize the change.
  return null;
}
