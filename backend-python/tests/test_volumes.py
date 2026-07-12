"""
test_volumes.py — Unit tests for volumes.build_construction_shapes().

Pure geometry — no server, no DB, no mocks.  Run with:
    pytest tests/test_volumes.py -v
"""
import pytest
from app.services.skeleton.rig import JOINTS
from app.services.skeleton.fk import run_fk
from app.services.skeleton.proportions_resolver import resolve
from app.services.skeleton.volumes import build_construction_shapes


# ---------------------------------------------------------------------------
# Shared fixture: a standard skeleton at rest pose
# ---------------------------------------------------------------------------

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
def standard_shapes():
    bone_lengths, segment_widths = resolve(STANDARD_PROPORTIONS)
    joint_positions = run_fk(JOINTS, bone_lengths)
    return build_construction_shapes(joint_positions, segment_widths)


@pytest.fixture(scope="module")
def shapes_by_id(standard_shapes):
    return {s["id"]: s for s in standard_shapes}


# ---------------------------------------------------------------------------
# Return shape
# ---------------------------------------------------------------------------

class TestReturnStructure:
    def test_returns_a_list(self, standard_shapes):
        assert isinstance(standard_shapes, list)

    def test_list_is_non_empty(self, standard_shapes):
        assert len(standard_shapes) > 0

    def test_every_shape_has_required_tags(self, standard_shapes):
        for shape in standard_shapes:
            assert "id"   in shape, f"Missing 'id' in {shape}"
            assert "part" in shape, f"Missing 'part' in {shape}"
            assert "role" in shape, f"Missing 'role' in {shape}"
            assert "type" in shape, f"Missing 'type' in {shape}"

    def test_all_roles_are_construction(self, standard_shapes):
        for shape in standard_shapes:
            assert shape["role"] == "construction", (
                f"Shape {shape['id']} has role '{shape['role']}', expected 'construction'"
            )

    def test_all_types_are_valid(self, standard_shapes):
        valid_types = {"ellipse", "line", "polyline"}
        for shape in standard_shapes:
            assert shape["type"] in valid_types, (
                f"Shape {shape['id']} has unknown type '{shape['type']}'"
            )

    def test_all_ids_are_unique(self, standard_shapes):
        ids = [s["id"] for s in standard_shapes]
        assert len(ids) == len(set(ids)), "Duplicate shape IDs found"


# ---------------------------------------------------------------------------
# Head shapes
# ---------------------------------------------------------------------------

class TestHeadShapes:
    def test_head_ball_present(self, shapes_by_id):
        assert "head-ball" in shapes_by_id

    def test_head_ball_is_ellipse(self, shapes_by_id):
        assert shapes_by_id["head-ball"]["type"] == "ellipse"

    def test_head_ball_cy_at_half_head(self, shapes_by_id):
        """Crown = y=0, so head ball center should be at y ≈ 0.5."""
        ball = shapes_by_id["head-ball"]
        assert ball["cy"] == pytest.approx(0.5, abs=0.05)

    def test_head_ball_cx_near_zero(self, shapes_by_id):
        """Head ball should be centered on the vertical axis."""
        ball = shapes_by_id["head-ball"]
        assert abs(ball["cx"]) < 0.05

    def test_face_centerline_present(self, shapes_by_id):
        assert "face-centerline" in shapes_by_id

    def test_jaw_wedge_present(self, shapes_by_id):
        assert "jaw-wedge" in shapes_by_id

    def test_cross_contours_present(self, shapes_by_id):
        for label in ("brow-line", "nose-line", "chin-line"):
            assert f"face-face-{label}" in shapes_by_id or f"face-{label}" in shapes_by_id


# ---------------------------------------------------------------------------
# Torso shapes
# ---------------------------------------------------------------------------

class TestTorsoShapes:
    def test_spine_present(self, shapes_by_id):
        assert "spine" in shapes_by_id

    def test_ribcage_present(self, shapes_by_id):
        assert "ribcage" in shapes_by_id

    def test_ribcage_is_ellipse(self, shapes_by_id):
        assert shapes_by_id["ribcage"]["type"] == "ellipse"

    def test_pelvis_present(self, shapes_by_id):
        assert "pelvis" in shapes_by_id

    def test_ribcage_rx_positive(self, shapes_by_id):
        assert shapes_by_id["ribcage"]["rx"] > 0

    def test_pelvis_cx_near_zero(self, shapes_by_id):
        """Pelvis should sit on the centerline."""
        assert abs(shapes_by_id["pelvis"]["cx"]) < 0.05


# ---------------------------------------------------------------------------
# Joint spheres
# ---------------------------------------------------------------------------

class TestJointSpheres:
    SPHERE_IDS = [
        "joint-l_shoulder", "joint-r_shoulder",
        "joint-l_elbow",    "joint-r_elbow",
        "joint-l_wrist",    "joint-r_wrist",
        "joint-l_hip",      "joint-r_hip",
        "joint-l_knee",     "joint-r_knee",
        "joint-l_ankle",    "joint-r_ankle",
    ]

    def test_all_joint_spheres_present(self, shapes_by_id):
        for sphere_id in self.SPHERE_IDS:
            assert sphere_id in shapes_by_id, f"Missing joint sphere: {sphere_id}"

    def test_all_joint_spheres_are_ellipses(self, shapes_by_id):
        for sphere_id in self.SPHERE_IDS:
            assert shapes_by_id[sphere_id]["type"] == "ellipse"

    def test_joint_spheres_rx_equals_ry(self, shapes_by_id):
        """Joint spheres are circles → rx == ry."""
        for sphere_id in self.SPHERE_IDS:
            s = shapes_by_id[sphere_id]
            assert s["rx"] == pytest.approx(s["ry"], abs=1e-6), (
                f"{sphere_id}: rx ({s['rx']}) ≠ ry ({s['ry']})"
            )


# ---------------------------------------------------------------------------
# Limb tubes
# ---------------------------------------------------------------------------

class TestLimbTubes:
    TUBE_PAIRS = [
        ("l-upper-arm", "r-upper-arm"),
        ("l-forearm",   "r-forearm"),
        ("l-thigh",     "r-thigh"),
        ("l-shin",      "r-shin"),
    ]

    def test_all_limb_centerlines_present(self, shapes_by_id):
        for l_id, r_id in self.TUBE_PAIRS:
            assert f"{l_id}-centerline" in shapes_by_id, f"Missing {l_id}-centerline"
            assert f"{r_id}-centerline" in shapes_by_id, f"Missing {r_id}-centerline"

    def test_all_limb_outlines_present(self, shapes_by_id):
        for l_id, r_id in self.TUBE_PAIRS:
            assert f"{l_id}-outline" in shapes_by_id, f"Missing {l_id}-outline"
            assert f"{r_id}-outline" in shapes_by_id, f"Missing {r_id}-outline"

    def test_limb_outlines_are_polylines(self, shapes_by_id):
        for l_id, r_id in self.TUBE_PAIRS:
            assert shapes_by_id[f"{l_id}-outline"]["type"] == "polyline"
            assert shapes_by_id[f"{r_id}-outline"]["type"] == "polyline"

    def test_limb_outlines_have_enough_points(self, shapes_by_id):
        """Each tube outline should have ≥ 4 points (four corners)."""
        for l_id, _ in self.TUBE_PAIRS:
            pts = shapes_by_id[f"{l_id}-outline"]["points"]
            assert len(pts) >= 4, f"{l_id}-outline has only {len(pts)} points"

    def test_lower_limb_below_upper_limb(self, shapes_by_id):
        """Forearm centerline should start below the upper arm end (y increases down)."""
        ua = shapes_by_id["l-upper-arm-centerline"]
        fa = shapes_by_id["l-forearm-centerline"]
        # end of upper arm (y2) ≈ start of forearm (y1)
        assert abs(ua["y2"] - fa["y1"]) < 0.1, (
            f"Upper arm y2={ua['y2']} should ≈ forearm y1={fa['y1']}"
        )


# ---------------------------------------------------------------------------
# Leg tubes
# ---------------------------------------------------------------------------

class TestLegTubes:
    def test_shin_starts_at_knee(self, shapes_by_id):
        thigh = shapes_by_id["l-thigh-centerline"]
        shin  = shapes_by_id["l-shin-centerline"]
        assert abs(thigh["y2"] - shin["y1"]) < 0.1

    def test_leg_tubes_below_torso(self, shapes_by_id):
        pelvis_cy = shapes_by_id["pelvis"]["cy"]
        hip_y     = shapes_by_id["l-thigh-centerline"]["y1"]
        assert hip_y > pelvis_cy - 0.5, "Thigh should start near pelvis level"
