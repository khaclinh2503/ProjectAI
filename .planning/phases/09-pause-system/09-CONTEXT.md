# Phase 9: Pause System - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Add pause/resume to an active game session. Player taps PAUSE button → game freezes → player taps screen → 3-2-1 countdown → game resumes from exact frozen state. Timer, all flower states, combo, and urgency blink preserved with zero time-drift.

</domain>

<decisions>
## Implementation Decisions

### Pause button
- **D-01:** Positioned at bottom-center of screen
- **D-02:** Separate scene node (not attached to existing HUD node)
- **D-03:** Label text "PAUSE", size moderate (Claude decides exact dimensions)
- **D-04:** Visible only during `SessionPhase.PLAYING` — hidden during countdown, game over, and waiting states

### Pause overlay
- **D-05:** Separate scene node (not the existing HUD or countdownOverlay node)
- **D-06:** Semi-transparent overlay covers the grid area only (alpha ≈ 80/255 — light, hoa vẫn nhìn thấy rõ)
- **D-07:** Overlay shows two text labels: "PAUSED" and "Chạm vào màn hình để tiếp tục"
- **D-08:** Touch/tap input listener covers full screen (not just the grid area) to catch resume gesture

### Resume flow
- **D-09:** Tap anywhere on screen resumes — no dedicated "RESUME" button
- **D-10:** On tap → hide pause overlay → reuse existing `countdownOverlay` for a 3-2-1 countdown → then start game
- **D-11:** Flowers remain frozen (timestamps not shifted yet) throughout the entire 3-2-1 resume countdown
- **D-12:** Timestamp shift applied only after the 3-2-1 countdown completes — total pause duration = `pauseTapMs` to `resumeStartMs` (end of countdown)

### Claude's Discretion
- Exact timestamp shift strategy (virtual time offset via `_totalPausedMs` on GameState, or shift individual timestamps — either works)
- `_nextSpawnMs` handling during pause
- Urgency blink `unschedule/reschedule` on pause/resume
- Exact button size and font size
- Whether `SessionPhase` gets a new `PAUSED` value or pause is tracked via a boolean flag

</decisions>

<specifics>
## Specific Ideas

- Reuse the existing `countdownOverlay` + `countdownLabel` for the resume 3-2-1 — same visual treatment as game start countdown
- The pause overlay node and pause button node are both new scene additions (not reusing existing nodes)

</specifics>

<canonical_refs>
## Canonical References

No external specs — requirements are fully captured in decisions above.

### Requirements
- `.planning/REQUIREMENTS.md` §PAUSE-01 — single requirement for this phase

### Key source files
- `BloomTap/assets/scripts/GameController.ts` — `SessionPhase` enum, `update()` loop, `_applyUrgencyStage()`, `_stopAllJuiceAnimations()`, `_startCountdown()`
- `BloomTap/assets/scripts/logic/GameState.ts` — `sessionStartMs`, `isGameOver()`
- `BloomTap/assets/scripts/logic/FlowerFSM.ts` — timestamp-based state machine (`nowMs - _spawnTimestamp`)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `countdownOverlay` + `countdownLabel`: already wired in GameController — reuse for resume 3-2-1
- `_stopAllJuiceAnimations()`: stops blink scheduler and tweens — call on pause
- `_startCountdown()`: runs the 3-2-1 sequence — can be reused or factored for resume path
- `SessionPhase` enum: add `PAUSED` state, or use a `_isPaused: boolean` flag (Claude decides)

### Established Patterns
- Timestamp-based time model: `elapsedMs = nowMs - gameState.sessionStartMs` — pause must shift `sessionStartMs` (and `_nextSpawnMs`) forward by pause duration so elapsed picks up from the same point
- FlowerFSM is timestamp-based: `state = f(nowMs - _spawnTimestamp)` — if `sessionStartMs` is shifted, flower timestamps must also shift by the same delta (or use a `_totalPausedMs` offset passed through `nowMs` injection)
- `this.schedule()` / `this.unschedule()`: urgency blink uses named callback stored in `_blinkCallback` — must unschedule on pause and reschedule on resume at correct urgency stage

### Integration Points
- `update()` guard: add `if (this._phase === SessionPhase.PAUSED) return;` (or boolean check) to freeze all per-frame logic
- `_onStartTapped()` → `_spawnInitialBurst()` → `_startCountdown()` chain: resume path needs similar sequencing but skips `_spawnInitialBurst()`
- Grid node touch handlers: pause overlay touch listener must be added to a full-screen transparent node sitting above the grid

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 09-pause-system*
*Context gathered: 2026-03-21*
