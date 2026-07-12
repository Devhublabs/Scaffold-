"""
test_fk.py — Unit tests for fk.run_fk().

Pure geometry — no server, no DB, no mocks.  Run with:
    pytest tests/test_fk.py -v
"""
import math
import pytest
from app.services.skeleton.rig import JOINTS
from app.services.skeleton.fk import run_fk, _clamp


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

# Neutral bone lengths (1 hu each for most bones — easy mental arithmetic)
SIMPLE_BONE_LENGTHS = {
    "head_height":     1.0,
    "neck_length":     0.3,
    "chest_to_neck":   0.2,
    "pelvis_to_chest": 1.1,
    "upper_arm_length":1.0,
    "forearm_length":  0.9,
    "thigh_length":    1.5,
    "shin_length":     1.4,
}


# ---------------------------------------------------------------------------
# _clamp helper
# ---------------------------------------------------------------------------

class TestClamp:
    def test_value_within_limits_unchanged(self):
        assert _clamp(45.0, (0.0, 90.0)) == pytest.approx(45.0)

    def test_value_below_min_clamped_to_min(self):
        assert _clamp(-10.0, (0.0, 150.0)) == pytest.approx(0.0)

    def test_value_above_max_clamped_to_max(self):
        assert _clamp(200.0, (0.0, 150.0)) == pytest.approx(150.0)

    def test_value_at_limit_boundary_unchanged(self):
        assert _clamp(0.0, (0.0, 150.0)) == pytest.approx(0.0)
        assert _clamp(150.0, (0.0, 150.0)) == pytest.approx(150.0)


# ---------------------------------------------------------------------------
# Return structure
# ---------------------------------------------------------------------------

class TestRunFkReturnShape:
    def test_returns_dict(self):
        result = run_fk(JOINTS, SIMPLE_BONE_LENGTHS)
        assert isinstance(result, dict)

    def test_all_joint_names_present(self):
        result = run_fk(JOINTS, SIMPLE_BONE_LENGTHS)
        joint_names = {j["name"] for j in JOINTS}
        assert joint_names == set(result.keys())

    def test_all_values_are_two_tuples_of_floats(self):
        result = run_fk(JOINTS, SIMPLE_BONE_LENGTHS)
        for name, pos in result.items():
            assert isinstance(pos, tuple), f"{name} should be a tuple"
            assert len(pos) == 2, f"{name} should have 2 coordinates"
            x, y = pos
            assert isinstance(x, float), f"{name}.x should be float"
            assert isinstance(y, float), f"{name}.y should be float"


# ---------------------------------------------------------------------------
# Coordinate system and anchoring
# ---------------------------------------------------------------------------

class TestAnchorAndOrigin:
    def test_head_is_near_y_one(self):
        """
        Neck joint = base of skull, ≈ 1 head-height below crown.
        In rest pose, y increases downward, so neck.y ≈ 1.0.
        """
        result = run_fk(JOINTS, SIMPLE_BONE_LENGTHS)
        _, neck_y = result["neck"]
        assert neck_y == pytest.approx(1.0, abs=0.05)

    def test_pelvis_is_below_chest(self):
        result = run_fk(JOINTS, SIMPLE_BONE_LENGTHS)
        _, chest_y  = result["chest"]
        _, pelvis_y = result["pelvis"]
        assert pelvis_y > chest_y, "Pelvis should be below (larger y) than chest"

    def test_wrist_is_below_shoulder(self):
        result = run_fk(JOINTS, SIMPLE_BONE_LENGTHS)
        _, l_shoulder_y = result["l_shoulder"]
        _, l_wrist_y    = result["l_wrist"]
        # In rest pose arms hang down, so wrist y > shoulder y
        assert l_wrist_y >= l_shoulder_y

    def test_ankle_is_below_hip(self):
        result = run_fk(JOINTS, SIMPLE_BONE_LENGTHS)
        _, l_hip_y   = result["l_hip"]
        _, l_ankle_y = result["l_ankle"]
        assert l_ankle_y > l_hip_y

    def test_symmetry_left_right(self):
        """L and R sides should be mirror images (x sign flipped, y equal)."""
        result = run_fk(JOINTS, SIMPLE_BONE_LENGTHS)
        mirror_pairs = [
            ("l_shoulder", "r_shoulder"),
            ("l_elbow",    "r_elbow"),
            ("l_wrist",    "r_wrist"),
            ("l_hip",      "r_hip"),
            ("l_knee",     "r_knee"),
            ("l_ankle",    "r_ankle"),
        ]
        for left_name, right_name in mirror_pairs:
            lx, ly = result[left_name]
            rx, ry = result[right_name]
            assert ly == pytest.approx(ry, abs=0.01), (
                f"{left_name}.y ({ly}) ≠ {right_name}.y ({ry})"
            )
            assert lx == pytest.approx(-rx, abs=0.01), (
                f"{left_name}.x ({lx}) should mirror {right_name}.x ({rx})"
            )


# ---------------------------------------------------------------------------
# Angle overrides
# ---------------------------------------------------------------------------

class TestAngleOverrides:
    def test_none_angles_uses_rest_pose(self):
        """rest pose and explicit None should produce the same result."""
        result_none = run_fk(JOINTS, SIMPLE_BONE_LENGTHS, None)
        result_rest = run_fk(JOINTS, SIMPLE_BONE_LENGTHS, {})
        for name in result_none:
            lx, ly = result_none[name]
            rx, ry = result_rest[name]
            assert lx == pytest.approx(rx, abs=1e-9)
            assert ly == pytest.approx(ry, abs=1e-9)

    def test_unknown_joint_in_angles_is_ignored(self):
        """Extra keys in angles dict should not raise or alter valid joints."""
        result = run_fk(JOINTS, SIMPLE_BONE_LENGTHS, {"nonexistent_joint": 45.0})
        assert "head" in result   # other joints still present

    def test_angle_override_shifts_elbow(self):
        """
        If we push l_elbow to an angle, the wrist should move
        to a different position than in rest pose.
        """
        rest   = run_fk(JOINTS, SIMPLE_BONE_LENGTHS)
        custom = run_fk(JOINTS, SIMPLE_BONE_LENGTHS, {"l_elbow": 220.0})

        rest_wx,   rest_wy   = rest["l_wrist"]
        custom_wx, custom_wy = custom["l_wrist"]

        # Positions should differ
        moved = (
            abs(rest_wx - custom_wx) > 0.01 or
            abs(rest_wy - custom_wy) > 0.01
        )
        assert moved, "l_wrist should move when l_elbow angle changes"


# ---------------------------------------------------------------------------
# Anatomical clamping
# ---------------------------------------------------------------------------

class TestAnatomicalClamping:
    def test_hyperextended_elbow_is_clamped(self):
        """
        Elbows don't hyperextend (limit max is 330). A 350 request should
        produce the same position as a 330 request.
        """
        at_limit  = run_fk(JOINTS, SIMPLE_BONE_LENGTHS, {"l_elbow": 330.0})
        beyond    = run_fk(JOINTS, SIMPLE_BONE_LENGTHS, {"l_elbow": 350.0})

        lx, ly = at_limit["l_wrist"]
        bx, by = beyond["l_wrist"]
        assert lx == pytest.approx(bx, abs=0.01)
        assert ly == pytest.approx(by, abs=0.01)

    def test_below_min_angle_is_clamped(self):
        """An angle below the minimum limit (180) should clamp to min."""
        at_min   = run_fk(JOINTS, SIMPLE_BONE_LENGTHS, {"l_elbow": 180.0})
        below_min = run_fk(JOINTS, SIMPLE_BONE_LENGTHS, {"l_elbow": 150.0})

        lx, ly = at_min["l_wrist"]
        bx, by = below_min["l_wrist"]
        assert lx == pytest.approx(bx, abs=0.01)
        assert ly == pytest.approx(by, abs=0.01)

