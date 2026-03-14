---
phase: 03-renderer-and-input
plan: "01"
subsystem: ui
tags: [cocos-creator, typescript, graphics, object-pool, fsm, rendering]

requires:
  - phase: 03-renderer-and-input
    provides: GameState scoring model (plan 03-00), ComboSystem, FlowerFSM, Grid, SpawnManager from Phase 2
  - phase: 02-core-game-logic
    provides: FlowerFSM.getState(), Grid.getCells(), SpawnManager.getPhaseConfig()/pickFlowerType()

provides:
  - GridRenderer Cocos Component with 64 pre-allocated Node+Graphics+UITransform cell nodes
  - Per-frame FlowerFSM state polling in update() with color lookup from pre-computed table
  - 5-type x 6-state Color table (zero per-frame allocation)
  - paintFlash() and paintFlashAndClear() for tap feedback (plan 03-02 ready)
  - GameController game orchestrator owning Grid, ComboSystem, SpawnManager, GameState
  - SpawnManager tick in GameController.update() with correct performance.now() timing
  - GameState.ts re-export in scripts/ for Cocos scripts/ vs logic/ boundary compliance

affects:
  - 03-02-input (imports GridRenderer.paintFlash/paintFlashAndClear + flash constants; imports GameController for grid/combo/gameState access)
  - 03-03-wiring (scene setup and @property wiring in Cocos Creator editor)

tech-stack:
  added: []
  patterns:
    - "Object pool: 64 Node+Graphics objects created once in onLoad(), never created/destroyed during gameplay"
    - "Per-frame state poll: update() calls FlowerFSM.getState(performance.now()) for every cell — renderer is read-only consumer"
    - "Pre-allocated color table: Record<FlowerTypeId, Record<FlowerState, Color>> at module level, zero allocation per frame"
    - "scheduleOnce() for flash reset: avoids Graphics.fillColor tween unreliability in Cocos Creator 3.x"
    - "setCellTypeId() bridge: GameController notifies GridRenderer of typeId on each spawn (FlowerFSM does not expose config)"
    - "isFlashing guard: prevents re-tap during flash window, no scheduleOnce race condition"

key-files:
  created:
    - BloomTap/assets/scripts/GridRenderer.ts
    - BloomTap/assets/scripts/GameState.ts
  modified:
    - BloomTap/assets/scripts/GameController.ts

key-decisions:
  - "GridRenderer._buildCellViews() runs in onLoad(), not in init() — Cocos lifecycle ensures node hierarchy is ready"
  - "FLOWER_COLORS[typeId][COLLECTED] exists in the table but is never used by update() — COLLECTED state skips normal paint path"
  - "Dead flowers show dead color and remain in grid until tap handler or future auto-clear logic calls clearCell()"
  - "GameController.update() calls getPhaseConfig() twice (aliveCount check + nextSpawnMs calc) — acceptable; SpawnManager is pure and cheap"

patterns-established:
  - "Color table pattern: pre-allocate all Color objects at module level, assign by index — not fromHEX() per frame"
  - "Renderer/controller separation: GridRenderer reads Grid state; GameController mutates Grid — no cross-calls"
  - "Flash guard pattern: isFlashing flag set before scheduleOnce, cleared in callback — prevents double-tap during flash"

requirements-completed:
  - GRID-01
  - GRID-02

duration: 2min
completed: 2026-03-14
---

# Phase 3 Plan 01: GridRenderer and GameController Summary

**Cocos Component GridRenderer with 64 object-pooled cell nodes, per-frame FlowerFSM color polling, and GameController SpawnManager tick wired to performance.now() — rendering foundation ready for tap input in plan 03-02**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-14T09:43:21Z
- **Completed:** 2026-03-14T09:45:13Z
- **Tasks:** 2
- **Files modified:** 3 (GameController.ts replaced, GridRenderer.ts created, GameState.ts created)

## Accomplishments

- Replaced placeholder GameController (Label-only) with full game orchestrator owning Grid, ComboSystem, SpawnManager, GameState instances; SpawnManager tick runs each update() frame using performance.now() timestamps
- Created GridRenderer.ts with 64 pre-allocated Node+Graphics+UITransform objects; never allocates nodes after onLoad(); per-frame update() polls FlowerFSM.getState(nowMs) and repaints from pre-computed Color table
- Color table: 5 flower types × 6 states = 30 distinct Color objects at module level — zero per-frame allocation; plus EMPTY_FILL, EMPTY_STROKE, WRONG_FLASH_COLOR, CORRECT_FLASH_YELLOW, CORRECT_FLASH_WHITE
- paintFlash() and paintFlashAndClear() built and exposed for plan 03-02 tap handlers; isFlashing guard prevents re-tap race condition
- GameState.ts re-export added in scripts/ layer for Cocos scripts/ vs logic/ boundary compliance
- All 88 prior tests still passing — 0 regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: GameController orchestrator with SpawnManager tick** - `a56a3dc` (feat)
2. **Task 2: GridRenderer 64 pooled cell nodes with per-frame color poll** - `73dd6c4` (feat)

**Plan metadata:** pending (docs commit)

## Files Created/Modified

- `BloomTap/assets/scripts/GameController.ts` - Full game orchestrator replacing placeholder. Owns Grid, ComboSystem, SpawnManager, GameState. SpawnManager tick in update() with performance.now() timing. Calls gridRenderer.setCellTypeId() on each spawn. Debug score label via @property.
- `BloomTap/assets/scripts/GridRenderer.ts` - Cocos Component with 64 pre-allocated cell nodes (Node+Graphics+UITransform). Per-frame FSM state poll in update(). Pre-computed color table. paintFlash()/paintFlashAndClear() for tap feedback. setCellTypeId() bridge for typeId lookup.
- `BloomTap/assets/scripts/GameState.ts` - Re-export of `GameState` and `WRONG_TAP_PENALTY` from `./logic/GameState` — maintains scripts/ vs logic/ separation boundary.

## Decisions Made

- **GridRenderer._buildCellViews() in onLoad(), not init():** Cocos lifecycle guarantees node hierarchy is ready in onLoad(). init() is called by GameController.onLoad() which fires after GridRenderer.onLoad() — this order is safe because GameController.onLoad() only wires references, and _buildCellViews() needs no external dependencies.
- **FLOWER_COLORS[typeId][COLLECTED] exists but never painted:** COLLECTED state triggers paintFlashAndClear() which takes over the cell — update() skips cells where isFlashing is true or state is COLLECTED, so the table entry is a no-op placeholder.
- **Dead flowers remain in grid:** GridRenderer shows dead color but does not auto-clear DEAD cells. Plan 03-02 tap handler or a future auto-clear timer will call clearCell(). This is intentional — plan 03-01 scope is rendering only.
- **GameController calls getPhaseConfig() twice in spawn block:** Once for aliveCount check and once to compute nextSpawnMs. Acceptable since SpawnManager is pure, stateless, and cheap (array scan, no I/O).

## Deviations from Plan

None - plan executed exactly as written. The plan's `setCellTypeId` bridge and `paintFlash`/`paintFlashAndClear` signatures were implemented exactly as specified.

## Issues Encountered

None — all Cocos Creator APIs (Graphics, UITransform, Node, scheduleOnce) used correctly per RESEARCH.md patterns. No TypeScript errors discovered during implementation.

## User Setup Required

**Manual scene wiring required before Cocos Creator preview works.** Steps for plan 03-03 or manual setup:

1. Open GameScene in Cocos Creator
2. Create a child node "GridContainer" on the root node, set position y=256 (30% from top of 1280px canvas)
3. Attach `GridRenderer` component to GridContainer node
4. Attach `GameController` component to root node
5. Wire `GameController.gridRenderer` @property to GridContainer node in Inspector
6. Wire `GameController.debugScoreLabel` @property to the existing Label node (rename to "DebugScoreLabel")

The TypeScript files are complete — scene wiring is deferred to plan 03-03 (or can be done manually now for preview).

## Next Phase Readiness

- `GridRenderer` is ready for plan 03-02 to import and call `paintFlash()`, `paintFlashAndClear()`, `getCellView()`, and the static flash constants
- `GameController` is ready for plan 03-02 to add touch input wiring (onCellTapped calling grid/comboSystem/gameState)
- No blockers for 03-02 (InputHandler / tap wiring)
- Vitest suite: 88 tests passing, 0 regressions

---

*Phase: 03-renderer-and-input*
*Completed: 2026-03-14*
