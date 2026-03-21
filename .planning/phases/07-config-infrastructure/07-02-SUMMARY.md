---
phase: 07-config-infrastructure
plan: 02
subsystem: infra
tags: [typescript, cocos-creator, config, runtime, boot]

# Dependency graph
requires:
  - parseGameConfig() from 07-01 (GameConfig.ts)
  - flowers.json and settings.json from 07-01 (assets/resources/config/)
provides:
  - initFlowerConfigs() on FLOWER_CONFIGS object (runtime override, same reference)
  - initPhaseConfigs() replacing PHASE_CONFIGS array (runtime override)
  - initGameSettings() updating SESSION_DURATION_MS and WRONG_TAP_PENALTY lets
  - BootController with async JSON loading, parseGameConfig wiring, error popup with Reload
affects: [GameController (imports SESSION_DURATION_MS and FLOWER_CONFIGS — live bindings), Boot scene Inspector wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Object mutation pattern for const-replacing init: initFlowerConfigs mutates FLOWER_CONFIGS in place via Object.keys loop — same reference, existing imports still valid"
    - "let export pattern for scalar override: SESSION_DURATION_MS and WRONG_TAP_PENALTY become let exports; ES module live bindings propagate mutation to all importers"
    - "Sequential resources.load() callback chain for two JSON assets — no Promise wrapper needed"
    - "@property Node/Label/Button bindings in BootController for Inspector-wired error UI"

key-files:
  created: []
  modified:
    - BloomTap/assets/scripts/logic/FlowerTypes.ts
    - BloomTap/assets/scripts/logic/SpawnManager.ts
    - BloomTap/assets/scripts/logic/GameState.ts
    - BloomTap/assets/scripts/BootController.ts

key-decisions:
  - "initFlowerConfigs mutates FLOWER_CONFIGS in place (not reassign) — tests import the same object reference and see defaults when init is not called"
  - "WRONG_TAP_PENALTY and SESSION_DURATION_MS changed from const to let — ES module live bindings propagate the mutation to GameController without re-import"
  - "resources.load path is 'config/flowers' (no extension) per RESEARCH.md Pitfall 1 — extension causes load failure in Cocos runtime"
  - "flowersAsset.json and settingsAsset.json passed directly to parseGameConfig as unknown — no JSON.stringify/parse roundtrip"

# Metrics
duration: ~2min
completed: 2026-03-21
---

# Phase 07 Plan 02: Wire BootController — Runtime Config Override Summary

**Wired parseGameConfig() into BootController with sequential resources.load(), init functions added to FlowerTypes/SpawnManager/GameState, and error popup with Reload on parse failure — 171 tests unchanged**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-21T09:50:05Z
- **Completed:** 2026-03-21T09:51:50Z
- **Tasks:** 2 auto + 1 checkpoint (human-verify pending)
- **Files modified:** 4

## Accomplishments

- Added `initFlowerConfigs()` to FlowerTypes.ts — mutates FLOWER_CONFIGS in place so existing test imports continue to see defaults when init is not called
- Changed `PHASE_CONFIGS` from `const` to `let` in SpawnManager.ts; added `initPhaseConfigs()` export
- Changed `WRONG_TAP_PENALTY` and `SESSION_DURATION_MS` from `const` to `let` in GameState.ts; added `initGameSettings()` export
- Rewrote BootController.ts: sequential `resources.load('config/flowers')` → `resources.load('config/settings')` → `parseGameConfig()` → init calls → `director.loadScene('GameScene')`
- Error overlay pattern with `@property(Node)` errorOverlay, `@property(Label)` errorLabel, `@property(Button)` reloadButton — user wires in Inspector
- `_onReload()` calls `assetManager.releaseAll()` then reloads Boot scene
- All 171 tests pass with zero test file modifications

## Task Commits

Each task was committed atomically:

1. **Task 1: Add init functions to FlowerTypes, SpawnManager, GameState** - `f3350e8` (feat)
2. **Task 2: Rewrite BootController with JSON loading and error popup** - `a952f04` (feat)
3. **Task 3: Verify config loading in Cocos Editor** - PENDING (checkpoint:human-verify)

## Files Created/Modified

- `BloomTap/assets/scripts/logic/FlowerTypes.ts` — added `initFlowerConfigs()` export at end of file
- `BloomTap/assets/scripts/logic/SpawnManager.ts` — `const PHASE_CONFIGS` → `let PHASE_CONFIGS`, added `initPhaseConfigs()` export
- `BloomTap/assets/scripts/logic/GameState.ts` — `WRONG_TAP_PENALTY` and `SESSION_DURATION_MS` → `let`, added `initGameSettings()` export
- `BloomTap/assets/scripts/BootController.ts` — full rewrite from 9-line stub to async loader with error popup

## Decisions Made

- `initFlowerConfigs` mutates the same `FLOWER_CONFIGS` object reference — tests import the same object; when init is not called, hardcoded defaults remain in place
- `WRONG_TAP_PENALTY` and `SESSION_DURATION_MS` changed to `let` — ES module live bindings mean `GameController` and `GameState` methods pick up the new value after `initGameSettings()` runs; tests see defaults since they never call `initGameSettings()`
- Resource path uses no extension (`'config/flowers'` not `'config/flowers.json'`) — Cocos `resources.load()` does not accept file extensions
- `flowersAsset.json` and `settingsAsset.json` passed as-is to `parseGameConfig(unknown, unknown)` — the Cocos `JsonAsset.json` property already returns a parsed object

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — all acceptance criteria met on first attempt. Both task verifications (`npx vitest run`) exited 0.

## User Setup Required

**Task 3 (checkpoint:human-verify) is pending.** The user must:
1. Open Cocos Creator Editor and open the BloomTap project
2. In the Boot scene, create an error overlay UI:
   - Node "ErrorOverlay" (child of Canvas)
   - Label child: "Game config loi. Vui long reload."
   - Button child: "Reload"
   - Wire these to BootController's `errorOverlay`, `errorLabel`, `reloadButton` @property fields
3. Click Play — verify game loads through Boot into GameScene with flowers spawning
4. Modify `cycleDurationMs` in flowers.json — verify change takes effect without recompile
5. Break flowers.json — verify error popup appears with Reload button
6. Fix flowers.json and use Reload — verify game recovers

## Next Phase Readiness

After checkpoint approval:
- Phase 7 (Config Infrastructure) is complete — all CFG-01, CFG-02, CFG-03 requirements fulfilled
- JSON config files are live-editable and drive gameplay without recompile
- Error popup prevents game from starting with corrupt data

## Self-Check: PASSED

- FOUND: BloomTap/assets/scripts/logic/FlowerTypes.ts
- FOUND: BloomTap/assets/scripts/logic/SpawnManager.ts
- FOUND: BloomTap/assets/scripts/logic/GameState.ts
- FOUND: BloomTap/assets/scripts/BootController.ts
- FOUND: .planning/phases/07-config-infrastructure/07-02-SUMMARY.md
- FOUND: commit f3350e8 (Task 1)
- FOUND: commit a952f04 (Task 2)

---
*Phase: 07-config-infrastructure*
*Completed: 2026-03-21*
