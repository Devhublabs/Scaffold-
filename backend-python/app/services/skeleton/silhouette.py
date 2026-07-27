"""
silhouette.py — Contour (traceable body edge) shapes for Co-Artist Mode 1.

Ported from PressureBrush._buildOutlinePath in the frontend:
  frontend/src/canvas/brushes/PressureBrush.js

For each limb segment (and the torso), we:
  1. Walk the centerline points (typically just two: proximal joint, distal joint).
  2. At each point, offset ±half-width along the local normal.
  3. Walk the left edge forward, then the right edge backward → closed outline path.

Width profile: linear taper from proximal_width (fat end) to distal_width (thin end).

Phase 2 note
------------
v1 does NOT merge overlapping contours.  Internal arm-into-chest lines are
acceptable for a trace guide.  Boolean-union is explicitly deferred.
"""

from __future__ import annotations
import math


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def build_silhouette_shapes(
    joint_positions: dict[str, tuple[float, float]],
    segment_widths: dict[str, tuple[float, float]],
) -> list[dict]:
    """
    Build contour (traceable outline) shapes from joint world positions.

    Parameters
    ----------
    joint_positions : dict[str, (x, y)]
    segment_widths  : dict[str, (proximal_w, distal_w)]

    Returns
    -------
    list[dict]  — shapes with role="contour", type="polyline", closed=True
    """
    shapes: list[dict] = []
    pos = joint_positions
    sw = segment_widths

    shapes.append(_torso_contour(pos, sw))

    neck_pw, neck_dw = sw.get("neck", (0.24, 0.20))
    shapes.append(_segment_contour(
        "neck-contour", "neck",
        pos["chest"], pos["neck"], neck_pw, neck_dw,
    ))

    # Torso — ribcage and pelvis are already ellipses in construction shapes;
    # for contour we emit a simple bounding-box-style closed polyline.
    # (Full torso merging is Phase 2 polish — deferred.)

    # Head outline (approximate oval from the head ball)
    head_cx = pos["head"][0]
    head_rx = 0.35
    head_ry = 0.50
    head_cy = 0.5
    shapes.append(_ellipse_contour("head-outline", "head", head_cx, head_cy, head_rx, head_ry))

    # Arms
    arm_pw,  arm_dw  = sw.get("upper_arm", (0.14, 0.10))
    fore_pw, fore_dw = sw.get("forearm",   (0.10, 0.07))

    for side in ("l", "r"):
        shoulder = pos[f"{side}_shoulder"]
        elbow    = pos[f"{side}_elbow"]
        wrist    = pos[f"{side}_wrist"]

        shapes.append(_segment_contour(
            f"{side}-upper-arm-contour", f"{side}_upper_arm",
            shoulder, elbow, arm_pw, arm_dw,
        ))
        shapes.append(_segment_contour(
            f"{side}-forearm-contour", f"{side}_forearm",
            elbow, wrist, fore_pw, fore_dw,
        ))
        shapes.append(_terminal_contour(
            f"{side}-hand-contour", f"{side}_hand",
            elbow, wrist,
            length=0.28,
            width_prox=max(fore_dw, 0.13),
            width_dist=0.16,
        ))

    # Legs
    thigh_pw, thigh_dw = sw.get("thigh", (0.18, 0.13))
    shin_pw,  shin_dw  = sw.get("shin",  (0.13, 0.08))

    for side in ("l", "r"):
        hip   = pos[f"{side}_hip"]
        knee  = pos[f"{side}_knee"]
        ankle = pos[f"{side}_ankle"]

        shapes.append(_segment_contour(
            f"{side}-thigh-contour", f"{side}_thigh",
            hip, knee, thigh_pw, thigh_dw,
        ))
        shapes.append(_segment_contour(
            f"{side}-shin-contour", f"{side}_shin",
            knee, ankle, shin_pw, shin_dw,
        ))
        shapes.append(_foot_contour(
            f"{side}-foot-contour", f"{side}_foot",
            ankle,
            side=side,
        ))

    return shapes


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _torso_contour(
    positions: dict[str, tuple[float, float]],
    segment_widths: dict[str, tuple[float, float]],
) -> dict:
    """Build a readable front-view torso bean around ribcage and pelvis."""
    chest_x, chest_y = positions["chest"]
    pelvis_x, pelvis_y = positions["pelvis"]
    rib_rx, _ = segment_widths.get("ribcage", (0.9, 0.7))
    pelvis_rx, pelvis_ry = segment_widths.get("pelvis", (0.7, 0.4))

    rib_y = chest_y + 0.4
    pelvis_center_y = pelvis_y - 0.2
    waist_y = (rib_y + pelvis_center_y) / 2
    waist_rx = min(rib_rx, pelvis_rx) * 0.62
    shoulder_left = positions["l_shoulder"]
    shoulder_right = positions["r_shoulder"]

    points = [
        [shoulder_left[0], chest_y + 0.05],
        [chest_x - rib_rx, rib_y],
        [chest_x - waist_rx, waist_y],
        [pelvis_x - pelvis_rx, pelvis_center_y],
        [pelvis_x - pelvis_rx * 0.72, pelvis_center_y + pelvis_ry],
        [pelvis_x + pelvis_rx * 0.72, pelvis_center_y + pelvis_ry],
        [pelvis_x + pelvis_rx, pelvis_center_y],
        [chest_x + waist_rx, waist_y],
        [chest_x + rib_rx, rib_y],
        [shoulder_right[0], chest_y + 0.05],
    ]
    return {
        "id": "torso-contour",
        "part": "torso",
        "role": "contour",
        "type": "polyline",
        "closed": True,
        "points": [[round(x, 4), round(y, 4)] for x, y in points],
    }


def _segment_contour(
    shape_id: str,
    part: str,
    p_start: tuple[float, float],
    p_end:   tuple[float, float],
    width_prox: float,
    width_dist: float,
) -> dict:
    """
    Build a closed outline polyline for a single bone segment using the
    same normal-offset algorithm as PressureBrush._buildOutlinePath.

    Points run: left-edge forward (proximal→distal), right-edge backward
    (distal→proximal), close.
    """
    # Two centerline points with linearly interpolated half-widths
    centerline = [p_start, p_end]
    half_widths = [width_prox / 2, width_dist / 2]

    left:  list[tuple[float, float]] = []
    right: list[tuple[float, float]] = []

    n = len(centerline)
    for i in range(n):
        prev = centerline[i - 1 if i > 0 else 0]
        nxt  = centerline[i + 1 if i < n - 1 else n - 1]

        tx = nxt[0] - prev[0]
        ty = nxt[1] - prev[1]
        length = math.hypot(tx, ty) or 1e-9
        tx /= length
        ty /= length

        # Normal: rotate tangent 90° CCW
        nx, ny = -ty, tx
        h = half_widths[i]

        left.append((centerline[i][0] + nx * h, centerline[i][1] + ny * h))
        right.append((centerline[i][0] - nx * h, centerline[i][1] - ny * h))

    # Walk left forward then right backward (mirrors PressureBrush)
    outline_pts = left + list(reversed(right))

    return {
        "id":     shape_id,
        "part":   part,
        "role":   "contour",
        "type":   "polyline",
        "closed": True,
        "points": [[round(x, 4), round(y, 4)] for x, y in outline_pts],
    }


def _terminal_contour(
    shape_id: str,
    part: str,
    p_parent: tuple[float, float],
    p_joint: tuple[float, float],
    length: float,
    width_prox: float,
    width_dist: float,
) -> dict:
    """Build a hand-like contour continuing the incoming limb direction."""
    x0, y0 = p_parent
    x1, y1 = p_joint
    dx, dy = x1 - x0, y1 - y0
    magnitude = math.hypot(dx, dy) or 1e-9
    tx, ty = dx / magnitude, dy / magnitude
    nx, ny = -ty, tx
    x2, y2 = x1 + tx * length, y1 + ty * length
    hp = width_prox / 2
    hd = width_dist / 2
    points = [
        [x1 + nx * hp, y1 + ny * hp],
        [x1 - nx * hp, y1 - ny * hp],
        [x2 - nx * hd, y2 - ny * hd],
        [x2 + tx * 0.08, y2 + ty * 0.08],
        [x2 + nx * hd, y2 + ny * hd],
    ]
    return {
        "id": shape_id,
        "part": part,
        "role": "contour",
        "type": "polyline",
        "closed": True,
        "points": [[round(x, 4), round(y, 4)] for x, y in points],
    }


def _foot_contour(
    shape_id: str,
    part: str,
    ankle: tuple[float, float],
    side: str,
) -> dict:
    """Build a simple front-view foot contour angled slightly outward."""
    direction = -1.0 if side == "l" else 1.0
    x, y = ankle
    points = [
        [x - direction * 0.08, y],
        [x + direction * 0.10, y],
        [x + direction * 0.34, y + 0.14],
        [x + direction * 0.06, y + 0.18],
    ]
    return {
        "id": shape_id,
        "part": part,
        "role": "contour",
        "type": "polyline",
        "closed": True,
        "points": [[round(px, 4), round(py, 4)] for px, py in points],
    }


def _ellipse_contour(
    shape_id: str,
    part: str,
    cx: float, cy: float,
    rx: float, ry: float,
    steps: int = 24,
) -> dict:
    """
    Approximate an ellipse as a closed polyline (for the head outline).
    24 steps gives a smooth enough guide without an enormous point list.
    """
    pts = []
    for i in range(steps):
        angle = 2 * math.pi * i / steps
        x = cx + rx * math.cos(angle)
        y = cy + ry * math.sin(angle)
        pts.append([round(x, 4), round(y, 4)])

    return {
        "id":     shape_id,
        "part":   part,
        "role":   "contour",
        "type":   "polyline",
        "closed": True,
        "points": pts,
    }
