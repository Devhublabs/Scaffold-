"""
skeleton_service.py — Public entry point for the Co-Artist skeleton pipeline.

Usage
-----
    from app.services.skeleton_service import build_skeleton

    payload = build_skeleton(proportions, character_id="char_01")
    # payload is a co_artist_shapes dict ready to emit via REST or Socket.IO

The function is pure and deterministic: no I/O, no AI, no network.
Same input always produces identical output, making it fully unit-testable.

Pipeline
--------
  proportions dict
      ↓  proportions_resolver.resolve()
  bone_lengths, segment_widths  (head-units)
      ↓  fk.run_fk()
  joint_positions  {name: (x, y)}
      ↓  volumes.build_construction_shapes()
      ↓  silhouette.build_silhouette_shapes()   (Phase 2)
  shapes list
      ↓  assemble
  co_artist_shapes payload
"""

from __future__ import annotations

from app.services.skeleton.proportions_resolver import resolve
from app.services.skeleton.rig import JOINTS
from app.services.skeleton.fk import run_fk
from app.services.skeleton.volumes import build_construction_shapes
from app.services.skeleton.silhouette import build_silhouette_shapes


def build_skeleton(
    proportions: dict,
    character_id: str,
    angles: dict | None = None,
) -> dict:
    """
    Build a co_artist_shapes payload from a proportions dict.

    Parameters
    ----------
    proportions : dict
        Character proportion measurements (see proportions_resolver for schema).
        May be partial — all fields have anatomical defaults.
    character_id : str
        Stable identifier for this character.  Every shape in the payload
        belongs to this character, enabling per-character memory later.
    angles : dict | None
        Optional per-joint angle overrides (degrees, relative to parent bone
        direction).  None → rest pose (neutral standing figure).

    Returns
    -------
    dict
        co_artist_shapes payload:
        {
            "characterId": str,
            "space":       "head-units",
            "anchor":      "crown-center",
            "pose":        "rest",
            "shapes":      list[dict],
        }
        All coordinates are in head-units (1 unit = 1 head height).
        The frontend is responsible for converting to pixels.
    """
    # Step 1 — resolve proportions to bone lengths and segment widths
    bone_lengths, segment_widths = resolve(proportions)

    # Step 2 — run forward kinematics to get world-space joint positions
    joint_positions = run_fk(JOINTS, bone_lengths, angles)

    # Step 3 — build construction guide shapes (Phase 1)
    construction = build_construction_shapes(joint_positions, segment_widths)

    # Step 4 — build contour (traceable edge) shapes (Phase 2)
    contours = build_silhouette_shapes(joint_positions, segment_widths)

    shapes = construction + contours

    return {
        "characterId": character_id,
        "space":       "head-units",
        "anchor":      "crown-center",
        "pose":        "rest" if angles is None else "custom",
        "shapes":      shapes,
    }
