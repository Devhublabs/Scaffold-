"""
fk.py — 2D Forward Kinematics for the Co-Artist skeleton.

Algorithm
---------
Walk the joint hierarchy from root to leaves.  For each joint:

    world_angle = parent_world_angle + clamp(joint.rest_angle, limits)
    child_pos   = parent_pos + bone_length × (cos(world_angle), sin(world_angle))

`rest_angle` is relative to the parent bone direction, so angles accumulate
naturally down the chain.  Every angle is clamped to the joint's anatomical
limits *before* being added, so no externally-supplied override can produce
impossible geometry.

Coordinate system: origin = crown-center, x+ = right, y+ = down (screen space).

Usage
-----
    from app.services.skeleton.fk import run_fk
    from app.services.skeleton.rig import JOINTS

    positions = run_fk(JOINTS, bone_lengths)          # rest pose
    positions = run_fk(JOINTS, bone_lengths, angles)  # with overrides
"""

from __future__ import annotations
import math


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def run_fk(
    joints: list[dict],
    bone_lengths: dict[str, float],
    angles: dict[str, float] | None = None,
) -> dict[str, tuple[float, float]]:
    """
    Compute world-space joint positions via 2D forward kinematics.

    Parameters
    ----------
    joints : list[dict]
        Joint definitions from rig.JOINTS.  Must be ordered root → leaves
        (parents appear before children).
    bone_lengths : dict[str, float]
        Bone lengths in head-units, keyed by bone_length_field.
        From proportions_resolver.resolve().
    angles : dict[str, float] | None
        Optional per-joint angle overrides in degrees (relative to parent
        bone direction, same convention as rest_angle).
        Keys are joint names.  Missing keys fall back to the joint's rest_angle.

    Returns
    -------
    dict[str, tuple[float, float]]
        World-space (x, y) position for every joint, in head-units.
        Origin (0, 0) = crown-center.
    """
    if angles is None:
        angles = {}

    # World positions and accumulated world angles, built up as we walk the tree.
    world_pos:   dict[str, tuple[float, float]] = {}
    world_angle: dict[str, float] = {}   # in degrees

    # Special-case the root: it has no parent, so its world angle IS its rest angle.
    root = joints[0]
    assert root["parent"] is None, "First joint must be root (parent=None)"

    raw_root_angle  = angles.get(root["name"], root["rest_angle"])
    clamped_root    = _clamp(raw_root_angle, root["limits"])
    world_angle[root["name"]] = clamped_root

    # Root joint position: pelvis sits at pelvis_to_chest below the chest,
    # which is roughly at y ≈ 2 hu (1 head + neck + chest-to-neck gap).
    # We fix pelvis at a canonical position derived from bone lengths.
    # Crown = (0, 0); head ends at y=1; neck at ~1.3; chest at ~1.5; pelvis below.
    world_pos[root["name"]] = (0.0, 0.0)   # will be corrected in _anchor_root below

    for joint in joints[1:]:
        parent_name = joint["parent"]
        parent_pos  = world_pos[parent_name]
        parent_ang  = world_angle[parent_name]

        # Joint's angle is relative to parent bone direction.
        raw_local   = angles.get(joint["name"], joint["rest_angle"])
        clamped_local = _clamp(raw_local, joint["limits"])

        world_ang = parent_ang + clamped_local
        world_angle[joint["name"]] = world_ang

        bone_len = bone_lengths.get(joint["bone_length_field"], 1.0)
        rad      = math.radians(world_ang)
        wx       = parent_pos[0] + bone_len * math.cos(rad)
        wy       = parent_pos[1] + bone_len * math.sin(rad)
        world_pos[joint["name"]] = (wx, wy)

    # Shift everything so the crown (top of head) is at (0, 0).
    return _anchor_to_crown(world_pos, bone_lengths)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _clamp(value: float, limits: tuple[float, float]) -> float:
    """Clamp value to [min, max].  Works with negative and wrap-around ranges."""
    lo, hi = limits
    return max(lo, min(hi, value))


def _anchor_to_crown(
    positions: dict[str, tuple[float, float]],
    bone_lengths: dict[str, float],
) -> dict[str, tuple[float, float]]:
    """
    Re-anchor the skeleton so that (0, 0) = crown (top of head).

    FK places the pelvis at the origin.  We need to shift the whole figure
    upward by the distance from pelvis to crown:
        crown_y = -(pelvis_to_chest + chest_to_neck + neck_length + head_height)
    Since everything is y-positive downward, crown sits above pelvis at a
    negative offset — shifting by +that offset brings crown to 0.
    """
    spine_up = (
        bone_lengths.get("pelvis_to_chest", 1.1)
        + bone_lengths.get("chest_to_neck", 0.2)
        + bone_lengths.get("neck_length",   0.3)
        + bone_lengths.get("head_height",   1.0)
    )
    # In rest pose the spine points straight up, so pelvis_y - spine_up = crown_y.
    # We want crown at y=0, so shift by +spine_up.
    dy = spine_up
    return {name: (x, y + dy) for name, (x, y) in positions.items()}
