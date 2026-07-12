"""
test_co_artist_skeleton_api.py — Integration/unit tests for the Co-Artist REST API.

Run with:
    pytest tests/test_co_artist_skeleton_api.py -v
"""
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

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

class TestCoArtistSkeletonApi:
    def test_post_skeleton_success(self):
        response = client.post(
            "/api/co-artist/skeleton",
            json={
                "proportions": STANDARD_PROPORTIONS,
                "characterId": "char_99",
                "angles": None
            }
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["characterId"] == "char_99"
        assert payload["space"] == "head-units"
        assert len(payload["shapes"]) > 0

    def test_post_skeleton_with_angles_success(self):
        response = client.post(
            "/api/co-artist/skeleton",
            json={
                "proportions": STANDARD_PROPORTIONS,
                "characterId": "char_99",
                "angles": {"l_elbow": 220.0}
            }
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["pose"] == "custom"

    def test_post_skeleton_missing_character_id_error(self):
        response = client.post(
            "/api/co-artist/skeleton",
            json={
                "proportions": STANDARD_PROPORTIONS,
                # "characterId" missing
            }
        )
        assert response.status_code == 422

    def test_post_skeleton_missing_proportions_error(self):
        response = client.post(
            "/api/co-artist/skeleton",
            json={
                "characterId": "char_99",
                # "proportions" missing
            }
        )
        assert response.status_code == 422
