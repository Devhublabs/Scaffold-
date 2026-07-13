# Co-Artist — Mode 1 (Skeleton & Construction Guide) — Implementation Plan

> **Status:** ✅ Complete (2026-07-12). All three phases shipped on `feat/co-artist-skeleton`; 97 tests green (92 unit + 5 integration).
> This document is the source of truth for building Mode 1.
> **Branch:** `feat/co-artist-skeleton` (off `main`).
> **Owner:** Co-Artist backend (+ frontend Co-Artist canvas, handled without Obi).

---

## 0. Context — the bigger picture (why Mode 1 exists)

Co-Artist is **three modes** that all emit the **same output contract** (`co_artist_shapes`)
so the canvas doesn't care which mode produced the shapes:

- **Mode 1 — Scaffold (THIS DOC):** skeleton + construction guides. Pure deterministic geometry.
- **Mode 2 — Component Assist:** pre-built SVG templates (eyes, hair, clothing) the user personalizes.
- **Mode 3 — Smart Assist:** canvas watches drawing, *offers* snap/fill/template suggestions.

Guiding philosophy: **handle the groundwork, hand back the pencil.** Co-Artist *offers*, never forces.

**Build order:** Mode 1 → Mode 2 → Mode 3. Mode 1 is the foundation everything sits on and
is the piece that *validates* the proportions schema the AI already produces.

### How Mode 1 relates to the existing AI piece
The Groq-backed `extract_proportions()` (`app/services/co_artist_service.py`) already does the
**fuzzy** part: `description → proportions JSON`. **Mode 1 is the deterministic part:**
`proportions JSON → joint positions → construction shapes`. **Mode 1 calls no AI.** Same input
always yields same output → fully unit-testable with exact assertions.

---

## 1. Locked design decisions

| Decision | Choice | Rationale |
|---|---|---|
| Coordinate space | **head-units** (1 unit = 1 head height), origin at **crown**, x=0 centerline, y down | Backend stays resolution-agnostic; frontend scales to pixels |
| Who converts to pixels | **Frontend** (`pixelsPerHead` × unit + canvas anchor) | Matches Fabric/canvas; resize/zoom never round-trips to Python |
| Rig | **Full hierarchy incl. legs**, angle-aware from day one | Scalable + standard; poses become "change the numbers," not a rewrite |
| Volume priority | **Upper-body volumes first**, legs as cheap extension once FK exists | Most manga panels are upper-body; FK makes legs trivial to add |
| Head style | **Loomis** ball + jaw wedge + cross-contours | Standard for anime/manga faces |
| Torso style | **Ellipse beans in v1**, curved-polyline beans = Phase 2 | Valid Loomis, simplest, exact-testable |
| Limbs | **Tapered tubes** via per-segment width profile | Constant-width = robotic; taper = reads as a limb |
| AI in Mode 1 | **None** | Deterministic geometry only |
| Shape roles | `construction` (draw-over, discard) vs `contour` (traceable edge) | Enables the "trace the edges" feature cleanly |

---

## 2. The `co_artist_shapes` output contract (defined fresh — no existing frontend format to match)

The frontend currently has **no** shape/socket format (only 4 minimal files, no socket client),
so we define this contract here. All future modes emit the same envelope.

```jsonc
{
  "characterId": "abc123",        // memory thread — every shape belongs to a character
  "space": "head-units",          // coordinate space (never pixels from backend)
  "anchor": "crown-center",       // origin meaning: (0,0) = top-center of the head
  "pose": "rest",                 // which pose produced these angles (v1: always "rest")
  "shapes": [
    // --- CONSTRUCTION (draw-over-and-discard) ---
    { "id": "head-ball", "part": "head", "role": "construction",
      "type": "ellipse", "cx": 0, "cy": 0.5, "rx": 0.35, "ry": 0.5, "rotation": 0 },

    { "id": "face-centerline", "part": "head", "role": "construction",
      "type": "polyline", "points": [[0,0.05],[0,0.95]] },

    { "id": "spine", "part": "spine", "role": "construction",
      "type": "line", "x1": 0, "y1": 1.0, "x2": 0, "y2": 3.5 },

    { "id": "ribcage", "part": "ribcage", "role": "construction",
      "type": "ellipse", "cx": 0, "cy": 1.8, "rx": 0.9, "ry": 0.8, "rotation": 0 },

    { "id": "joint-l_elbow", "part": "l_elbow", "role": "construction",
      "type": "ellipse", "cx": -1.4, "cy": 2.2, "rx": 0.08, "ry": 0.08, "rotation": 0 },

    // --- CONTOUR (the traceable body edge — Phase 2) ---
    { "id": "body-contour", "part": "silhouette", "role": "contour",
      "type": "path", "closed": true, "points": [[x,y], ...] }
  ]
}
```

### Primitive `type`s (only 4, all trivially canvas-renderable)
- `ellipse` — `{cx, cy, rx, ry, rotation}` (circles are ellipses with rx==ry)
- `line` — `{x1, y1, x2, y2}`
- `polyline` — `{points: [[x,y],...], closed?: bool}`
- `path` — `{points: [[x,y],...], closed: bool}` (used for contours / bean curves)

### Required tags on every shape
- `id` — unique within payload
- `part` — semantic joint/segment name (see rig); lets frontend + future pose code address shapes
- `role` — `"construction"` | `"contour"`

---

## 3. The rig (fixed hierarchy — joint names are a stable contract)

Fixed names so **every future pose is portable across characters**. Root = pelvis.

```
pelvis (root)
├── spine ──▶ chest ──▶ neck ──▶ head
│              ├── l_shoulder ──▶ l_elbow ──▶ l_wrist
│              └── r_shoulder ──▶ r_elbow ──▶ r_wrist
├── l_hip ──▶ l_knee ──▶ l_ankle
└── r_hip ──▶ r_knee ──▶ r_ankle
```

Each joint definition carries:
```python
{
  "name": "l_elbow",
  "parent": "l_shoulder",
  "bone_length_field": "armLengthInHeads",  # or a fraction of it
  "rest_angle": 90.0,      # degrees, relative to parent bone direction
  "limits": (0.0, 150.0),  # (min, max) degrees — anatomical clamp; elbows don't hyperextend
}
```

**Angles are always clamped to `limits` before FK runs.** This is the structural fix for
"broken arm" AI poses: any out-of-range angle (from a pose, an adjustment, or a stray value)
becomes ugly-but-valid, never impossible.

---

## 4. Pipeline (all pure functions, deterministic, zero AI)

```
proportions (from extract_proportions or a test fixture)
  │
  ▼  proportions_resolver.py
bone lengths + segment widths (in head-units)
  │
  ▼  rig.py (hierarchy + rest angles + limits)
rig with rest pose
  │
  ▼  fk.py  — 2D forward kinematics (flat trig)
      child_pos = parent_pos + bone_length * (cos θ_acc, sin θ_acc)
      θ_acc accumulates down the chain; every angle clamped to limits
joint positions {name: (x, y)}
  │
  ▼  volumes.py
construction shapes (head ball+jaw, cross-contours, ribcage/pelvis ellipses,
                     tapered limb tubes, joint spheres, spine/centerlines)
  │
  ▼  silhouette.py  (PHASE 2)
contour shapes (offset-and-smooth body outline — port of PressureBrush._buildOutlinePath)
  │
  ▼  skeleton_service.py
co_artist_shapes payload
```

### 2D FK detail (the "scary" part is ~30 lines)
- Pure flat trig. No 3D, no quaternions, no rotation order.
- Walk hierarchy from root; each joint world-position from parent + bone vector at accumulated angle.
- v1 uses `rest_angle` for every joint (a neutral standing rest pose). Posing later = pass an
  `angles` override dict; FK is identical.

### Silhouette detail (Phase 2 — the "trace the edges" enabler)
- Port the normal-offset trick from `frontend/src/canvas/brushes/PressureBrush.js` →
  `_buildOutlinePath` (offset centerline points ±half-width along the normal, walk edges to a
  closed path).
- Each limb = tapered tube (width profile fat→thin). Torso = ribcage/pelvis blended.
- **v1 does NOT merge overlapping contours** (arm-into-chest internal lines are acceptable for a
  trace guide). Boolean-union is a later polish upgrade, explicitly deferred.

---

## 5. File structure (backend)

```
backend-python/app/services/
├── skeleton_service.py            # PUBLIC: build_skeleton(proportions, character_id, angles=None)
└── skeleton/
    ├── __init__.py
    ├── rig.py                     # fixed hierarchy, joint defs, rest angles, limits
    ├── proportions_resolver.py    # proportions dict -> bone lengths + widths (head-units)
    ├── fk.py                      # 2D forward kinematics + angle clamping
    ├── volumes.py                 # joint positions -> construction shapes
    └── silhouette.py              # (PHASE 2) width profiles + offset/smooth -> contour shapes

backend-python/app/api/
└── co_artist.py                   # ADD: POST /api/co-artist/skeleton

backend-python/app/sockets/
└── events.py                      # ADD: co_artist_shapes broadcast event (mirror stroke pattern)

backend-python/tests/
├── test_proportions_resolver.py   # exact bone lengths/widths from known proportions
├── test_fk.py                     # exact joint coords for known angles; clamping behavior
├── test_volumes.py                # shape counts, roles, parts, ellipse params
├── test_skeleton_service.py       # end-to-end payload shape/tagging
├── test_silhouette.py             # (PHASE 2) contour closed, point counts, symmetry
└── test_co_artist_skeleton_api.py # (PHASE 3) route returns valid co_artist_shapes
```

Public entry point signature:
```python
def build_skeleton(proportions: dict, character_id: str, angles: dict | None = None) -> dict:
    """Return a co_artist_shapes payload (head-units). angles=None -> rest pose.
    Pure & deterministic — no I/O, no AI, no network."""
```

---

## 6. API + socket wiring (Phase 3)

**REST** (`app/api/co_artist.py`, existing router, prefix `/api`):
```python
class SkeletonRequest(BaseModel):
    proportions: dict
    characterId: str
    angles: dict | None = None

@router.post("/co-artist/skeleton")
async def get_skeleton(body: SkeletonRequest):
    return build_skeleton(body.proportions, body.characterId, body.angles)
```

**Socket** (`app/sockets/events.py`) — mirror the existing `stroke` handler pattern:
```python
@sio.event
async def co_artist_shapes(sid, data):
    room_id = data.get("roomId"); user_id = data.get("userId")
    if not room_id or not user_id: return
    # (optional) persist per characterId later
    await sio.emit("co_artist_shapes", data["payload"], room=room_id, skip_sid=sid)
```
> Broadcast so collaborators see the guide. Persistence of guides per `characterId` is a later step
> (ties into Mode 1's "memory" — skeleton proportions + placed templates + edits).

---

## 7. Test strategy

- **Phases 1–2 = pure geometry → exact-value unit tests.** No server, no DB, no mocks, no aiohttp.
  A known `proportions` fixture yields known joint coordinates, shape counts, roles, and parts.
  Fast and non-flaky. Run with `pytest -m "not integration"`.
- **Phase 3 = one socket integration test** using the hardened `wait_until` fixture in
  `conftest.py` (event-driven, not sleep-based).
- Reuse existing conventions: `pytest.ini` (pythonpath, asyncio auto, `integration` marker),
  `requirements-dev.txt` (pytest, pytest-asyncio, aiohttp — not in the server image).
- **Run tests inside the container:** `docker compose exec -T backend-python sh -c "pip install -q pytest pytest-asyncio aiohttp; python -m pytest -q"` (deps are ephemeral; re-install after any container recreate).

---

## 8. Explicitly OUT of scope for Mode 1

- Pose library / pose application (future: curated angle-sets applied to this rig).
- Reference import / pose-estimation (future phase 2 of posing).
- Frontend rendering, joint-drag interaction, draw-over, trace-commit (our lane, separate task).
- Boolean-union of overlapping contours (polish upgrade).
- Detailed hands/feet (guide ends limbs in mitten/wedge by design).
- Mode 2 & Mode 3.

---

## 9. Known risks / watch-items

1. **Torso curve is the hard primitive.** Ellipse beans in v1 sidestep it; the curved-polyline
   bean (Phase 2) is where "human vs peanut" is won — budget iteration there.
2. **Proportions schema may need 1–2 new fields** once a real skeleton renders (e.g. an explicit
   head-center/anchor, spine-curve param). Expect to tweak `SYSTEM_PROMPT` in
   `co_artist_service.py` **once** after first render. Treat Mode 1 as the schema's validator.
3. **head-units origin must be consistent** everywhere (crown, y-down). A single wrong sign
   flips the figure. Pin it in `fk.py` and assert in tests.
4. **Contour overlaps** produce internal lines in v1 (accepted). Don't block on the union.

---

## 10. Progress Checklist (update as you go — resume point if interrupted)

### Phase 1 — Rig + FK + construction shapes (no AI, no I/O)
- [x] Create branch `feat/co-artist-skeleton` off `main`
- [x] `app/services/skeleton/__init__.py`
- [x] `rig.py` — hierarchy, joint defs, rest angles, limits
- [x] `proportions_resolver.py` — proportions → lengths/widths
- [x] `fk.py` — 2D FK + clamping
- [x] `volumes.py` — construction shapes (upper-body first: head, ribcage/pelvis ellipses, arms, spine, cross-contours, joint spheres; then legs)
- [x] `skeleton_service.py` — `build_skeleton(...)` assembles `co_artist_shapes`
- [x] tests: `test_proportions_resolver.py`, `test_fk.py`, `test_volumes.py`, `test_skeleton_service.py`
- [x] All Phase 1 unit tests green (`pytest -m "not integration"`)

### Phase 2 — Contour silhouette (traceable edges)
- [x] `silhouette.py` — width profiles + offset/smooth (port `_buildOutlinePath`)
- [x] `build_skeleton` emits `role: "contour"` shapes
- [x] `test_silhouette.py` green

### Phase 3 — Wiring
- [x] `POST /api/co-artist/skeleton` route
- [x] `co_artist_shapes` socket broadcast event
- [x] `test_co_artist_skeleton_api.py` + one socket integration test green
- [x] Full suite green; commit

### Notes / deviations (append discoveries here)
- **2026-07-12:** Mode 1 complete on `feat/co-artist-skeleton`. Full suite green in-container:
  `92 passed, 5 deselected` (unit) and `97 passed` (full). Committed as `bf50fb8`.
- Known non-blocking warning: `StarletteDeprecationWarning` — `httpx` with `starlette.testclient`
  is deprecated (affects `test_co_artist_skeleton_api.py`'s `TestClient`). No action needed yet.
```
