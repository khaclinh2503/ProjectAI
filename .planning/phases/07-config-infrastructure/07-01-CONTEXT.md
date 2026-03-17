# Phase 7 — Config Infrastructure: Context

**Phase goal:** Flower types và spawn parameters trở thành data-driven — load từ JSON tại startup với validated schema, cho phép balance tuning mà không cần recompile.

**Requirements:** CFG-01, CFG-02, CFG-03
**Date:** 2026-03-17

---

## Decision 1: Config Scope

**What moves to JSON:**
- `FLOWER_CONFIGS` (5 flower types × 10 fields) → `flowers.json` — covers CFG-01
- `PHASE_CONFIGS` (3 spawn phases + weights) → `flowers.json` — covers CFG-02
- `SESSION_DURATION_MS` + `WRONG_TAP_PENALTY` → `settings.json` — covers CFG-03 scope extension

**What stays hardcoded (deferred):**
- ComboSystem step thresholds (1.0 → 0.5 → 0.25 → 0.125) → defer to Phase 11
- Special flower fields → Phase 10 extends schema; Phase 7 schema stays minimal for 5 base types

**Why:** Designer needs to tune game feel (session length, penalty, flower timing) without recompile. ComboSystem is a separate concern belonging to Phase 11 refactor.

---

## Decision 2: Error UX When JSON Parse Fails

**Behavior:**
- Parse failure → **hard stop** — game does not start
- Error detected at **Boot screen**, before GameScene loads
- Error **popup overlay** on Boot screen with generic message:
  > "Game config lỗi. Vui lòng reload."
- Popup has **Reload button** → `assetManager.releaseAll()` + `director.loadScene('Boot')`

**What the message does NOT show:** field-level error details (too technical for end users)

**Why:** Silent NaN corruption is worse than a hard stop. Generic message avoids exposing internal schema details. Reload from Boot ensures fresh parse attempt.

---

## Decision 3: JSON File Structure

**File locations:**
```
assets/resources/config/flowers.json
assets/resources/config/settings.json
```

Loaded via Cocos Creator `resources.load()` at Boot.

**`flowers.json` structure — flowers keyed by id, spawnPhases as array:**
```json
{
  "flowers": {
    "CHERRY": {
      "cycleDurationMs": 3000,
      "budMs": 1350,
      "tapWindowMs": 900,
      "bloomingMs": 600,
      "fullBloomMs": 300,
      "wiltingMs": 450,
      "deadMs": 300,
      "scoreBloom": 80,
      "scoreFull": 120
    },
    "LOTUS": { ... },
    "CHRYSANTHEMUM": { ... },
    "ROSE": { ... },
    "SUNFLOWER": { ... }
  },
  "spawnPhases": [
    {
      "startMs": 0,
      "endMs": 40000,
      "intervalMs": 3000,
      "maxAlive": 8,
      "weights": {
        "SUNFLOWER": 35, "ROSE": 30, "CHRYSANTHEMUM": 20, "LOTUS": 10, "CHERRY": 5
      }
    },
    {
      "startMs": 40000,
      "endMs": 80000,
      "intervalMs": 2000,
      "maxAlive": 16,
      "weights": {
        "SUNFLOWER": 15, "ROSE": 20, "CHRYSANTHEMUM": 30, "LOTUS": 20, "CHERRY": 15
      }
    },
    {
      "startMs": 80000,
      "endMs": 120000,
      "intervalMs": 1000,
      "maxAlive": 28,
      "weights": {
        "SUNFLOWER": 5, "ROSE": 10, "CHRYSANTHEMUM": 20, "LOTUS": 30, "CHERRY": 35
      }
    }
  ]
}
```

> **User-confirmed override (2026-03-17):** `endMs` values are `40000/80000/120000` (not `39999/79999/119999`). SpawnManager uses strict `<` comparison (`elapsedMs < config.endMs`), so `endMs: 40000` means the phase covers `[startMs, 40000)` — i.e., 0ms to 39999ms inclusive. The round values are correct.

**`settings.json` structure — nested by concern:**
```json
{
  "session": {
    "durationMs": 120000
  },
  "scoring": {
    "wrongTapPenalty": 10
  }
}
```

---

## Decision 4: Test Migration Strategy

**Approach: re-export constants from parsed result**
- `parseGameConfig()` returns typed object → `FlowerTypes.ts` re-exports `FLOWER_CONFIGS` and `PHASE_CONFIGS` derived from it
- All 150 existing tests continue to pass with **zero changes**
- New tests added specifically for `parseGameConfig()` valid and invalid inputs

**`parseGameConfig()` contract:**
- **Signature:** `parseGameConfig(flowersData: unknown, settingsData: unknown): GameConfig`
- **Returns:**
  ```typescript
  {
    flowers: Record<FlowerTypeId, FlowerTypeConfig>,
    spawnPhases: SpawnPhaseConfig[],
    settings: {
      session: { durationMs: number },
      scoring: { wrongTapPenalty: number }
    }
  }
  ```
- **Pure function** — no side effects, no global state mutation
- **On failure:** throws `Error` with message describing what is wrong

> **User-confirmed override (2026-03-17):** Signature is `parseGameConfig(flowersData: unknown, settingsData: unknown): GameConfig` — accepts already-parsed objects (not JSON strings). This avoids the JSON.stringify roundtrip when called from BootController with `JsonAsset.json` which is already a parsed object.

**Validation rules (type + presence + range):**
- All fields must be present (no missing keys)
- All numeric fields must be `typeof === 'number'` and not `NaN`
- `cycleDurationMs`, `budMs`, `tapWindowMs`, `bloomingMs`, `fullBloomMs`, `wiltingMs`, `deadMs` → must be `> 0`
- `scoreBloom`, `scoreFull` → must be `> 0`
- `intervalMs`, `maxAlive` → must be `> 0`
- `weights` values → must be `>= 0` (zero allowed to exclude a type from a phase)
- `session.durationMs` → must be `> 0`
- `scoring.wrongTapPenalty` → must be `>= 0`

---

## Code Context

**Files to create:**
- `BloomTap/assets/scripts/logic/GameConfig.ts` — `parseGameConfig()` pure function + `GameConfig` type
- `BloomTap/assets/resources/config/flowers.json` — migrated from `FLOWER_CONFIGS` + `PHASE_CONFIGS`
- `BloomTap/assets/resources/config/settings.json` — migrated from `GameState.ts` constants
- `BloomTap/assets/scripts/logic/GameConfig.test.ts` — tests for `parseGameConfig()` valid + invalid

**Files to modify:**
- `BloomTap/assets/scripts/logic/FlowerTypes.ts` — remove hardcoded `FLOWER_CONFIGS`, re-export from parsed result
- `BloomTap/assets/scripts/logic/SpawnManager.ts` — remove hardcoded `PHASE_CONFIGS`, re-export from parsed result
- `BloomTap/assets/scripts/logic/GameState.ts` — remove `SESSION_DURATION_MS`, `WRONG_TAP_PENALTY` constants; accept from config
- `BloomTap/assets/scripts/BootController.ts` — load JSON via `resources.load()`, call `parseGameConfig()`, show error popup on failure

**Files unchanged (already accept config via injection):**
- `BloomTap/assets/scripts/logic/FlowerFSM.ts` — already accepts `FlowerTypeConfig` in constructor
- `BloomTap/assets/scripts/logic/Grid.ts` — already accepts `FlowerTypeConfig` in `spawnFlower()`
- `BloomTap/assets/scripts/GameController.ts` — will receive parsed config from BootController

---

## Deferred Ideas

- ComboSystem config (multiplier steps, step thresholds) → Phase 11
- Special flower config fields (spawn rate, effect duration) → Phase 10 extends schema
