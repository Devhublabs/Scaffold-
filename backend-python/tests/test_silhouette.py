"""
test_silhouette.py — Unit tests for silhouette.build_silhouette_shapes().

Pure geometry — no server, no DB, no mocks. Run with:
    pytest tests/test_silhouette.py -v
"""
import pytest
from app.services.skeleton.rig import JOINTS
from app.services.skeleton.fk import run_fk
from app.services.skeleton.proportions_resolver import resolve
from app.services.skeleton.silhouette import build_silhouette_shapes

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

@pytest.fixture(scope="module")
def silhouette_shapes():
    bone_lengths, segment_widths = resolve(STANDARD_PROPORTIONS)
    joint_positions = run_fk(JOINTS, bone_lengths)
    return build_silhouette_shapes(joint_positions, segment_widths)

@pytest.fixture(scope="module")
def shapes_by_id(silhouette_shapes):
    return {s["id"]: s for s in silhouette_shapes}

class TestSilhouetteShapes:
    def test_returns_list(self, silhouette_shapes):
        assert isinstance(silhouette_shapes, list)
        assert len(silhouette_shapes) > 0

    def test_every_shape_is_contour_role(self, silhouette_shapes):
        for shape in silhouette_shapes:
            assert shape["role"] == "contour"

    def test_every_shape_is_polyline_type(self, silhouette_shapes):
        for shape in silhouette_shapes:
            assert shape["type"] == "polyline"

    def test_every_shape_is_closed(self, silhouette_shapes):
        for shape in silhouette_shapes:
            assert shape.get("closed") is True

    def test_head_outline_present(self, shapes_by_id):
        assert "head-outline" in shapes_by_id
        head = shapes_by_id["head-outline"]
        assert len(head["points"]) == 24  # 24 steps

    def test_arm_contours_present(self, shapes_by_id):
        for side in ("l", "r"):
            assert f"{side}-upper-arm-contour" in shapes_by_id
            assert f"{side}-forearm-contour" in shapes_by_id
            
            # Limb outline path walk has left and right sides so it has 4 points total
            assert len(shapes_by_id[f"{side}-upper-arm-contour"]["points"]) == 4
            assert len(shapes_by_id[f"{side}-forearm-contour"]["points"]) == 4

    def test_leg_contours_present(self, shapes_by_id):
        for side in ("l", "r"):
            assert f"{side}-thigh-contour" in shapes_by_id
            assert f"{side}-shin-contour" in shapes_by_id
            assert len(shapes_by_id[f"{side}-thigh-contour"]["points"]) == 4
            assert len(shapes_by_id[f"{side}-shin-contour"]["points"]) == 4
