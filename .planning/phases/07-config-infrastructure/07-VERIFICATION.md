---
phase: 07-config-infrastructure
verified: 2026-03-21T13:47:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
human_verification:
  - test: "Run game in Cocos Editor with modified flowers.json and confirm changed values take effect in-game"
    expected: "Changing cycleDurationMs in flowers.json and pressing Play shows the altered flower timing without recompile"
    why_human: "Cannot execute Cocos Editor runtime from CLI; gameplay timing behavior requires visual confirmation"
  - test: "Corrupt flowers.json (remove 'flowers' key) and press Play in Cocos Editor"
    expected: "Error overlay appears; Reload button dismisses it and reloads correctly"
    why_human: "UI overlay activation and button wiring can only be confirmed in the Cocos Editor runtime with Inspector binding present"
---

# Phase 7: Config Infrastructure Verification Report

**Phase Goal:** Flower types and spawn parameters are data-driven — loaded from JSON at startup with validated schema, enabling balance tuning without recompile
**Verified:** 2026-03-21T13:47:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Designer can change a flower's cycle speed or base score in JSON and see it reflected without recompile | ? HUMAN | JSON drives FLOWER_CONFIGS via initFlowerConfigs(); BootController wires this at boot. Runtime confirmation requires Cocos Editor. SUMMARY documents human-verify checkpoint passed. |
| 2 | Designer can change spawn parameters (initial count, max alive per phase, interval per phase) in JSON | ? HUMAN | flowers.json contains all spawnPhase fields; initPhaseConfigs() replaces PHASE_CONFIGS at boot. Runtime confirmation requires Cocos Editor. |
| 3 | Malformed or missing JSON field causes a clear error message at startup — no silent NaN corruption | ✓ VERIFIED | parseGameConfig() throws descriptive [GameConfig]-prefixed errors for missing fields, NaN, type errors, and out-of-range values. BootController catches all exceptions and activates errorOverlay. 19 error-path tests pass. |
| 4 | All 150+ existing tests continue to pass; new Vitest tests cover GameConfig.parse() valid and invalid inputs | ✓ VERIFIED | `npx vitest run` exits 0: 171 tests across 10 test files. 19 new GameConfig tests cover valid parse, all invalid categories. Zero regressions. |

**Automated score:** 2/4 truths fully verified programmatically. 2/4 require human (Cocos Editor runtime). Automated evidence strongly supports the human-needed items — all code wiring is correct.

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `BloomTap/assets/scripts/logic/GameConfig.ts` | parseGameConfig() + GameConfig type + validation helpers | ✓ VERIFIED | 189 lines. Exports `parseGameConfig`, `GameConfig`. Contains `requirePositiveNumber`, `requireNonNegativeNumber`, `isRecord` helpers. Zero `cc` imports. |
| `BloomTap/assets/scripts/logic/GameConfig.test.ts` | Vitest tests for valid parse, invalid inputs, range violations | ✓ VERIFIED | 217 lines, 19 `it(` test cases. Imports `parseGameConfig` from `./GameConfig`. All 19 pass. |
| `BloomTap/assets/resources/config/flowers.json` | 5 flower types + 3 spawn phases | ✓ VERIFIED | Contains all 5 types (CHERRY, LOTUS, CHRYSANTHEMUM, ROSE, SUNFLOWER). 3 spawnPhases with endMs 40000/80000/120000. spawnBatch field added by post-plan fix commit. |
| `BloomTap/assets/resources/config/settings.json` | session.durationMs + scoring.wrongTapPenalty | ✓ VERIFIED | `"durationMs": 120000`, `"wrongTapPenalty": 10`. Exact match. |

### Plan 02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `BloomTap/assets/scripts/logic/FlowerTypes.ts` | initFlowerConfigs() + FLOWER_CONFIGS hardcoded defaults | ✓ VERIFIED | Exports `initFlowerConfigs()`. FLOWER_CONFIGS is `export const` with all 5 hardcoded types. Mutation loop uses `Object.keys`. |
| `BloomTap/assets/scripts/logic/SpawnManager.ts` | initPhaseConfigs() + let PHASE_CONFIGS | ✓ VERIFIED | `let PHASE_CONFIGS` with 3 hardcoded phases. Exports `initPhaseConfigs()` which reassigns the let. `spawnBatch` field present. |
| `BloomTap/assets/scripts/logic/GameState.ts` | initGameSettings() + let WRONG_TAP_PENALTY + let SESSION_DURATION_MS | ✓ VERIFIED | Both constants are `export let`. `initGameSettings()` sets both. Hardcoded defaults 10 and 120_000 intact. |
| `BloomTap/assets/scripts/BootController.ts` | JSON loading + parseGameConfig call + init calls + error popup | ✓ VERIFIED | 53 lines. Full rewrite from 9-line stub. All 4 imports and all 4 init calls present. resources.load path has no extension. |

---

## Key Link Verification

### Plan 01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `GameConfig.test.ts` | `GameConfig.ts` | `import { parseGameConfig }` | ✓ WIRED | Line 2: `import { parseGameConfig } from './GameConfig';` |
| `GameConfig.ts` | `FlowerTypes.ts` | `import FlowerTypeId, FlowerTypeConfig types` | ✓ WIRED | Line 2: `import { FlowerTypeId, FlowerTypeConfig } from './FlowerTypes';` |

### Plan 02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `BootController.ts` | `GameConfig.ts` | `import { parseGameConfig }` | ✓ WIRED | Line 2: `import { parseGameConfig } from './logic/GameConfig';` Used at line 31: `parseGameConfig(flowersAsset.json, settingsAsset.json)` |
| `BootController.ts` | `FlowerTypes.ts` | `initFlowerConfigs` | ✓ WIRED | Line 3: `import { initFlowerConfigs } from './logic/FlowerTypes';` Called at line 32: `initFlowerConfigs(cfg.flowers)` |
| `BootController.ts` | `SpawnManager.ts` | `initPhaseConfigs` | ✓ WIRED | Line 4: `import { initPhaseConfigs } from './logic/SpawnManager';` Called at line 33: `initPhaseConfigs(cfg.spawnPhases)` |
| `BootController.ts` | `GameState.ts` | `initGameSettings` | ✓ WIRED | Line 5: `import { initGameSettings } from './logic/GameState';` Called at line 34: `initGameSettings(cfg.settings)` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CFG-01 | 07-01, 07-02 | Designer can edit flower types (cycle speed, base score, name) via JSON without recompile | ✓ SATISFIED | flowers.json contains all 5 types with tunable fields. initFlowerConfigs() overrides FLOWER_CONFIGS at boot. parseGameConfig() validates all flower fields. BootController loads and applies at startup. |
| CFG-02 | 07-01, 07-02 | Designer can edit spawn parameters (initialCount, maxAlive per phase, spawn interval per phase) via JSON | ✓ SATISFIED | flowers.json spawnPhases array has intervalMs, maxAlive, spawnBatch per phase. initPhaseConfigs() replaces PHASE_CONFIGS. SpawnManager.getPhaseConfig() and pickFlowerType() use the overridden array. |
| CFG-03 | 07-01, 07-02 | Game shows clear error when config JSON is wrong format — no silent crash | ✓ SATISFIED | parseGameConfig() throws descriptive [GameConfig] errors for every invalid condition. BootController wraps in try/catch and activates errorOverlay on any failure (load error or parse error). _onReload() uses assetManager.releaseAll() + director.loadScene('Boot'). |

No orphaned requirements: CFG-01, CFG-02, CFG-03 are all claimed by both plans and all three map to Phase 7 in REQUIREMENTS.md traceability table.

---

## Notable Post-Plan Change: spawnBatch Field

Commit `bae64cc` (post-SUMMARY) added a `spawnBatch` field to `SpawnPhaseConfig` and `flowers.json`. This was NOT in the original PLAN 01 spec. Impact assessment:

- `flowers.json`: added `"spawnBatch": 3/4/5` to the 3 spawn phases — JSON is still valid and loadable
- `GameConfig.ts`: `parseSpawnPhases()` now requires `spawnBatch` via `requirePositiveNumber` — this is a tightening of validation, not a regression
- `GameConfig.test.ts`: test fixtures updated to include `spawnBatch` — all 19 tests still pass
- `SpawnManager.ts`: `SpawnPhaseConfig` interface gained `spawnBatch: number` field

This change is additive and consistent. The phase goal is not undermined — it expands the set of spawn parameters that are data-driven (satisfies CFG-02 more thoroughly). All 171 tests continue to pass.

---

## Anti-Pattern Scan

Files scanned: GameConfig.ts, GameConfig.test.ts, FlowerTypes.ts, SpawnManager.ts, GameState.ts, BootController.ts

| File | Pattern | Severity | Finding |
|------|---------|----------|---------|
| All files | TODO/FIXME/placeholder | — | None found |
| BootController.ts | Empty implementations | — | `_showError()` body is intentionally minimal — errorOverlay.active = true is the full implementation. errorLabel text is set in Inspector (documented in comment). This is NOT a stub — it is complete by design. |
| GameConfig.ts | `from 'cc'` import | — | Not present. Zero Cocos imports confirmed. |

No blockers. No warnings.

---

## Human Verification Required

### 1. JSON config drives gameplay without recompile (CFG-01)

**Test:** Open BloomTap in Cocos Creator. Edit `assets/resources/config/flowers.json` — change CHERRY `cycleDurationMs` from 3000 to 1500. Click Play.
**Expected:** CHERRY flowers complete their lifecycle in ~1.5 seconds instead of ~3 seconds.
**Why human:** Cannot run Cocos runtime from CLI. SUMMARY documents this step was performed and approved.

### 2. Error overlay activates on corrupt config (CFG-03)

**Test:** Remove the `"flowers"` key from `flowers.json`. Click Play in Cocos Creator.
**Expected:** The error overlay node becomes active. A label reads "Game config loi. Vui long reload." A Reload button is visible and reloads the scene when clicked.
**Why human:** The @property bindings (errorOverlay, errorLabel, reloadButton) are wired in the Cocos Inspector — cannot verify Inspector binding state from code. SUMMARY documents Task 3 human-verify checkpoint was completed and all 6 steps passed.

---

## Summary

Phase 7 goal is achieved. The codebase delivers a complete, working config infrastructure:

- `flowers.json` and `settings.json` are the single source of truth for all game-tuning constants
- `parseGameConfig()` is a pure TypeScript function (zero Cocos dependencies) with full field-by-field validation — 19 tests cover every valid and invalid path
- `initFlowerConfigs()`, `initPhaseConfigs()`, and `initGameSettings()` provide runtime override of previously hardcoded constants while preserving test defaults
- `BootController` loads both JSON files at boot, calls the parse + init chain, and transitions to GameScene — on any failure it activates an error overlay with a Reload button
- 171 tests pass with zero regressions across all 10 test files
- A post-SUMMARY fix commit (`bae64cc`) added `spawnBatch` to the spawn phase config — this is additive, consistent with the goal, and all tests still pass

Two items require human verification in Cocos Editor (designer workflow and error overlay UI), both of which the SUMMARY documents as having been performed and approved during the Task 3 human-verify checkpoint.

---

_Verified: 2026-03-21T13:47:00Z_
_Verifier: Claude (gsd-verifier)_
