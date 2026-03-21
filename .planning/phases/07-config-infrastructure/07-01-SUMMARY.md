---
phase: 07-config-infrastructure
plan: 01
subsystem: infra
tags: [typescript, vitest, tdd, json-config, validation]

# Dependency graph
requires: []
provides:
  - parseGameConfig() pure TypeScript function with full field-by-field validation
  - GameConfig interface (Record<FlowerTypeId, FlowerTypeConfig> + spawnPhases + settings)
  - flowers.json with 5 flower types and 3 spawn phases (migrated from hardcoded FLOWER_CONFIGS/PHASE_CONFIGS)
  - settings.json with session.durationMs=120000 and scoring.wrongTapPenalty=10
affects: [07-02-wire-boot-controller, future config phases]

# Tech tracking
tech-stack:
  added: []
  patterns: [TDD red-green-refactor, pure TypeScript validation with requirePositiveNumber/requireNonNegativeNumber helpers, parseGameConfig accepts unknown (not string) for Cocos JsonAsset compatibility]

key-files:
  created:
    - BloomTap/assets/scripts/logic/GameConfig.ts
    - BloomTap/assets/scripts/logic/GameConfig.test.ts
    - BloomTap/assets/resources/config/flowers.json
    - BloomTap/assets/resources/config/settings.json
  modified: []

key-decisions:
  - "parseGameConfig accepts unknown (not string) — Cocos JsonAsset.json already returns parsed objects, no JSON.parse roundtrip needed"
  - "id field not stored in JSON — parseGameConfig injects it from the key name at parse time"
  - "spawnPhase endMs values use 40000/80000/120000 — SpawnManager uses strict < comparison so boundaries are [startMs, endMs)"
  - "requireNonNegativeNumber allows 0 for wrongTapPenalty and spawn weights — zero penalty and zero weights are valid game design choices"

patterns-established:
  - "Validation helper pattern: requirePositiveNumber(obj, key, context) and requireNonNegativeNumber(obj, key, context) throw descriptive [GameConfig] prefix errors"
  - "isRecord(val) type guard for safe unknown -> Record<string, unknown> narrowing"
  - "TDD fixture pattern: plain object validFlowersData/validSettingsData mirrors JSON files exactly; spread+override for invalid inputs"

requirements-completed: [CFG-01, CFG-02, CFG-03]

# Metrics
duration: 15min
completed: 2026-03-21
---

# Phase 07 Plan 01: Config Infrastructure — parseGameConfig TDD Summary

**Pure TypeScript parseGameConfig() function with two validation helpers and 19 Vitest tests, backed by flowers.json and settings.json migrated from hardcoded FLOWER_CONFIGS/PHASE_CONFIGS constants**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-21T09:46:00Z
- **Completed:** 2026-03-21T09:47:30Z
- **Tasks:** 1 (TDD: RED + GREEN phases)
- **Files modified:** 4 created

## Accomplishments
- Migrated all 5 flower type configs and 3 spawn phase configs from hardcoded TypeScript constants to `flowers.json`
- Migrated session duration and wrong tap penalty to `settings.json`
- Implemented `parseGameConfig(flowersData: unknown, settingsData: unknown): GameConfig` with full validation using `requirePositiveNumber` and `requireNonNegativeNumber` helpers
- 19 tests covering valid parse, field-level error messages, NaN/zero/negative range checks, and id injection — all passing
- Full suite regression-free: 171 tests pass (152 existing + 19 new)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create JSON config files + GameConfig.ts parse function + GameConfig.test.ts** - `2ab2823` (feat)

**Plan metadata:** (docs commit to follow)

_Note: TDD task committed as single feat commit after RED+GREEN cycle completed_

## Files Created/Modified
- `BloomTap/assets/scripts/logic/GameConfig.ts` - parseGameConfig() function + GameConfig interface + validation helpers (pure TypeScript, zero cc imports)
- `BloomTap/assets/scripts/logic/GameConfig.test.ts` - 19 Vitest tests covering all validation paths
- `BloomTap/assets/resources/config/flowers.json` - 5 flower types + 3 spawn phases (exact values from FLOWER_CONFIGS/PHASE_CONFIGS)
- `BloomTap/assets/resources/config/settings.json` - session.durationMs=120000, scoring.wrongTapPenalty=10

## Decisions Made
- `parseGameConfig` accepts `unknown` objects (not strings) — Cocos `JsonAsset.json` already returns parsed objects; avoids unnecessary JSON stringify/parse roundtrip
- `id` field not stored in JSON — `parseGameConfig` injects it from the key name at parse time using `{ id: key as FlowerTypeId, ...fields }`
- `spawnPhases` `endMs` values use 40000/80000/120000 — `SpawnManager` uses strict `<` comparison so phase boundaries are `[startMs, endMs)` exclusive
- `requireNonNegativeNumber` (not `requirePositiveNumber`) used for `wrongTapPenalty` and `weights` — zero is a valid game design value in both cases

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — TDD cycle completed cleanly. RED phase showed 12 failures (expected), GREEN phase showed all 19 passing.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `parseGameConfig()` is ready for 07-02 wiring into `BootController`
- `flowers.json` and `settings.json` in `assets/resources/config/` are loadable via Cocos `resources.load()` API
- No blockers for 07-02

---
*Phase: 07-config-infrastructure*
*Completed: 2026-03-21*
