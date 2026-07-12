"""
proportions_resolver.py — Converts a proportions dict into bone lengths and
segment widths, all in head-units (1 unit = 1 head height).

Proportions schema
------------------
The proportions dict is produced by extract_proportions() (co_artist_service.py,
Groq-backed). The resolver is intentionally lenient: every field has a sensible
anatomical default so the skeleton never crashes on a partial schema.

Expected keys (all values in cm; resolver converts to head-units internally):
    headHeightCm        float  – vertical height of the head
    totalHeightCm       float  – crown to sole; used to derive leg length
    shoulderWidthCm     float  – tip-to-tip shoulder width
    chestWidthCm        float  – widest point of the ribcage
    waistWidthCm        float  – narrowest torso width
    hipWidthCm          float  – widest point of the pelvis
    upperArmLengthCm    float  – shoulder to elbow
    forearmLengthCm     float  – elbow to wrist
    thighLengthCm       float  – hip to knee
    shinLengthCm        float  – knee to ankle
    neckLengthCm        float  – base of skull to top of chest
    torsoLengthCm       float  – top of chest to top of pelvis

All keys are optional — defaults produce a neutral ~7-head adult figure.

Returns
-------
bone_lengths : dict[str, float]
    Maps bone_length_field names (from rig.py) to lengths in head-units.
    Keys: head_height, neck_length, chest_to_neck, pelvis_to_chest,
          upper_arm_length, forearm_length, thigh_length, shin_length.

segment_widths : dict[str, tuple[float, float]]
    Maps part names to (proximal_width, distal_width) in head-units.
    Tapered tubes are drawn fat-to-thin along the bone direction.
    Keys: ribcage, pelvis, upper_arm_l, upper_arm_r, forearm_l, forearm_r,
          thigh_l, thigh_r, shin_l, shin_r, neck.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Anatomical defaults — a neutral 7-head adult figure (head-units)
# ---------------------------------------------------------------------------
_DEFAULTS = {
    # bone lengths
    "head_height":       1.00,
    "neck_length":       0.30,
    "chest_to_neck":     0.20,   # short segment from chest joint to neck base
    "pelvis_to_chest":   1.10,   # spine length (pelvis to chest)
    "upper_arm_length":  1.00,
    "forearm_length":    0.90,
    "thigh_length":      1.50,
    "shin_length":       1.40,
    # segment widths (proximal, distal) — all in head-units
    "ribcage_width":     0.90,   # ellipse rx (half-width)
    "pelvis_width":      0.70,
    "upper_arm_w_prox":  0.14,
    "upper_arm_w_dist":  0.10,
    "forearm_w_prox":    0.10,
    "forearm_w_dist":    0.07,
    "thigh_w_prox":      0.18,
    "thigh_w_dist":      0.13,
    "shin_w_prox":       0.13,
    "shin_w_dist":       0.08,
    "neck_w_prox":       0.12,
    "neck_w_dist":       0.10,
}


def resolve(proportions: dict) -> tuple[dict[str, float], dict[str, tuple[float, float]]]:
    """
    Convert a proportions dict (cm values) to bone_lengths and segment_widths
    (head-units).  Every field falls back to the neutral-figure defaults so the
    skeleton never errors on a partial or empty dict.

    Parameters
    ----------
    proportions : dict
        As produced by extract_proportions().  May be partial.

    Returns
    -------
    bone_lengths     : dict[str, float]
    segment_widths   : dict[str, tuple[float, float]]
    """
    p = proportions  # alias for brevity

    head_cm = float(p.get("headHeightCm", 0.0))

    def hu(cm_key: str, fallback_hu: float) -> float:
        """Convert a cm value from proportions to head-units.
        Falls back to fallback_hu if the key is missing or head_cm is 0."""
        if head_cm <= 0:
            return fallback_hu
        raw = p.get(cm_key)
        if raw is None:
            return fallback_hu
        return float(raw) / head_cm

    # --- Shoulder half-width (used to place l/r shoulder joints) ---
    shoulder_hw = hu("shoulderWidthCm", _DEFAULTS["ribcage_width"] * 2) / 2.0
    ribcage_hw  = hu("chestWidthCm",    _DEFAULTS["ribcage_width"] * 2) / 2.0
    pelvis_hw   = hu("hipWidthCm",      _DEFAULTS["pelvis_width"] * 2)  / 2.0

    # --- Bone lengths ---
    bone_lengths: dict[str, float] = {
        "head_height":     1.0,   # by definition — origin is crown, head is 1 hu tall
        "neck_length":     hu("neckLengthCm",     _DEFAULTS["neck_length"]),
        "chest_to_neck":   _DEFAULTS["chest_to_neck"],  # not usually in schema; kept fixed
        "pelvis_to_chest": hu("torsoLengthCm",    _DEFAULTS["pelvis_to_chest"]),
        "shoulder_hw":     shoulder_hw,
        "pelvis_hw":       pelvis_hw,
        "upper_arm_length":hu("upperArmLengthCm", _DEFAULTS["upper_arm_length"]),
        "forearm_length":  hu("forearmLengthCm",  _DEFAULTS["forearm_length"]),
        "thigh_length":    hu("thighLengthCm",    _DEFAULTS["thigh_length"]),
        "shin_length":     hu("shinLengthCm",     _DEFAULTS["shin_length"]),
    }


    # --- Segment widths (proximal, distal) ---
    segment_widths: dict[str, tuple[float, float]] = {
        # torso volumes — stored as (rx, ry) half-axes for the ellipses
        "ribcage":   (ribcage_hw,  _DEFAULTS["ribcage_width"] * 0.75),
        "pelvis":    (pelvis_hw,   _DEFAULTS["pelvis_width"]  * 0.55),
        "neck":      (_DEFAULTS["neck_w_prox"], _DEFAULTS["neck_w_dist"]),
        # limbs — same width for left and right; volumes.py mirrors them
        "upper_arm": (_DEFAULTS["upper_arm_w_prox"], _DEFAULTS["upper_arm_w_dist"]),
        "forearm":   (_DEFAULTS["forearm_w_prox"],   _DEFAULTS["forearm_w_dist"]),
        "thigh":     (_DEFAULTS["thigh_w_prox"],     _DEFAULTS["thigh_w_dist"]),
        "shin":      (_DEFAULTS["shin_w_prox"],      _DEFAULTS["shin_w_dist"]),
        # shoulder_hw exposed so volumes.py can place shoulder joints
        "shoulder_hw": (shoulder_hw, shoulder_hw),
    }

    return bone_lengths, segment_widths
