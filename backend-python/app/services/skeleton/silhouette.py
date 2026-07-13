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
    sw  = segment_widths

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

    return shapes


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

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
