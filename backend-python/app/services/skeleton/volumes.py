"""
volumes.py — Converts joint world-positions into construction guide shapes.

Each shape conforms to the co_artist_shapes contract:

    {
        "id":       str   – unique within the payload
        "part":     str   – semantic name (joint / segment)
        "role":     "construction"
        "type":     "ellipse" | "line" | "polyline"
        # type-specific geometry (all in head-units):
        #   ellipse  → cx, cy, rx, ry, rotation
        #   line     → x1, y1, x2, y2
        #   polyline → points [[x,y], ...]
    }

Build order (upper-body first, then legs):
  Head ball, face centerline, jaw wedge, brow/nose/chin cross-contours,
  spine, ribcage ellipse, pelvis ellipse, neck tube,
  joint spheres (shoulders, elbows, wrists, hips, knees, ankles),
  arm tubes (upper arm L/R, forearm L/R),
  leg tubes (thigh L/R, shin L/R).
"""

from __future__ import annotations
import math


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def build_construction_shapes(
    joint_positions: dict[str, tuple[float, float]],
    segment_widths: dict[str, tuple[float, float]],
) -> list[dict]:
    """
    Build all construction shapes from world-space joint positions.

    Parameters
    ----------
    joint_positions : dict[str, tuple[float, float]]
        Output of fk.run_fk().  Keys are joint names; values are (x, y)
        head-unit coordinates with origin = crown-center.
    segment_widths : dict[str, tuple[float, float]]
        Output of proportions_resolver.resolve().  Widths in head-units.

    Returns
    -------
    list[dict]
        Ordered list of shape dicts ready for the co_artist_shapes payload.
    """
    shapes: list[dict] = []
    pos = joint_positions
    sw  = segment_widths

    # --- HEAD ---
    head_cx = pos["head"][0]
    head_cy = 0.5                              # ball center = halfway down the head
    head_rx = 0.35
    head_ry = 0.50

    shapes.append(_ellipse("head-ball", "head", head_cx, head_cy, head_rx, head_ry))

    # Face centerline (vertical line down the face)
    shapes.append(_polyline("face-centerline", "head", [
        [head_cx, 0.05],
        [head_cx, 0.95],
    ]))

    # Jaw wedge — a simple V pointing down from the cheekbones to the chin
    jaw_top_y  = 0.6
    chin_y     = 0.95
    cheek_w    = head_rx * 0.9
    shapes.append(_polyline("jaw-wedge", "head", [
        [head_cx - cheek_w, jaw_top_y],
        [head_cx,           chin_y],
        [head_cx + cheek_w, jaw_top_y],
    ]))

    # Horizontal cross-contours (brow, nose, chin lines)
    for label, frac in [("brow-line", 0.30), ("nose-line", 0.60), ("chin-line", 0.85)]:
        y = frac
        shapes.append(_line(f"face-{label}", "head",
                            head_cx - head_rx, y,
                            head_cx + head_rx, y))

    # --- SPINE ---
    chest_pos  = pos["chest"]
    pelvis_pos = pos["pelvis"]
    shapes.append(_line("spine", "spine",
                         chest_pos[0],  chest_pos[1],
                         pelvis_pos[0], pelvis_pos[1]))

    # --- RIBCAGE ---
    ribcage_cx = chest_pos[0]
    ribcage_cy = chest_pos[1] + 0.4   # slightly below chest joint
    ribcage_rx, ribcage_ry = sw.get("ribcage", (0.9, 0.7))
    shapes.append(_ellipse("ribcage", "ribcage", ribcage_cx, ribcage_cy, ribcage_rx, ribcage_ry))

    # --- PELVIS ---
    pelvis_cx = pelvis_pos[0]
    pelvis_cy = pelvis_pos[1] - 0.2   # slightly above the pelvis joint
    pelvis_rx, pelvis_ry = sw.get("pelvis", (0.7, 0.5))
    shapes.append(_ellipse("pelvis", "pelvis", pelvis_cx, pelvis_cy, pelvis_rx, pelvis_ry))

    # --- NECK ---
    neck_pos   = pos["neck"]
    neck_pw, neck_dw = sw.get("neck", (0.12, 0.10))
    shapes += _tube("neck", "neck", chest_pos, neck_pos, neck_pw, neck_dw)

    # --- JOINT SPHERES ---
    joint_sphere_radius = 0.06
    sphere_joints = [
        ("l_shoulder", "l_shoulder"), ("r_shoulder", "r_shoulder"),
        ("l_elbow",    "l_elbow"),    ("r_elbow",    "r_elbow"),
        ("l_wrist",    "l_wrist"),    ("r_wrist",    "r_wrist"),
        ("l_hip",      "l_hip"),      ("r_hip",      "r_hip"),
        ("l_knee",     "l_knee"),     ("r_knee",     "r_knee"),
        ("l_ankle",    "l_ankle"),    ("r_ankle",    "r_ankle"),
    ]
    for sphere_id, joint_name in sphere_joints:
        if joint_name in pos:
            jx, jy = pos[joint_name]
            shapes.append(_ellipse(
                f"joint-{sphere_id}", joint_name,
                jx, jy,
                joint_sphere_radius, joint_sphere_radius,
            ))

    # --- ARM TUBES ---
    arm_pw, arm_dw   = sw.get("upper_arm", (0.14, 0.10))
    fore_pw, fore_dw = sw.get("forearm",   (0.10, 0.07))

    for side in ("l", "r"):
        shoulder = pos[f"{side}_shoulder"]
        elbow    = pos[f"{side}_elbow"]
        wrist    = pos[f"{side}_wrist"]

        shapes += _tube(f"{side}-upper-arm", f"{side}_upper_arm",
                        shoulder, elbow, arm_pw, arm_dw)
        shapes += _tube(f"{side}-forearm", f"{side}_forearm",
                        elbow, wrist, fore_pw, fore_dw)

    # --- LEG TUBES ---
    thigh_pw, thigh_dw = sw.get("thigh", (0.18, 0.13))
    shin_pw,  shin_dw  = sw.get("shin",  (0.13, 0.08))

    for side in ("l", "r"):
        hip   = pos[f"{side}_hip"]
        knee  = pos[f"{side}_knee"]
        ankle = pos[f"{side}_ankle"]

        shapes += _tube(f"{side}-thigh", f"{side}_thigh",
                        hip, knee, thigh_pw, thigh_dw)
        shapes += _tube(f"{side}-shin", f"{side}_shin",
                        knee, ankle, shin_pw, shin_dw)

    return shapes


# ---------------------------------------------------------------------------
# Shape helpers
# ---------------------------------------------------------------------------

def _ellipse(
    shape_id: str,
    part: str,
    cx: float, cy: float,
    rx: float, ry: float,
    rotation: float = 0.0,
) -> dict:
    return {
        "id":       shape_id,
        "part":     part,
        "role":     "construction",
        "type":     "ellipse",
        "cx":       round(cx, 4),
        "cy":       round(cy, 4),
        "rx":       round(rx, 4),
        "ry":       round(ry, 4),
        "rotation": round(rotation, 4),
    }


def _line(
    shape_id: str, part: str,
    x1: float, y1: float,
    x2: float, y2: float,
) -> dict:
    return {
        "id":   shape_id,
        "part": part,
        "role": "construction",
        "type": "line",
        "x1":   round(x1, 4),
        "y1":   round(y1, 4),
        "x2":   round(x2, 4),
        "y2":   round(y2, 4),
    }


def _polyline(shape_id: str, part: str, points: list[list[float]]) -> dict:
    return {
        "id":     shape_id,
        "part":   part,
        "role":   "construction",
        "type":   "polyline",
        "points": [[round(x, 4), round(y, 4)] for x, y in points],
    }


def _tube(
    shape_id: str,
    part: str,
    p_start: tuple[float, float],
    p_end:   tuple[float, float],
    width_prox: float,
    width_dist: float,
) -> list[dict]:
    """
    Build a tapered tube as a 4-point closed polyline offset from the
    bone centerline (proximal → distal), plus the centerline as a guide line.

    Returns two shapes: the centerline line and the tube outline polyline.
    """
    x1, y1 = p_start
    x2, y2 = p_end

    # Bone direction tangent + perpendicular normal
    dx, dy  = x2 - x1, y2 - y1
    length  = math.hypot(dx, dy) or 1e-9
    tx, ty  = dx / length, dy / length
    nx, ny  = -ty, tx                # 90° CCW = left-side normal

    # Four corners: proximal-left, proximal-right, distal-right, distal-left
    hp = width_prox / 2
    hd = width_dist / 2

    pl = (x1 + nx * hp, y1 + ny * hp)   # proximal left
    pr = (x1 - nx * hp, y1 - ny * hp)   # proximal right
    dr = (x2 - nx * hd, y2 - ny * hd)   # distal right
    dl = (x2 + nx * hd, y2 + ny * hd)   # distal left

    centerline = _line(f"{shape_id}-centerline", part, x1, y1, x2, y2)
    outline    = _polyline(f"{shape_id}-outline", part, [pl, pr, dr, dl, pl])

    return [centerline, outline]
