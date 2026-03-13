# Roadmap: Bloom Tap

**Created:** 2026-03-13
**Granularity:** Standard (5-8 phases)
**Coverage:** 29/29 v1 requirements mapped

---

## Phases

- [ ] **Phase 1: Project Foundation** — Cocos Creator scaffold, mobile canvas, touch input baseline
- [ ] **Phase 2: Core Game Logic** — FlowerFSM, Grid, ComboSystem, SpawnManager — pure, no canvas
- [ ] **Phase 3: Renderer and Input** — Cocos Creator Nodes wired to logic; playable grid on screen
- [ ] **Phase 4: Session Loop and Scoring** — 120s timer, 3-phase escalation, full scoring pipeline, HUD
- [ ] **Phase 5: Juice and Polish** — Tap pulse, score float, combo break flash, timer urgency
- [ ] **Phase 6: Results and Persistence** — Results screen, highscore, restart flow

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Project Foundation | 0/2 | Not started | — |
| 2. Core Game Logic | 0/? | Not started | — |
| 3. Renderer and Input | 0/? | Not started | — |
| 4. Session Loop and Scoring | 0/? | Not started | — |
| 5. Juice and Polish | 0/? | Not started | — |
| 6. Results and Persistence | 0/? | Not started | — |

---

## Phase Details

### Phase 1: Project Foundation
**Goal**: The development environment is correct and mobile-ready before any game logic is written
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03
**Success Criteria** (what must be TRUE):
  1. The project opens in Cocos Creator and can preview in browser with no console errors
  2. On a physical mobile device (or DevTools emulation), the canvas fills the viewport without blurriness on high-DPI screens
  3. Tapping the canvas does not scroll the page; touch events fire correctly with no warnings
  4. The Cocos scene system is wired with at least a BootScene that transitions to a placeholder GameScene
**Plans**: 2 plans

Plans:
- [ ] 01-01-PLAN.md — Create Cocos Creator project with design resolution 720x1280, portrait Fit Width, TypeScript strict mode
- [ ] 01-02-PLAN.md — Write BootController, GameController, build template (touch-action:none); verify all 3 success criteria

---

### Phase 2: Core Game Logic
**Goal**: All game rules exist as pure, testable TypeScript with no canvas dependency
**Depends on**: Phase 1
**Requirements**: GRID-01, GRID-02, FLOW-01, FLOW-02, FLOW-03, FLOW-04
**Success Criteria** (what must be TRUE):
  1. A FlowerFSM instance, given a spawn timestamp, returns the correct state (Bud/Blooming/FullBloom/Wilting/Dead) for any elapsed-time query — verifiable via unit test without a browser
  2. A Grid instance exposes 64 cells; `getRandomEmptyCell()` returns a cell or null; `spawnFlower(cell, type)` and `clearCell(cell)` mutate state correctly
  3. All 5 flower type configs exist (cycle speed, base score) and are referenced by FlowerFSM
  4. ComboSystem increments the multiplier on correct-tap calls and resets to 1 on wrong-tap calls
  5. SpawnManager reads elapsed session time and returns the spawn-rate config for the active phase (0–40s, 40–80s, 80–120s)
**Plans**: TBD

---

### Phase 3: Renderer and Input
**Goal**: The 8x8 grid is visible on screen and tapping a cell produces a visual response wired to the logic tier
**Depends on**: Phase 2
**Requirements**: GRID-01, GRID-02, GAME-01, GAME-02, GAME-03
**Success Criteria** (what must be TRUE):
  1. All 64 grid cells render as Phaser GameObjects pre-created at scene init; no cells are created or destroyed during gameplay
  2. Each flower cell displays a visually distinct appearance for all 5 growth states — distinguishable without reading any text label
  3. Tapping a cell in Blooming or FullBloom state triggers the correct-tap path and removes the flower from the grid
  4. Tapping a cell in Bud or Wilting/Dead state triggers the wrong-tap path; a visual indicator (red flash or similar) plays immediately
  5. The grid scales correctly to fit the screen on a 375px-wide viewport (iPhone SE) and a 430px-wide viewport (iPhone 14 Pro Max)
**Plans**: TBD

---

### Phase 4: Session Loop and Scoring
**Goal**: A complete 120-second game session runs from start to game-over with accurate scoring, combo tracking, and 3-phase difficulty escalation
**Depends on**: Phase 3
**Requirements**: GAME-04, GAME-05, SESS-01, SESS-02, SESS-03, SESS-04, SESS-05, HUD-01, HUD-02, HUD-03
**Success Criteria** (what must be TRUE):
  1. A session starts, runs for exactly 120 seconds, and ends — the timer displayed in the HUD counts down to 0 and triggers game-over
  2. Tapping flowers in sequence increases the combo multiplier; the score applied for each tap equals the flower's base score times the current multiplier
  3. A wrong tap resets the combo multiplier to 1; the HUD combo display updates immediately
  4. Flower spawn rate is visibly slower in Phase 1 (0–40s), moderate in Phase 2 (40–80s), and fast/dense in Phase 3 (80–120s) — observable during a test session
  5. Score, countdown timer, and combo multiplier are all visible and updating in real time throughout the session
**Plans**: TBD

---

### Phase 5: Juice and Polish
**Goal**: Every tap action has immediate, satisfying feedback that confirms correctness without requiring the player to read text
**Depends on**: Phase 4
**Requirements**: JUICE-01, JUICE-02, JUICE-03, JUICE-04
**Success Criteria** (what must be TRUE):
  1. Tapping any flower cell produces a visible scale-pulse animation on that cell completing within ~100ms
  2. A score label (e.g., "+120 x3") floats upward from the tapped cell and fades out after a correct tap
  3. A wrong tap (or combo reset) produces a distinct visual indicator — a red flash or similar — that is immediately noticeable without reading text
  4. In the final 15 seconds of a session, the timer display changes color or enters a blinking state to signal urgency
**Plans**: TBD

---

### Phase 6: Results and Persistence
**Goal**: After every session, the player sees their score, knows their all-time best, and can restart immediately
**Depends on**: Phase 5
**Requirements**: RSLT-01, RSLT-02, RSLT-03
**Success Criteria** (what must be TRUE):
  1. When the session timer reaches 0, the game transitions to a results screen showing the session score and the all-time highscore
  2. If the session score exceeds the stored highscore, the highscore updates to the new value and the results screen reflects this
  3. The highscore persists across browser refreshes and new sessions — closing and reopening the tab does not reset it
  4. A restart button on the results screen starts a new 120-second session with all state reset (score 0, combo 1, fresh grid)
**Plans**: TBD

---

## Requirement Coverage

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Pending |
| FOUND-02 | Phase 1 | Pending |
| FOUND-03 | Phase 1 | Pending |
| GRID-01 | Phase 2 + 3 | Pending |
| GRID-02 | Phase 2 + 3 | Pending |
| FLOW-01 | Phase 2 | Pending |
| FLOW-02 | Phase 2 | Pending |
| FLOW-03 | Phase 3 | Pending |
| FLOW-04 | Phase 2 | Pending |
| GAME-01 | Phase 3 | Pending |
| GAME-02 | Phase 3 | Pending |
| GAME-03 | Phase 3 | Pending |
| GAME-04 | Phase 4 | Pending |
| GAME-05 | Phase 4 | Pending |
| SESS-01 | Phase 4 | Pending |
| SESS-02 | Phase 4 | Pending |
| SESS-03 | Phase 4 | Pending |
| SESS-04 | Phase 4 | Pending |
| SESS-05 | Phase 4 | Pending |
| HUD-01 | Phase 4 | Pending |
| HUD-02 | Phase 4 | Pending |
| HUD-03 | Phase 4 | Pending |
| JUICE-01 | Phase 5 | Pending |
| JUICE-02 | Phase 5 | Pending |
| JUICE-03 | Phase 5 | Pending |
| JUICE-04 | Phase 5 | Pending |
| RSLT-01 | Phase 6 | Pending |
| RSLT-02 | Phase 6 | Pending |
| RSLT-03 | Phase 6 | Pending |

**Coverage: 29/29 v1 requirements mapped**

Note on GRID-01 / GRID-02: Grid data model is defined in Phase 2 (pure logic); grid rendering is wired in Phase 3. Both phases share these requirements because the grid spans both tiers. The authoritative coverage assignment is Phase 2 (data) and Phase 3 (render). No requirement is orphaned.

---

*Roadmap created: 2026-03-13*
*Last updated: 2026-03-14 — Phase 1 plans created (01-01, 01-02)*
