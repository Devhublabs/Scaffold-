"""
test_proportions_resolver.py — Unit tests for proportions_resolver.resolve().

Pure logic — no server, no network, no DB.  Run anywhere:
    pytest tests/test_proportions_resolver.py -v
"""
import pytest
from app.services.skeleton.proportions_resolver import resolve, _DEFAULTS


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

FULL_PROPORTIONS = {
    "headHeightCm":     23.0,
    "totalHeightCm":    170.0,
    "shoulderWidthCm":  46.0,   # 2 hu when headHeightCm=23
    "chestWidthCm":     42.0,
    "waistWidthCm":     30.0,
    "hipWidthCm":       40.0,
    "upperArmLengthCm": 32.0,
    "forearmLengthCm":  27.0,
    "thighLengthCm":    40.0,
    "shinLengthCm":     38.0,
    "neckLengthCm":     10.0,
    "torsoLengthCm":    28.0,
}


# ---------------------------------------------------------------------------
# Basic resolution tests
# ---------------------------------------------------------------------------

class TestResolveReturnShape:
    def test_returns_two_dicts(self):
        bone_lengths, segment_widths = resolve({})
        assert isinstance(bone_lengths, dict)
        assert isinstance(segment_widths, dict)

    def test_bone_lengths_has_all_required_keys(self):
        bone_lengths, _ = resolve({})
        required = {
            "head_height", "neck_length", "chest_to_neck",
            "pelvis_to_chest", "upper_arm_length", "forearm_length",
            "thigh_length", "shin_length",
        }
        assert required.issubset(bone_lengths.keys())

    def test_segment_widths_has_all_required_keys(self):
        _, segment_widths = resolve({})
        required = {
            "ribcage", "pelvis", "neck",
            "upper_arm", "forearm", "thigh", "shin", "shoulder_hw",
        }
        assert required.issubset(segment_widths.keys())

    def test_segment_widths_are_tuples_of_two_floats(self):
        _, segment_widths = resolve(FULL_PROPORTIONS)
        for key, val in segment_widths.items():
            assert isinstance(val, tuple), f"{key} should be a tuple"
            assert len(val) == 2, f"{key} tuple should have 2 elements"
            assert all(isinstance(v, float) for v in val), f"{key} values should be floats"


class TestDefaultFallback:
    """Empty proportions dict → exact neutral-figure defaults."""

    def test_head_height_is_always_one(self):
        bone_lengths, _ = resolve({})
        assert bone_lengths["head_height"] == 1.0

    def test_empty_proportions_use_defaults(self):
        bone_lengths, _ = resolve({})
        assert bone_lengths["neck_length"]     == pytest.approx(_DEFAULTS["neck_length"])
        assert bone_lengths["pelvis_to_chest"] == pytest.approx(_DEFAULTS["pelvis_to_chest"])
        assert bone_lengths["upper_arm_length"]== pytest.approx(_DEFAULTS["upper_arm_length"])
        assert bone_lengths["forearm_length"]  == pytest.approx(_DEFAULTS["forearm_length"])
        assert bone_lengths["thigh_length"]    == pytest.approx(_DEFAULTS["thigh_length"])
        assert bone_lengths["shin_length"]     == pytest.approx(_DEFAULTS["shin_length"])

    def test_all_bone_lengths_positive(self):
        bone_lengths, _ = resolve({})
        for key, val in bone_lengths.items():
            assert val > 0, f"{key} must be positive, got {val}"

    def test_all_segment_widths_positive(self):
        _, segment_widths = resolve({})
        for key, (pw, dw) in segment_widths.items():
            assert pw > 0, f"{key} proximal width must be positive"
            assert dw > 0, f"{key} distal width must be positive"

    def test_proximal_width_gte_distal_width_for_limbs(self):
        """Limbs should always be fatter at the proximal end."""
        _, segment_widths = resolve({})
        for key in ("upper_arm", "forearm", "thigh", "shin"):
            pw, dw = segment_widths[key]
            assert pw >= dw, f"{key}: proximal ({pw}) should be >= distal ({dw})"


class TestCmConversion:
    """Full proportions dict → correct head-unit conversion."""

    def test_upper_arm_length_converts_correctly(self):
        # 32 cm / 23 cm per head ≈ 1.391 hu
        bone_lengths, _ = resolve(FULL_PROPORTIONS)
        expected = 32.0 / 23.0
        assert bone_lengths["upper_arm_length"] == pytest.approx(expected, rel=1e-3)

    def test_neck_length_converts_correctly(self):
        bone_lengths, _ = resolve(FULL_PROPORTIONS)
        expected = 10.0 / 23.0
        assert bone_lengths["neck_length"] == pytest.approx(expected, rel=1e-3)

    def test_torso_length_maps_to_pelvis_to_chest(self):
        bone_lengths, _ = resolve(FULL_PROPORTIONS)
        expected = 28.0 / 23.0
        assert bone_lengths["pelvis_to_chest"] == pytest.approx(expected, rel=1e-3)

    def test_shoulder_hw_is_half_shoulder_width_in_hu(self):
        _, segment_widths = resolve(FULL_PROPORTIONS)
        # shoulderWidthCm=46, headHeightCm=23 → 2.0 hu total → 1.0 hu half
        shoulder_hw, _ = segment_widths["shoulder_hw"]
        assert shoulder_hw == pytest.approx(1.0, rel=1e-3)

    def test_head_height_always_one_regardless_of_input(self):
        """head_height is always 1.0 — it's the basis of head-units."""
        bone_lengths, _ = resolve(FULL_PROPORTIONS)
        assert bone_lengths["head_height"] == 1.0

    def test_zero_head_height_falls_back_to_defaults(self):
        """If headHeightCm is 0, we can't divide — must fall back gracefully."""
        proportions = {"headHeightCm": 0.0, "upperArmLengthCm": 32.0}
        bone_lengths, _ = resolve(proportions)
        assert bone_lengths["upper_arm_length"] == pytest.approx(_DEFAULTS["upper_arm_length"])


class TestPartialProportions:
    """Partial dict: some fields present, others default."""

    def test_partial_proportions_only_overrides_present_fields(self):
        proportions = {"headHeightCm": 23.0, "upperArmLengthCm": 32.0}
        bone_lengths, _ = resolve(proportions)
        # upper_arm_length comes from proportions
        assert bone_lengths["upper_arm_length"] == pytest.approx(32.0 / 23.0, rel=1e-3)
        # shin_length was not provided — falls back to default
        assert bone_lengths["shin_length"] == pytest.approx(_DEFAULTS["shin_length"])
