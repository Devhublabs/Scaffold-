"""Resolve character proportions into deterministic head-unit rig values.

The Groq contract uses head-unit fields such as ``armLengthInHeads``. Older
callers and fixtures use centimeter measurements. This module accepts both and
prefers direct head-unit values when they are available.
"""

from __future__ import annotations


_DEFAULTS = {
    "head_height": 1.00,
    "neck_length": 0.30,
    "chest_to_neck": 0.20,
    "pelvis_to_chest": 1.10,
    "upper_arm_length": 1.00,
    "forearm_length": 0.90,
    "thigh_length": 1.50,
    "shin_length": 1.40,
    "ribcage_width": 0.90,
    "pelvis_width": 0.70,
    "upper_arm_w_prox": 0.26,
    "upper_arm_w_dist": 0.19,
    "forearm_w_prox": 0.20,
    "forearm_w_dist": 0.13,
    "thigh_w_prox": 0.38,
    "thigh_w_dist": 0.27,
    "shin_w_prox": 0.28,
    "shin_w_dist": 0.17,
    "neck_w_prox": 0.24,
    "neck_w_dist": 0.20,
}


def _positive_float(value) -> float | None:
    if isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if number > 0 else None


def _split_total(
    total: float | None,
    first_default: float,
    second_default: float,
) -> tuple[float, float]:
    if total is None:
        return first_default, second_default
    first_ratio = first_default / (first_default + second_default)
    return total * first_ratio, total * (1.0 - first_ratio)


def resolve(
    proportions: dict,
) -> tuple[dict[str, float], dict[str, tuple[float, float]]]:
    """Convert a partial proportions dictionary to head-unit rig values."""
    if not isinstance(proportions, dict):
        raise TypeError("proportions must be a dictionary")

    head_cm = _positive_float(proportions.get("headHeightCm"))

    def from_cm(cm_key: str) -> float | None:
        raw = _positive_float(proportions.get(cm_key))
        if head_cm is None or raw is None:
            return None
        return raw / head_cm

    def head_units(
        heads_key: str,
        cm_key: str,
        fallback_hu: float,
    ) -> float:
        direct = _positive_float(proportions.get(heads_key))
        if direct is not None:
            return direct
        converted = from_cm(cm_key)
        return converted if converted is not None else fallback_hu

    shoulder_width = head_units(
        "shoulderWidthInHeads",
        "shoulderWidthCm",
        _DEFAULTS["ribcage_width"] * 2,
    )
    chest_width = head_units(
        "chestWidthInHeads",
        "chestWidthCm",
        shoulder_width,
    )
    hip_width = head_units(
        "hipWidthInHeads",
        "hipWidthCm",
        _DEFAULTS["pelvis_width"] * 2,
    )

    upper_arm_length = from_cm("upperArmLengthCm")
    forearm_length = from_cm("forearmLengthCm")
    if upper_arm_length is None and forearm_length is None:
        upper_arm_length, forearm_length = _split_total(
            _positive_float(proportions.get("armLengthInHeads")),
            _DEFAULTS["upper_arm_length"],
            _DEFAULTS["forearm_length"],
        )
    else:
        upper_arm_length = upper_arm_length or _DEFAULTS["upper_arm_length"]
        forearm_length = forearm_length or _DEFAULTS["forearm_length"]

    thigh_length = from_cm("thighLengthCm")
    shin_length = from_cm("shinLengthCm")
    if thigh_length is None and shin_length is None:
        leg_length = _positive_float(proportions.get("legLengthInHeads"))
        if leg_length is None:
            body_height = _positive_float(proportions.get("bodyHeightInHeads"))
            leg_ratio = _positive_float(proportions.get("legLengthRatio"))
            if body_height is not None and leg_ratio is not None:
                leg_length = body_height * leg_ratio
        thigh_length, shin_length = _split_total(
            leg_length,
            _DEFAULTS["thigh_length"],
            _DEFAULTS["shin_length"],
        )
    else:
        thigh_length = thigh_length or _DEFAULTS["thigh_length"]
        shin_length = shin_length or _DEFAULTS["shin_length"]

    shoulder_hw = shoulder_width / 2.0
    ribcage_hw = chest_width / 2.0
    pelvis_hw = hip_width / 2.0

    bone_lengths: dict[str, float] = {
        "head_height": 1.0,
        "neck_length": head_units(
            "neckLengthInHeads",
            "neckLengthCm",
            _DEFAULTS["neck_length"],
        ),
        "chest_to_neck": _DEFAULTS["chest_to_neck"],
        "pelvis_to_chest": head_units(
            "torsoLengthInHeads",
            "torsoLengthCm",
            _DEFAULTS["pelvis_to_chest"],
        ),
        "shoulder_hw": shoulder_hw,
        "pelvis_hw": pelvis_hw,
        "upper_arm_length": upper_arm_length,
        "forearm_length": forearm_length,
        "thigh_length": thigh_length,
        "shin_length": shin_length,
    }

    segment_widths: dict[str, tuple[float, float]] = {
        "ribcage": (ribcage_hw, _DEFAULTS["ribcage_width"] * 0.75),
        "pelvis": (pelvis_hw, _DEFAULTS["pelvis_width"] * 0.55),
        "neck": (_DEFAULTS["neck_w_prox"], _DEFAULTS["neck_w_dist"]),
        "upper_arm": (
            _DEFAULTS["upper_arm_w_prox"],
            _DEFAULTS["upper_arm_w_dist"],
        ),
        "forearm": (
            _DEFAULTS["forearm_w_prox"],
            _DEFAULTS["forearm_w_dist"],
        ),
        "thigh": (_DEFAULTS["thigh_w_prox"], _DEFAULTS["thigh_w_dist"]),
        "shin": (_DEFAULTS["shin_w_prox"], _DEFAULTS["shin_w_dist"]),
        "shoulder_hw": (shoulder_hw, shoulder_hw),
    }

    return bone_lengths, segment_widths
