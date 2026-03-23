# Roadmap: Bloom Tap

## Milestones

- ✅ **v1.0 MVP** — Phases 1–6 (shipped 2026-03-16)
- 🚧 **v1.1 Polish & Power-ups** — Phases 7–12 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–6) — SHIPPED 2026-03-16</summary>

- [x] **Phase 1: Project Foundation** — Cocos Creator scaffold, mobile canvas, touch input baseline (completed 2026-03-14)
- [x] **Phase 2: Core Game Logic** — FlowerFSM, Grid, ComboSystem, SpawnManager — pure, no canvas (completed 2026-03-14)
- [x] **Phase 3: Renderer and Input** — Cocos Creator Nodes wired to logic; playable grid on screen (completed 2026-03-14)
- [x] **Phase 4: Session Loop and Scoring** — 120s timer, 3-phase escalation, full scoring pipeline, HUD (completed 2026-03-15)
- [x] **Phase 5: Juice and Polish** — Tap pulse, score float, combo break flash, timer urgency (completed 2026-03-15)
- [x] **Phase 6: Results and Persistence** — Results screen, highscore, restart flow (completed 2026-03-16)

Full phase archive: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v1.1 Polish & Power-ups (In Progress)

**Milestone Goal:** Config-driven gameplay, special power-up flowers, pause system, and art refresh — nâng cấp toàn diện trải nghiệm từ nền tảng v1.0 vững chắc.

- [x] **Phase 7: Config Infrastructure** — Flower types and spawn parameters read from JSON; schema validation at load time (completed 2026-03-21)
- [x] **Phase 8: Spawn Fix** — Flowers appear immediately when the game starts; initial count configurable (completed 2026-03-21)
- [x] **Phase 9: Pause System** — Player can pause and resume with full state preservation (completed 2026-03-21)
- [x] **Phase 10: Special Flowers** — Power-up flowers spawn with distinct visuals and three effect types (re-planned 2026-03-22) (completed 2026-03-22)
- [ ] **Phase 11: Bug Fixes and Refactors** — Combo display fix, screen shake, JuiceHelpers decoupling
- [ ] **Phase 12: Art Refresh** — Sprite flowers, background/board, and UI element visuals

## Phase Details

### Phase 7: Config Infrastructure
**Goal**: Flower types and spawn parameters are data-driven — loaded from JSON at startup with validated schema, enabling balance tuning without recompile
**Depends on**: Phase 6 (v1.0 foundation)
**Requirements**: CFG-01, CFG-02, CFG-03
**Success Criteria** (what must be TRUE):
  1. Designer can change a flower's cycle speed or base score in the JSON file and see the change reflected in the next game session without recompiling
  2. Designer can change spawn parameters (initial count, max alive per phase, interval per phase) in the JSON file and see the change in the next session
  3. If the JSON file contains a malformed or missing field, the game displays a clear error message at startup and does not silently corrupt gameplay with NaN values
  4. All 150 existing tests continue to pass; new Vitest tests cover GameConfig.parse() valid and invalid inputs
**Plans:** 2/2 plans complete
Plans:
- [ ] 07-01-PLAN.md — TDD: GameConfig.parse() pure function + JSON config files + comprehensive tests
- [ ] 07-02-PLAN.md — Wire config into FlowerTypes/SpawnManager/GameState + BootController async loading + error popup

### Phase 8: Spawn Fix
**Goal**: Flowers appear on the board the moment the game session begins — no empty 3-second opening — with the initial burst count read from config
**Depends on**: Phase 7
**Requirements**: SPAWN-01
**Success Criteria** (what must be TRUE):
  1. When the player taps Start, flowers are visible on the board within the first game frame — no empty-board wait
  2. The number of flowers in the opening burst matches the initialCount value set in the spawn config JSON
**Plans:** 1/1 plans complete
Plans:
- [x] 08-01-PLAN.md — Schema + burst wiring: add initialCount to config, validate in parseSpawnPhases, wire _spawnInitialBurst in GameController

### Phase 9: Pause System
**Goal**: Player can pause the game at any moment and resume to the exact state they left — timer, live flowers, and combo all preserved with no time-drift artifacts
**Depends on**: Phase 8
**Requirements**: PAUSE-01
**Success Criteria** (what must be TRUE):
  1. Tapping the pause button stops the countdown timer visibly and freezes all flower state progression
  2. Tapping Resume restores the countdown from the exact second it was paused — no time lost, no time gained
  3. Live flowers that were mid-cycle when paused continue from their correct state on resume — no instant deaths or skipped stages
  4. Urgency blink (timer pulse) stops while paused and resumes at correct rate after resume
**Plans:** 2/2 plans complete
Plans:
- [x] 09-01-PLAN.md — TDD: Add shiftTimestamp() to FlowerFSM and shiftAllTimestamps() to Grid with tests
- [x] 09-02-PLAN.md — Wire pause/resume into GameController: SessionPhase.PAUSED, overlay, countdown reuse, timestamp shift

### Phase 10: Special Flowers
**Goal**: Special power-up flowers appear randomly on the board with a distinct visual; tapping one activates one of three timed effects — score multiplier, freeze timer, or slow flower growth. Replacement semantics only — 1 effect active at a time (D-05).
**Depends on**: Phase 9
**Requirements**: SPECIAL-01, SPECIAL-02, SPECIAL-03, SPECIAL-04
**Success Criteria** (what must be TRUE):
  1. A special flower appears on the board during normal play, is visually distinct from regular flowers, and can be tapped at the correct bloom stage to activate an effect
  2. Tapping a special flower during Score Multiplier effect causes all subsequent scored taps to award x2–x5 points for approximately 6 seconds; a HUD indicator shows the effect and remaining duration
  3. Tapping a special flower during Freeze Time effect visibly stops the countdown timer for approximately 5 seconds; the timer resumes from the frozen value when the effect ends
  4. Tapping a special flower during Slow Growth effect causes newly spawned flowers to cycle more slowly for approximately 8 seconds — the bloom window is observably wider
  5. Replacement semantics: tapping a new special flower replaces the currently active effect; same-type retap resets timer
**Plans:** 3/3 plans complete
Plans:
- [x] 10-01-PLAN.md — TDD: PowerUpState class + Cell extension + GameConfig powerUps schema + GameState multiplier + tests
- [x] 10-02-PLAN.md — Wire spawn loop, effects, TIME_FREEZE, SLOW_GROWTH, pause integration into GameController + GridRenderer overlay
- [x] 10-03-PLAN.md — PowerUpHUDRenderer component + BootController config wiring + human verify

### Phase 11: Bug Fixes and Refactors
**Goal**: Three known issues are resolved — combo label shows correct multiplier from session start, wrong taps trigger screen shake, and GameController no longer duplicates JuiceHelpers logic inline
**Depends on**: Phase 10
**Requirements**: FIX-01, FIX-02, FIX-03
**Success Criteria** (what must be TRUE):
  1. The combo label shows "x1.0" from the very first frame of a session and increments to "x1.5", "x2.0" etc. as the multiplier rises — it never shows a raw tap count
  2. Tapping an empty cell or a dead/wilted flower triggers a visible screen shake effect on the board
  3. GameController no longer contains inline copies of getUrgencyStage() or getMilestoneLabel() — it calls the JuiceHelpers exports directly
**Plans:** 1/2 plans executed
Plans:
- [x] 11-01-PLAN.md — Fix applySlowGrowthConfig + JuiceHelpers refactor + handleCorrectTap return powerUpMultiplier
- [ ] 11-02-PLAN.md — Combo label fix + screen shake + score float multiplier + grid border glow + human verify

### Phase 12: Art Refresh
**Goal**: All placeholder color-coded Graphics cells are replaced with real sprite assets — flowers, board background, and UI elements all have polished visuals
**Depends on**: Phase 11
**Requirements**: ART-01, ART-02, ART-03
**Success Criteria** (what must be TRUE):
  1. Each of the 5 flower types renders a distinct sprite image at each of the 5 growth stages — no colored rectangles remain for regular flowers
  2. Special flowers have a visually distinct sprite variant (e.g., gold glow overlay) that makes them identifiable at a glance
  3. The game board background and grid lines have an improved visual that looks like a designed game, not a developer placeholder
  4. Buttons, HUD elements, and the results screen use styled sprite assets rather than default Cocos Creator UI primitives
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Project Foundation | v1.0 | 2/2 | Complete | 2026-03-14 |
| 2. Core Game Logic | v1.0 | 2/2 | Complete | 2026-03-14 |
| 3. Renderer and Input | v1.0 | 4/4 | Complete | 2026-03-14 |
| 4. Session Loop and Scoring | v1.0 | 4/4 | Complete | 2026-03-15 |
| 5. Juice and Polish | v1.0 | 3/3 | Complete | 2026-03-15 |
| 6. Results and Persistence | v1.0 | 3/3 | Complete | 2026-03-16 |
| 7. Config Infrastructure | v1.1 | 2/2 | Complete | 2026-03-21 |
| 8. Spawn Fix | v1.1 | 1/1 | Complete | 2026-03-21 |
| 9. Pause System | v1.1 | 2/2 | Complete | 2026-03-21 |
| 10. Special Flowers | v1.1 | 3/3 | Complete   | 2026-03-22 |
| 11. Bug Fixes and Refactors | v1.1 | 1/2 | In Progress|  |
| 12. Art Refresh | v1.1 | 0/? | Not started | - |

---

*Last updated: 2026-03-23 — Phase 11 planned (2 plans)*
