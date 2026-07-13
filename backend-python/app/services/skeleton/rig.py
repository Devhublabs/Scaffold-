"""
rig.py — Fixed joint hierarchy for the Co-Artist skeleton.

Coordinate system
-----------------
  origin : crown-center (top of the head, horizontal midline)
  x      : positive = right (from the character's perspective, so left on screen)
  y      : positive = downward
  units  : head-units (1 unit = 1 head height)

Angles
------
  All angles in degrees, measured clockwise from the +x axis (standard 2D
  screen convention). Accumulated down the chain by FK.

  rest_angle: the joint's default angle relative to its parent's bone direction.
  limits: (min_deg, max_deg) — anatomical clamp applied before FK runs.
          Out-of-range values become ugly-but-valid, never impossible geometry.

Rig hierarchy (root = pelvis)
------------------------------
  pelvis
  ├── spine ──> chest ──> neck ──> head
  │              ├── l_shoulder ──> l_elbow ──> l_wrist
  │              └── r_shoulder ──> r_elbow ──> r_wrist
  ├── l_hip ──> l_knee ──> l_ankle
  └── r_hip ──> r_knee ──> r_ankle
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Joint definitions
# ---------------------------------------------------------------------------
# Each joint is a dict with:
#   name              : str   – unique, stable identifier
#   parent            : str | None – parent joint name; None = root
#   bone_length_field : str   – key in the bone_lengths dict (output of
#                               proportions_resolver.resolve)
#   rest_angle        : float – degrees, relative to parent bone direction
#   limits            : (float, float) – anatomical clamp (min, max) degrees

JOINTS: list[dict] = [
    # --- Root ---
    {
        "name": "pelvis",
        "parent": None,
        "bone_length_field": "pelvis_to_chest",
        "rest_angle": 270.0,   # points upward (270° = −y = up in screen coords)
        "limits": (240.0, 300.0),
    },
    # --- Spine chain ---
    {
        "name": "spine",
        "parent": "pelvis",
        "bone_length_field": "pelvis_to_chest",
        "rest_angle": 0.0,     # continues in parent direction (upward)
        "limits": (-15.0, 15.0),
    },
    {
        "name": "chest",
        "parent": "spine",
        "bone_length_field": "chest_to_neck",
        "rest_angle": 0.0,     # continues upward
        "limits": (-15.0, 15.0),
    },
    {
        "name": "neck",
        "parent": "chest",
        "bone_length_field": "neck_length",
        "rest_angle": 0.0,     # continues upward
        "limits": (-15.0, 15.0),
    },
    {
        "name": "head",
        "parent": "neck",
        "bone_length_field": "head_height",
        "rest_angle": 0.0,     # continues upward
        "limits": (-30.0, 30.0),
    },
    # --- Left arm ---
    {
        "name": "l_shoulder",
        "parent": "chest",
        "bone_length_field": "shoulder_hw",
        "rest_angle": 270.0,   # points left relative to chest's direction (270 + 270 = 540 = 180 = left)
        "limits": (180.0, 360.0),
    },
    {
        "name": "l_elbow",
        "parent": "l_shoulder",
        "bone_length_field": "upper_arm_length",
        "rest_angle": 270.0,   # hangs down relative to shoulder's direction (180 + 270 = 450 = 90 = down)
        "limits": (180.0, 330.0),
    },
    {
        "name": "l_wrist",
        "parent": "l_elbow",
        "bone_length_field": "forearm_length",
        "rest_angle": 0.0,     # continues straight down
        "limits": (-45.0, 45.0),
    },
    # --- Right arm ---
    {
        "name": "r_shoulder",
        "parent": "chest",
        "bone_length_field": "shoulder_hw",
        "rest_angle": 90.0,    # points right relative to chest's direction (270 + 90 = 360 = 0 = right)
        "limits": (0.0, 180.0),
    },
    {
        "name": "r_elbow",
        "parent": "r_shoulder",
        "bone_length_field": "upper_arm_length",
        "rest_angle": 90.0,     # hangs down relative to shoulder's direction (0 + 90 = 90 = down)
        "limits": (0.0, 150.0),
    },
    {
        "name": "r_wrist",
        "parent": "r_elbow",
        "bone_length_field": "forearm_length",
        "rest_angle": 0.0,     # continues straight down
        "limits": (-45.0, 45.0),
    },
    # --- Left leg ---
    {
        "name": "l_hip",
        "parent": "pelvis",
        "bone_length_field": "pelvis_hw",
        "rest_angle": 270.0,   # points left relative to pelvis's direction (270 + 270 = 540 = 180 = left)
        "limits": (225.0, 315.0),
    },
    {
        "name": "l_knee",
        "parent": "l_hip",
        "bone_length_field": "thigh_length",
        "rest_angle": 270.0,   # hangs down relative to hip's direction (180 + 270 = 450 = 90 = down)
        "limits": (180.0, 330.0),
    },
    {
        "name": "l_ankle",
        "parent": "l_knee",
        "bone_length_field": "shin_length",
        "rest_angle": 0.0,     # continues straight down
        "limits": (-30.0, 30.0),
    },
    # --- Right leg ---
    {
        "name": "r_hip",
        "parent": "pelvis",
        "bone_length_field": "pelvis_hw",
        "rest_angle": 90.0,    # points right relative to pelvis's direction (270 + 90 = 360 = 0 = right)
        "limits": (45.0, 135.0),
    },
    {
        "name": "r_knee",
        "parent": "r_hip",
        "bone_length_field": "thigh_length",
        "rest_angle": 90.0,    # hangs down relative to hip's direction (0 + 90 = 90 = down)
        "limits": (30.0, 180.0),
    },
    {
        "name": "r_ankle",
        "parent": "r_knee",
        "bone_length_field": "shin_length",
        "rest_angle": 0.0,     # continues straight down
        "limits": (-30.0, 30.0),
    },
]

# ---------------------------------------------------------------------------
# Quick-lookup dict by name (built once at import time)
# ---------------------------------------------------------------------------
JOINT_BY_NAME: dict[str, dict] = {j["name"]: j for j in JOINTS}
