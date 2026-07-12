"""
test_skeleton_service.py — Unit tests for skeleton_service.build_skeleton().

Pure geometry — no server, no DB, no mocks. Run with:
    pytest tests/test_skeleton_service.py -v
"""
import pytest
from app.services.skeleton_service import build_skeleton
from app.services.skeleton.rig import JOINTS

STANDARD_PROPORTIONS = {
    "headHeightCm":     23.0,
    "shoulderWidthCm":  46.0,
    "chestWidthCm":     42.0,
    "hipWidthCm":       38.0,
    "upperArmLengthCm": 30.0,
    "forearmLengthCm":  25.0,
    "thighLengthCm":    40.0,
    "shinLengthCm":     37.0,
    "neckLengthCm":      9.0,
    "torsoLengthCm":    27.0,
}

class TestSkeletonService:
    def test_build_skeleton_returns_dict(self):
        payload = build_skeleton(STANDARD_PROPORTIONS, "char_01")
        assert isinstance(payload, dict)

    def test_build_skeleton_contains_required_keys(self):
        payload = build_skeleton(STANDARD_PROPORTIONS, "char_01")
        required_keys = {"characterId", "space", "anchor", "pose", "shapes"}
        assert required_keys.issubset(payload.keys())

    def test_build_skeleton_passes_character_id(self):
        payload = build_skeleton(STANDARD_PROPORTIONS, "char_01")
        assert payload["characterId"] == "char_01"

    def test_build_skeleton_has_correct_metadata(self):
        payload = build_skeleton(STANDARD_PROPORTIONS, "char_01")
        assert payload["space"] == "head-units"
        assert payload["anchor"] == "crown-center"
        assert payload["pose"] == "rest"

    def test_build_skeleton_with_angles_sets_custom_pose(self):
        payload = build_skeleton(STANDARD_PROPORTIONS, "char_01", {"l_elbow": 45.0})
        assert payload["pose"] == "custom"

    def test_build_skeleton_contains_shapes_list(self):
        payload = build_skeleton(STANDARD_PROPORTIONS, "char_01")
        assert isinstance(payload["shapes"], list)
        assert len(payload["shapes"]) > 0

    def test_shapes_have_correct_structure(self):
        payload = build_skeleton(STANDARD_PROPORTIONS, "char_01")
        for shape in payload["shapes"]:
            assert "id" in shape
            assert "part" in shape
            assert "role" in shape
            assert "type" in shape
            assert shape["role"] in {"construction", "contour"}
