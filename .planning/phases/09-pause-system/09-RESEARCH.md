# Phase 9: Pause System - Research

**Researched:** 2026-03-21
**Domain:** Cocos Creator pause/resume, timestamp-based game state freezing
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Pause button positioned at bottom-center of screen
- **D-02:** Pause button is a separate scene node (not attached to existing HUD node)
- **D-03:** Label text "PAUSE", size moderate (Claude decides exact dimensions)
- **D-04:** Pause button visible only during `SessionPhase.PLAYING` — hidden during countdown, game over, and waiting states
- **D-05:** Pause overlay is a separate scene node (not the existing HUD or countdownOverlay node)
- **D-06:** Semi-transparent overlay covers grid area only (alpha ≈ 80/255 — light, flowers still visible)
- **D-07:** Overlay shows two text labels: "PAUSED" and "Chạm vào màn hình để tiếp tục"
- **D-08:** Touch/tap input listener covers full screen (not just grid area) to catch resume gesture
- **D-09:** Tap anywhere on screen resumes — no dedicated "RESUME" button
- **D-10:** On tap → hide pause overlay → reuse existing `countdownOverlay` for 3-2-1 countdown → then start game
- **D-11:** Flowers remain frozen throughout entire 3-2-1 resume countdown
- **D-12:** Timestamp shift applied only after 3-2-1 countdown completes — total pause duration = `pauseTapMs` to `resumeStartMs` (end of countdown)

### Claude's Discretion
- Exact timestamp shift strategy (`_totalPausedMs` on GameState, or shift individual timestamps — either works)
- `_nextSpawnMs` handling during pause
- Urgency blink `unschedule/reschedule` on pause/resume
- Exact button size and font size
- Whether `SessionPhase` gets a new `PAUSED` value or pause is tracked via a boolean flag

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PAUSE-01 | Player can pause at any time and resume from exact state (timer, flowers, combo all preserved) | Timestamp shift pattern (sessionStartMs + flower _spawnTimestamp + _nextSpawnMs shifted by pauseDeltaMs) enables zero-drift resume; update() guard freezes all game logic while paused |
</phase_requirements>

---

## Summary

Phase 9 adds pause/resume to Bloom Tap's active session. The challenge is entirely internal: Cocos Creator's `director.pause()` is known-broken for this use case (CC bug #11144, confirmed in STATE.md), so pause must be implemented manually via a phase guard in `update()` plus a timestamp shift on resume.

The game's time model is already designed for this. `elapsedMs = nowMs - gameState.sessionStartMs` and `FlowerFSM.getState(nowMs - _spawnTimestamp)` both derive time from a single subtraction against a stored timestamp. Pausing means: (1) stop the `update()` loop from executing game logic, (2) freeze the 3-2-1 resume countdown UI, (3) shift ALL timestamps forward by `pauseDeltaMs` when the game actually resumes. This keeps every derived value (elapsed, urgency stage, flower state, spawn timer) consistent without touching any FSM internals.

The planner should structure this as two tasks: (1) add scene nodes and wiring (pause button + pause overlay), (2) implement the pause/resume logic in `GameController.ts` including the timestamp shift, update guard, urgency blink handling, and resume countdown reuse.

**Primary recommendation:** Use the direct timestamp shift strategy — shift `gameState.sessionStartMs`, all `cell.flower._spawnTimestamp` values via a new `Grid.shiftAllTimestamps(deltaMs)` method, and `_nextSpawnMs` forward by `pauseDeltaMs` at resume start. This approach requires zero changes to FlowerFSM or GameState consumers — they see a seamlessly-continuing timeline.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Cocos Creator | 3.x (project-established) | Scene graph, `@property`, `Component.schedule()` | Already used throughout codebase |
| TypeScript | project-established | Implementation language | All scripts in .ts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `cc.tween` / `cc.Tween.stopAllByTarget()` | project-established | Animation stop on pause | Already used in `_stopAllJuiceAnimations()` |
| `Component.schedule()` / `Component.unschedule()` | project-established | Urgency blink scheduler | Already used for `_blinkCallback` |

### No New Dependencies
This phase adds no npm packages. All required APIs are Cocos Creator built-ins already imported in `GameController.ts`.

---

## Architecture Patterns

### Recommended Project Structure

No new files needed for logic. Scene additions only (new nodes in Cocos Editor). The implementation lives entirely in `GameController.ts` with a supporting method addition to `Grid.ts`.

```
BloomTap/assets/scripts/
├── GameController.ts          — pause/resume logic, phase guard, timestamp shift
├── logic/
│   └── Grid.ts                — add shiftAllTimestamps(deltaMs: number): void
```

Scene additions (Cocos Editor, not code files):
```
GameScene (Cocos scene)
├── pauseButton (Node, new)    — Button component, Label "PAUSE", bottom-center
└── pauseOverlay (Node, new)   — UIOpacity + UITransform, two Labels, full-screen touch handler
```

### Pattern 1: Update Guard (freeze all per-frame logic)

**What:** Add a single guard at the top of `update()` to prevent any game logic when paused.
**When to use:** The earliest and safest way to freeze the game — no per-method changes needed.
**Example:**
```typescript
// In GameController.update()
update(_dt: number): void {
    if (this._phase === SessionPhase.PAUSED) return;  // ADD THIS
    if (this._phase !== SessionPhase.PLAYING) return;
    // ... existing logic unchanged ...
}
```

### Pattern 2: Timestamp Shift on Resume (zero-drift state restoration)

**What:** When the game resumes after the 3-2-1 countdown, shift all stored timestamps forward by the total pause duration so the derived elapsed values pick up exactly where they left off.
**When to use:** Resume path — called once, at the end of the resume countdown (D-12).

Three values must be shifted:
1. `gameState.sessionStartMs` — controls `isGameOver()` and `elapsedMs` in `update()`
2. All live `FlowerFSM._spawnTimestamp` values — controls `getState()` and `getScore()`
3. `this._nextSpawnMs` — controls when the next regular spawn fires

```typescript
// In GameController — called at end of resume 3-2-1
private _applyPauseOffset(deltaMs: number): void {
    this.gameState.sessionStartMs += deltaMs;
    this.grid.shiftAllTimestamps(deltaMs);
    this._nextSpawnMs += deltaMs;
}
```

```typescript
// In Grid.ts — new method
shiftAllTimestamps(deltaMs: number): void {
    for (const cell of this._cells) {
        if (cell.flower !== null) {
            cell.flower.shiftTimestamp(deltaMs);
        }
    }
}
```

```typescript
// In FlowerFSM.ts — new method (or make _spawnTimestamp non-readonly)
shiftTimestamp(deltaMs: number): void {
    (this as any)._spawnTimestamp += deltaMs;
}
// Alternatively: change `private readonly _spawnTimestamp` to `private _spawnTimestamp`
```

**Note:** `_spawnTimestamp` is currently `private readonly` in `FlowerFSM`. The cleanest approach is either (a) add a `shiftTimestamp(deltaMs)` method to FlowerFSM, or (b) change `readonly` to mutable. Option (a) preserves encapsulation and is preferred.

### Pattern 3: Urgency Blink Freeze/Restore

**What:** On pause, unschedule the blink callback (timer stops blinking). On resume after countdown, re-apply the current `_urgencyStage` via `_applyUrgencyStage()` to restart the blink if needed.
**When to use:** Whenever entering or exiting PAUSED state.

```typescript
// On pause:
if (this._blinkCallback) {
    this.unschedule(this._blinkCallback);
    // Do NOT null out _blinkCallback — keep reference for resume
}
if (this.timerLabel) this.timerLabel.node.active = true; // ensure visible while paused

// On resume (after countdown completes):
this._applyUrgencyStage(this._urgencyStage); // restarts blink at correct rate
```

**Important:** Do NOT call `_stopAllJuiceAnimations()` on pause — that resets `_urgencyStage` to 0 and clears `_blinkCallback`. Instead, perform the minimal pause freeze: unschedule blink, stop tweens on urgency-related nodes only.

### Pattern 4: Resume Countdown Reuse

**What:** Reuse the existing `countdownOverlay` + `countdownLabel` + `_startCountdown()` logic for the resume 3-2-1. The key difference: resume path does NOT call `_beginSession()` at the end — it calls `_resumeSession()` instead.
**When to use:** When player taps screen while in PAUSED state.

```typescript
private _onResumeTapped(): void {
    if (this._phase !== SessionPhase.PAUSED) return;
    if (this.pauseOverlay) this.pauseOverlay.active = false;
    this._startResumeCountdown();
}

private _startResumeCountdown(): void {
    this._phase = SessionPhase.COUNTDOWN;
    if (this.countdownOverlay) this.countdownOverlay.active = true;
    if (this.countdownLabel) this.countdownLabel.string = '3';

    this.scheduleOnce(() => {
        if (this.countdownLabel) this.countdownLabel.string = '2';
        this.scheduleOnce(() => {
            if (this.countdownLabel) this.countdownLabel.string = '1';
            this.scheduleOnce(() => {
                this._resumeSession();
            }, 1);
        }, 1);
    }, 1);
}
```

### Pattern 5: SessionPhase.PAUSED vs boolean flag

**What:** Two equivalent approaches — add `PAUSED` to the `SessionPhase` enum, or add `_isPaused: boolean` flag.
**Recommendation:** Add `PAUSED` to `SessionPhase`. The existing code already dispatches on `_phase` in multiple places (`update()` guard, `_showStartScreen()`, visibility logic). Keeping pause as a phase value means the existing dispatch points work correctly without additional boolean checks. A boolean flag would require adding `&& !this._isPaused` to every relevant guard.

```typescript
enum SessionPhase {
    WAITING,
    COUNTDOWN,
    PLAYING,
    PAUSED,      // ADD
    GAME_OVER,
}
```

### Pattern 6: Pause Button Visibility

**What:** Pause button is visible only in `SessionPhase.PLAYING`. It must be hidden/shown whenever the phase changes.
**When to use:** In every method that changes `_phase`.

```typescript
// Helper — call from _showStartScreen(), _startCountdown(), _beginSession(),
//          _onPauseTapped(), _resumeSession(), _triggerGameOver()
private _updatePauseButtonVisibility(): void {
    if (this.pauseButton) {
        this.pauseButton.node.active = (this._phase === SessionPhase.PLAYING);
    }
}
```

### Anti-Patterns to Avoid

- **Calling `director.pause()`:** Broken in this version of Cocos (CC bug #11144). Use manual phase guard instead.
- **Calling `_stopAllJuiceAnimations()` on pause:** This resets `_urgencyStage = 0` and clears `_blinkCallback`, destroying the information needed to restore the urgency state on resume. Use a targeted freeze instead.
- **Shifting timestamps at pause time instead of resume time:** If you shift at pause time, the 3-2-1 resume countdown adds additional unshifted time. D-12 explicitly requires shifting at the END of the resume countdown.
- **Using an anonymous arrow function for `_onResumeTapped`:** Cocos `Node.off()` requires the same function reference used in `Node.on()`. Store the bound handler as an instance field.
- **Forgetting `_nextSpawnMs` in the timestamp shift:** `sessionStartMs` and flower timestamps get most attention, but `_nextSpawnMs` is an absolute ms timestamp. If not shifted, the next spawn fires immediately on resume (or never, if paused near the end of a long interval).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pausing the Cocos game loop | `director.pause()` | Manual `SessionPhase.PAUSED` guard in `update()` | CC bug #11144 — director.pause() is broken for this use case |
| Storing/restoring flower states | Snapshot all FSM state to a separate object | Timestamp shift on the existing FSM timestamps | FlowerFSM is already stateless (derived) — shifting the anchor point preserves all state for free |
| A custom overlay countdown | New countdown widget | Reuse `countdownOverlay` + `countdownLabel` + existing scheduleOnce chain | Already implemented and tested; reuse avoids duplicating 15 lines of identical logic |

**Key insight:** The timestamp-based design of FlowerFSM means "pause" is not "freeze the state" but "delay the timeline." A single addition to each stored timestamp is equivalent to rewinding the clock. No FSM state snapshot needed.

---

## Runtime State Inventory

> Not a rename/refactor phase. Omitted.

---

## Common Pitfalls

### Pitfall 1: Tween still running while paused
**What goes wrong:** A combo label scale pulse or milestone fade-in is mid-flight when the player taps pause. The tween continues running, causing visible animation during the pause state.
**Why it happens:** `this.schedule()` pause is handled, but Cocos tweens (`tween()`) are not controlled by the phase guard in `update()` — they run on the engine's own scheduler.
**How to avoid:** On entering PAUSED state, call `Tween.stopAllByTarget()` for each animated node (comboLabel.node, milestoneNode, redFlashOverlay). These are already enumerated in `_stopAllJuiceAnimations()`.
**Warning signs:** Milestone banner still animating after pause overlay appears.

### Pitfall 2: Urgency blink does not restart after resume
**What goes wrong:** After the resume countdown completes, the timer is frozen on-screen (not blinking) even though the player is in stage 3 urgency.
**Why it happens:** `unschedule(_blinkCallback)` on pause stops the blink, but `_blinkCallback` is NOT re-registered on resume.
**How to avoid:** Call `_applyUrgencyStage(this._urgencyStage)` at the end of `_resumeSession()` — it re-registers the blink callback if `_urgencyStage === 3`.

### Pitfall 3: `_nextSpawnMs` not shifted — spawn fires immediately on resume
**What goes wrong:** Player pauses for 30 seconds. On resume, the next regular spawn fires instantly (or spawns a huge burst) because `_nextSpawnMs` is 30 seconds in the past.
**Why it happens:** Only `sessionStartMs` and flower timestamps are shifted; `_nextSpawnMs` is forgotten.
**How to avoid:** Include `this._nextSpawnMs += deltaMs` in `_applyPauseOffset()`.
**Warning signs:** A burst of flowers spawns on the first `update()` frame after resume.

### Pitfall 4: Pause overlay tap handler uses anonymous function
**What goes wrong:** The tap handler registered with `Node.on('touch-start', handler, this)` cannot be removed with `Node.off()` because an anonymous arrow captures a new object reference each call.
**Why it happens:** Standard JavaScript/TypeScript closure scoping.
**How to avoid:** Store the handler as `this._onResumeTapped = this._onResumeTapped.bind(this)` (or define as an arrow class field) and use the stored reference for both `on()` and `off()`.

### Pitfall 5: `schedule()`/`unschedule()` behavior — MEDIUM confidence
**What goes wrong:** Cocos `this.unschedule(callback)` may not stop the blink if the node is inactive or if the exact function reference does not match.
**Why it happens:** `_blinkCallback` is already stored as an instance field (line 101 in GameController.ts) — this is the correct pattern. But empirical testing is needed to confirm `unschedule()` works reliably when called from within a scheduled callback invocation.
**How to avoid:** Follow the existing pattern: store as `this._blinkCallback`, call `this.unschedule(this._blinkCallback)`. After unscheduling, set `this.timerLabel.node.active = true` to ensure the timer label is visible (it may have been toggled off mid-blink).
**Warning signs:** Timer label remains invisible after pause is entered.

### Pitfall 6: Resume tap triggers during COUNTDOWN (resume countdown itself)
**What goes wrong:** Player taps screen during the 3-2-1 resume countdown, triggering `_onResumeTapped()` again, causing a double countdown.
**Why it happens:** The touch listener is still active on the full-screen node while the resume countdown is running.
**How to avoid:** Guard `_onResumeTapped()` with `if (this._phase !== SessionPhase.PAUSED) return;` — the phase transitions to `COUNTDOWN` as soon as resume begins, so the guard naturally blocks double triggers.

---

## Code Examples

Verified patterns from existing codebase:

### Existing blink callback pattern (GameController.ts lines 358-362)
```typescript
// Source: BloomTap/assets/scripts/GameController.ts
this._blinkCallback = () => {
    this._blinkVisible = !this._blinkVisible;
    if (this.timerLabel) this.timerLabel.node.active = this._blinkVisible;
};
this.schedule(this._blinkCallback, 0.25);
```
The pause unschedule must use the same `this._blinkCallback` reference:
```typescript
if (this._blinkCallback) {
    this.unschedule(this._blinkCallback);
    // Do NOT null it out — keep reference for resume reschedule
}
```

### Existing Tween stop pattern (GameController.ts lines 372-374)
```typescript
// Source: BloomTap/assets/scripts/GameController.ts
if (this.milestoneNode) Tween.stopAllByTarget(this.milestoneNode);
if (this.redFlashOverlay) Tween.stopAllByTarget(this.redFlashOverlay);
if (this.comboLabel) Tween.stopAllByTarget(this.comboLabel.node);
```

### Existing scheduleOnce countdown chain (GameController.ts lines 413-421)
```typescript
// Source: BloomTap/assets/scripts/GameController.ts
this.scheduleOnce(() => {
    if (this.countdownLabel) this.countdownLabel.string = '2';
    this.scheduleOnce(() => {
        if (this.countdownLabel) this.countdownLabel.string = '1';
        this.scheduleOnce(() => {
            this._beginSession();  // resume path calls _resumeSession() instead
        }, 1);
    }, 1);
}, 1);
```

### FlowerFSM — timestamp access (FlowerFSM.ts lines 14, 28)
```typescript
// Source: BloomTap/assets/scripts/logic/FlowerFSM.ts
private readonly _spawnTimestamp: number;  // currently readonly — needs method or readonly removal
// ...
const elapsed = nowMs - this._spawnTimestamp;
```
For the timestamp shift, add to FlowerFSM:
```typescript
shiftTimestamp(deltaMs: number): void {
    (this as unknown as { _spawnTimestamp: number })._spawnTimestamp += deltaMs;
}
```
Or simply change `private readonly` to `private` and access via a `shiftTimestamp` method.

### Grid — iterating all cells (Grid.ts lines 69-71)
```typescript
// Source: BloomTap/assets/scripts/logic/Grid.ts
for (const cell of this._cells) {
    cell.flower = null;  // existing clearAll() pattern
}
// New shiftAllTimestamps() follows identical iteration pattern
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `director.pause()` | Manual phase guard + timestamp shift | CC bug #11144 (pre-Phase 9) | Must use manual approach — engine API is broken |
| Mutable accumulated state | Timestamp-derived state (FlowerFSM) | Phase 1 design | Pause is free — just shift the anchor timestamp |

**Deprecated/outdated:**
- `director.pause()` / `director.resume()`: Do not use. Confirmed broken for this project (STATE.md decision: "[v1.1 Arch]: `director.pause()` confirmed broken (CC bug #11144)").

---

## Open Questions

1. **`this.unschedule()` reliability during pause**
   - What we know: `_blinkCallback` is stored as an instance field — this is the correct pattern per Cocos docs. `unschedule()` matches by function reference.
   - What's unclear: Whether `unschedule()` behaves correctly when called from a touch handler (not from within a scheduled callback). STATE.md flags this as MEDIUM confidence.
   - Recommendation: Implement as designed; verify empirically in Cocos Editor during human-verify checkpoint. Add `timerLabel.node.active = true` as a safety net after unscheduling.

2. **`FlowerFSM._spawnTimestamp` readonly — best approach for shift**
   - What we know: Currently `private readonly`. TypeScript prevents direct mutation. Options: (a) add `shiftTimestamp(deltaMs)` method, (b) remove `readonly`.
   - What's unclear: Which approach the team prefers for encapsulation.
   - Recommendation: Add `shiftTimestamp(deltaMs: number): void` method to FlowerFSM. This is testable, encapsulated, and does not break the `readonly` intent for external callers.

---

## Validation Architecture

> `nyquist_validation: true` in `.planning/config.json` — section included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (vitest.config.ts at project root) |
| Config file | `E:\workspace\ProjectAI\vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose BloomTap/assets/scripts/logic/FlowerFSM.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PAUSE-01 | `FlowerFSM.shiftTimestamp(deltaMs)` shifts derived state correctly | unit | `npx vitest run --reporter=verbose BloomTap/assets/scripts/logic/FlowerFSM.test.ts` | ❌ Wave 0 |
| PAUSE-01 | `Grid.shiftAllTimestamps(deltaMs)` applies shift to all live flowers | unit | `npx vitest run --reporter=verbose BloomTap/assets/scripts/logic/Grid.test.ts` | ✅ (file exists, new tests needed) |
| PAUSE-01 | Timestamp shift preserves `isGameOver()` boundary (no time lost/gained) | unit | `npx vitest run --reporter=verbose BloomTap/assets/scripts/logic/GameState.test.ts` | ✅ (file exists, new tests needed) |
| PAUSE-01 | Scene UI + blink freeze/restore | manual | Cocos Editor human-verify checkpoint | N/A |

**Note:** `vitest.config.ts` includes `BloomTap/assets/scripts/logic/**/*.test.ts` — all logic tests run with `npx vitest run`. GameController scene wiring (pause button visibility, overlay, resume countdown) is not unit-testable without Cocos and requires human-verify.

### Sampling Rate
- **Per task commit:** `npx vitest run BloomTap/assets/scripts/logic/FlowerFSM.test.ts BloomTap/assets/scripts/logic/Grid.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `FlowerFSM.test.ts` — add tests for new `shiftTimestamp(deltaMs)` method (file exists, needs new describe block)
- [ ] `Grid.test.ts` — add tests for new `shiftAllTimestamps(deltaMs)` method (file exists, needs new describe block)
- [ ] `GameState.test.ts` — add test: "sessionStartMs shift preserves isGameOver boundary" (file exists, needs one new test)

*(Existing test infrastructure covers all other phase requirements. Framework install not needed.)*

---

## Sources

### Primary (HIGH confidence)
- `BloomTap/assets/scripts/GameController.ts` — Full source read; `SessionPhase`, `update()`, `_applyUrgencyStage()`, `_blinkCallback`, `_startCountdown()`, `_beginSession()`, `_stopAllJuiceAnimations()`
- `BloomTap/assets/scripts/logic/FlowerFSM.ts` — Full source read; `_spawnTimestamp` readonly field, `getState()` derivation
- `BloomTap/assets/scripts/logic/GameState.ts` — Full source read; `sessionStartMs`, `isGameOver()`, `reset()`
- `BloomTap/assets/scripts/logic/Grid.ts` — Full source read; cell iteration, `spawnFlower()`, `clearAll()`
- `.planning/STATE.md` — Confirmed CC bug #11144 (`director.pause()` broken), `_applyPauseOffset` named pattern established in v1.1 arch decisions
- `.planning/phases/09-pause-system/09-CONTEXT.md` — All implementation decisions D-01 through D-12

### Secondary (MEDIUM confidence)
- `BloomTap/assets/scripts/logic/GameState.test.ts` — Verified Vitest pattern, `vi.spyOn(performance, 'now')` mock approach for timestamp tests
- `vitest.config.ts` — Confirmed test include glob: `BloomTap/assets/scripts/logic/**/*.test.ts`

### Tertiary (LOW confidence)
- STATE.md note on `schedule()`/`unschedule()` reliability: "MEDIUM confidence — verify empirically that `this.unschedule(blinkCallback)` stops urgency blink without deactivating the game node" — no external verification source available; must be confirmed in Editor

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all APIs already in use
- Architecture: HIGH — patterns derived directly from reading the full GameController.ts source
- Pitfalls: HIGH (except Pitfall 5 blink scheduler = MEDIUM) — most pitfalls directly verifiable from source code
- Timestamp shift correctness: HIGH — mathematical derivation from FlowerFSM's stateless design

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable codebase, no external dependencies)
