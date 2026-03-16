# Phase 6: Results and Persistence - Research

**Researched:** 2026-03-16
**Domain:** Cocos Creator TypeScript — game-over overlay, localStorage persistence, session stats
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**1. Results screen content and layout**
- Vertical list (top-to-bottom): Score (large, dominant) → Highscore row → Best combo → Accuracy
- All in existing `gameOverOverlay` Node; new Labels added as children
- NOT shown: Time, flower type breakdown, multiplier peak

**2. Session stats tracking — GameState extension**
- Add `correctTaps`, `wrongTaps`, `peakStreak` to GameState
- `applyCorrectTap()` increments `correctTaps`, checks `combo.tapCount > peakStreak` after `combo.onCorrectTap()`
- `applyWrongTap()` increments `wrongTaps`
- `reset()` zeroes all three
- `totalTaps` derived as `correctTaps + wrongTaps` (not stored)

**3. "New highscore!" celebration**
- Trigger: `finalScore > currentHighscore` (strictly greater, ties do not celebrate)
- Sequence: overlay opens → score shows → 0.5s delay → "NEW BEST!" label appears (scale-pop 0→1.2→1.0, yellow)
- Stays visible until restart
- Fires every time player beats their stored highscore

**4. StorageService (static class)**
- Interface: `static get(key: string): string | null` and `static set(key: string, value: string): void`
- Key prefix: `"bloomtap_"` (caller passes `"highscore"`, stored as `"bloomtap_highscore"`)
- Error handling: silent fail — try/catch wraps all localStorage calls
- No Cocos imports in this file

**5. First-run / zero state**
- Highscore row hidden (`node.active = false`, not opacity) when `StorageService.get('highscore') === null`
- Revealed on first beat if `finalScore > 0`
- Score = 0 edge case: do NOT save, row stays hidden
- Label text format: `"Highscore: 1200"`

### Claude's Discretion

None specified — all decisions are locked.

### Deferred Ideas (OUT OF SCOPE)
- Persistent leaderboard / cloud sync → post-v1
- "Share score" button → post-v1
- Session replay / stats history → out of scope v1
- Animated score counter (count up from 0 to final value) → deferred
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RSLT-01 | Results screen shows session score + all-time highscore | GameController._triggerGameOver() wired to StorageService.get(); new Label @property refs in gameOverOverlay |
| RSLT-02 | Player can restart immediately from results screen | onRestartTapped() already wired to restartButton; must zero new stats (correctTaps, wrongTaps, peakStreak) |
| RSLT-03 | Highscore persists across browser refreshes via localStorage | StorageService wraps localStorage with "bloomtap_" prefix + silent-fail try/catch |
</phase_requirements>

---

## Summary

Phase 6 is the final v1 phase. The codebase is fully built and tested at 92% complete; all prior phases are verified. The work is narrowly scoped: extend one pure-logic class (GameState), create one new pure-logic class (StorageService), wire four new Label nodes into the existing game-over overlay in GameScene, and update GameController's game-over and restart paths.

No new framework patterns are needed. All Cocos patterns used in this phase (tween scale-pop, scheduleOnce, @property wiring, node.active) are established in Phases 4 and 5. The primary risk is the `peakStreak` update ordering inside `applyCorrectTap` — it must read `combo.tapCount` AFTER `combo.onCorrectTap()` is called, because `onCorrectTap()` increments the tap count. The CONTEXT.md spec confirms this ordering.

**Primary recommendation:** Implement in two waves — Wave 0 adds StorageService + GameState stats extension with full unit tests; Wave 1 wires scene nodes and GameController game-over / restart logic. Scene modification is the only Cocos-specific step and cannot be unit tested.

---

## Standard Stack

### Core (already in use — no new installs)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Cocos Creator | 3.8.x | Game engine — tween, scheduleOnce, @property, Node | Locked from Phase 1 |
| TypeScript | 5.x | Type safety | Locked from Phase 1 |
| Vitest | 3.2.4 | Unit test runner | Already configured, 140 tests green |

### Supporting
No new libraries. `StorageService` uses browser-native `localStorage` directly — no wrapper library needed.

**Installation:**
```bash
# Nothing to install — all dependencies already present
```

---

## Architecture Patterns

### Recommended Project Structure

```
BloomTap/assets/scripts/
├── logic/
│   ├── GameState.ts          # MODIFY — add correctTaps, wrongTaps, peakStreak
│   ├── StorageService.ts     # NEW — no cc imports, pure localStorage wrapper
│   └── StorageService.test.ts  # NEW — unit tests for StorageService
├── GameController.ts         # MODIFY — game-over + restart logic
BloomTap/assets/scene/
└── GameScene.scene           # MODIFY — add 4 Label nodes in gameOverOverlay
```

### Pattern 1: Static StorageService Class

**What:** A thin, static, no-framework wrapper around `localStorage` with a fixed key prefix and silent error swallowing.

**When to use:** All reads/writes of persisted data — never call `localStorage` directly in GameController.

**Why static:** GameController.ts doesn't need to instantiate it; static methods keep the call site clean and avoid passing a service reference around.

**Example:**
```typescript
// StorageService.ts — no 'cc' imports
export class StorageService {
    private static readonly PREFIX = 'bloomtap_';

    static get(key: string): string | null {
        try {
            return localStorage.getItem(StorageService.PREFIX + key);
        } catch {
            return null;
        }
    }

    static set(key: string, value: string): void {
        try {
            localStorage.setItem(StorageService.PREFIX + key, value);
        } catch {
            // silent fail — game continues without persistence
        }
    }
}
```

### Pattern 2: GameState Stats Extension

**What:** Three new fields added to the existing `GameState` class. `peakStreak` update ordering is critical.

**Ordering rule (CRITICAL):** In `applyCorrectTap`, call `combo.onCorrectTap()` FIRST, THEN compare `combo.tapCount > this.peakStreak`. The `onCorrectTap()` method increments `tapCount`, so reading before calling it would always miss the newly achieved streak count.

**Example:**
```typescript
applyCorrectTap(rawScore: number, combo: ComboSystem): void {
    this.correctTaps += 1;
    this.score += Math.round(rawScore * combo.multiplier);
    combo.onCorrectTap();                               // increments tapCount first
    if (combo.tapCount > this.peakStreak) {
        this.peakStreak = combo.tapCount;               // then capture peak
    }
}

applyWrongTap(combo: ComboSystem): void {
    this.wrongTaps += 1;
    this.score -= WRONG_TAP_PENALTY;
    combo.onWrongTap();
}

reset(): void {
    this.score = 0;
    this.sessionStartMs = performance.now();
    this.correctTaps = 0;
    this.wrongTaps = 0;
    this.peakStreak = 0;
}
```

### Pattern 3: Game-Over Flow with Storage + Celebration

**What:** `_triggerGameOver()` expanded to read/write highscore and optionally trigger "NEW BEST!" celebration.

**Example:**
```typescript
private _triggerGameOver(): void {
    this._stopAllJuiceAnimations();
    this._phase = SessionPhase.GAME_OVER;
    if (this.gridRenderer) this.gridRenderer.setInputEnabled(false);
    this.grid.clearAll();
    if (this.hudNode) this.hudNode.active = false;

    const finalScore = Math.floor(this.gameState.score);
    const stored = StorageService.get('highscore');
    const currentBest = stored ? parseInt(stored, 10) : null;

    // Save highscore if new best (score > 0 guard)
    const isNewBest = finalScore > 0 && (currentBest === null || finalScore > currentBest);
    if (isNewBest) {
        StorageService.set('highscore', String(finalScore));
    }

    // Show overlay
    if (this.gameOverOverlay) this.gameOverOverlay.active = true;
    if (this.finalScoreLabel) {
        this.finalScoreLabel.string = `Score: ${finalScore}`;
    }

    // Highscore label — only show if a highscore exists after this session
    const newBestValue = isNewBest ? finalScore : currentBest;
    if (this.highscoreLabel) {
        if (newBestValue !== null) {
            this.highscoreLabel.node.active = true;
            this.highscoreLabel.string = `Highscore: ${newBestValue}`;
        } else {
            this.highscoreLabel.node.active = false;
        }
    }

    // Best combo + accuracy labels
    const totalTaps = this.gameState.correctTaps + this.gameState.wrongTaps;
    const accuracy = totalTaps > 0
        ? Math.round((this.gameState.correctTaps / totalTaps) * 100)
        : 0;
    if (this.bestComboLabel) {
        this.bestComboLabel.string = `Best combo: ${this.gameState.peakStreak}`;
    }
    if (this.accuracyLabel) {
        this.accuracyLabel.string =
            `${this.gameState.correctTaps} / ${totalTaps} taps (${accuracy}%)`;
    }

    // "NEW BEST!" celebration — 0.5s delay
    if (isNewBest && this.newBestLabel) {
        this.newBestLabel.node.active = false;
        this.scheduleOnce(() => {
            if (!this.newBestLabel) return;
            this.newBestLabel.node.active = true;
            const labelNode = this.newBestLabel.node;
            labelNode.setScale(0, 0, 1);
            tween(labelNode)
                .to(0.15, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'backOut' })
                .to(0.10, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'cubicOut' })
                .start();
        }, 0.5);
    }
}
```

### Pattern 4: In-Place Restart (Existing Pattern — Extended)

**What:** `onRestartTapped()` already exists. Phase 6 adds zeroing of the three new GameState fields. The method must NOT call `gameState.reset()` directly because `reset()` also calls `performance.now()` for `sessionStartMs` — session starts again only in `_beginSession()`.

**Correct approach:** Zero the new fields explicitly in `onRestartTapped()` the same way `score` is zeroed there today:
```typescript
public onRestartTapped(): void {
    this.gameState.score = 0;
    this.gameState.correctTaps = 0;
    this.gameState.wrongTaps = 0;
    this.gameState.peakStreak = 0;
    this.comboSystem.onWrongTap();
    this.grid.clearAll();
    if (this.newBestLabel) this.newBestLabel.node.active = false;
    if (this.gridRenderer) this.gridRenderer.setInputEnabled(false);
    this._showStartScreen();
}
```

### Anti-Patterns to Avoid

- **Calling `gameState.reset()` in `onRestartTapped()`:** `reset()` sets `sessionStartMs = performance.now()` — this would start the 120s timer immediately without the countdown. The existing pattern zeros score directly; extend that pattern.
- **Reading `combo.tapCount` BEFORE `combo.onCorrectTap()`:** The tapCount hasn't been incremented yet; `peakStreak` would be 1 behind.
- **Using `parseInt` without radix 10:** `parseInt('08')` without radix behaves unpredictably in older environments. Always pass `parseInt(stored, 10)`.
- **Calling `localStorage` directly in GameController:** Breaks the StorageService abstraction and will cause the FB Instant Games swap (post-v1) to require invasive GameController surgery.
- **Setting `highscoreLabel.node.opacity = 0` instead of `.active = false`:** Opacity-hidden nodes still occupy layout space in Cocos Creator's Widget/Layout system. Use `active = false` as specified.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scale-pop tween | Custom lerp loop in update() | Cocos `tween(...).to(...)` with `backOut` easing | Already proven in Phase 5 milestone celebration; `tween` handles cleanup |
| Delayed callback | Manual frame counter | `scheduleOnce(fn, 0.5)` | Cocos lifecycle-safe; auto-cancels on node destroy |
| Float parsing | Custom string parser | `parseInt(stored, 10)` | Native, always radix-safe |

---

## Common Pitfalls

### Pitfall 1: peakStreak Captured Before Increment
**What goes wrong:** `peakStreak` is always 1 behind the actual peak because `combo.tapCount` is read before `combo.onCorrectTap()` increments it.
**Why it happens:** The developer reads `combo.tapCount` first (following the "read before mutate" pattern used for `rawScore` in correct tap handling), but `tapCount` is not consumed by `collect()` — it's safe to read after `onCorrectTap()`.
**How to avoid:** Call `combo.onCorrectTap()` first, then compare `combo.tapCount`.
**Warning signs:** Unit test: after 3 consecutive correct taps, `peakStreak` reads 2 instead of 3.

### Pitfall 2: localStorage Throws in Private Browsing / Storage Quota
**What goes wrong:** `localStorage.setItem` throws `DOMException: QuotaExceededError` (private browsing in Safari sets quota to 0), crashing the game.
**Why it happens:** localStorage is unavailable or full.
**How to avoid:** All localStorage calls must be inside `try/catch`. StorageService already enforces this.
**Warning signs:** Game crashes on game-over in Safari Private Mode.

### Pitfall 3: parseInt Without Radix on Stored Score
**What goes wrong:** If stored score string ever starts with `0` (e.g., edge case `"0800"`), `parseInt('0800')` without radix could be misinterpreted.
**Why it happens:** Missing radix argument.
**How to avoid:** Always use `parseInt(stored, 10)`.

### Pitfall 4: newBestLabel Not Hidden on Restart
**What goes wrong:** "NEW BEST!" label remains visible on screen when player returns to start screen and begins a new session.
**Why it happens:** `onRestartTapped()` resets game state but doesn't set `newBestLabel.node.active = false`.
**How to avoid:** Explicitly hide the node in `onRestartTapped()`.
**Warning signs:** Second session starts with "NEW BEST!" already showing.

### Pitfall 5: Accuracy Division by Zero
**What goes wrong:** `correctTaps / totalTaps` throws `NaN` if player never tapped (totalTaps = 0).
**Why it happens:** Edge case — timer expires before any input.
**How to avoid:** Guard: `totalTaps > 0 ? Math.round(...) : 0`.

### Pitfall 6: Scene Node Not Wired → Silent Null
**What goes wrong:** New `@property` refs (highscoreLabel, bestComboLabel, etc.) are declared in code but not dragged into Inspector → all null → labels silently never update.
**Why it happens:** Cocos Creator @property wiring is a manual editor step that is easy to forget.
**How to avoid:** Verification wave must test each label's string value; null-check guards in code ensure no crash but would mask missing wiring.

---

## Code Examples

### StorageService — full implementation
```typescript
// Source: CONTEXT.md §4 — locked decision
// BloomTap/assets/scripts/logic/StorageService.ts
export class StorageService {
    private static readonly PREFIX = 'bloomtap_';

    static get(key: string): string | null {
        try {
            return localStorage.getItem(StorageService.PREFIX + key);
        } catch {
            return null;
        }
    }

    static set(key: string, value: string): void {
        try {
            localStorage.setItem(StorageService.PREFIX + key, value);
        } catch {
            // silent fail
        }
    }
}
```

### StorageService unit tests — representative cases
```typescript
// StorageService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageService } from './StorageService';

describe('StorageService', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('returns null when key not set', () => {
        expect(StorageService.get('highscore')).toBeNull();
    });

    it('stores and retrieves value with prefix', () => {
        StorageService.set('highscore', '1200');
        expect(StorageService.get('highscore')).toBe('1200');
        // Direct localStorage check to confirm prefix
        expect(localStorage.getItem('bloomtap_highscore')).toBe('1200');
    });

    it('returns null when localStorage.getItem throws', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('storage unavailable');
        });
        expect(StorageService.get('highscore')).toBeNull();
    });

    it('does not throw when localStorage.setItem throws', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('quota exceeded');
        });
        expect(() => StorageService.set('highscore', '1200')).not.toThrow();
    });
});
```

### GameState stats extension — representative new tests
```typescript
// Addition to GameState.test.ts
describe('Phase 6 stats', () => {
    it('correctTaps starts at 0', () => {
        expect(state.correctTaps).toBe(0);
    });

    it('applyCorrectTap increments correctTaps', () => {
        state.applyCorrectTap(80, combo);
        expect(state.correctTaps).toBe(1);
    });

    it('applyWrongTap increments wrongTaps', () => {
        state.applyWrongTap(combo);
        expect(state.wrongTaps).toBe(1);
    });

    it('peakStreak tracks highest combo.tapCount after onCorrectTap', () => {
        state.applyCorrectTap(80, combo); // tapCount becomes 1
        state.applyCorrectTap(80, combo); // tapCount becomes 2
        state.applyCorrectTap(80, combo); // tapCount becomes 3
        expect(state.peakStreak).toBe(3);
    });

    it('peakStreak does not decrease after wrong tap', () => {
        state.applyCorrectTap(80, combo); // tapCount 1
        state.applyCorrectTap(80, combo); // tapCount 2
        state.applyWrongTap(combo);       // tapCount resets to 0
        expect(state.peakStreak).toBe(2);
    });

    it('reset() zeroes correctTaps, wrongTaps, peakStreak', () => {
        state.applyCorrectTap(80, combo);
        state.applyWrongTap(combo);
        state.reset();
        expect(state.correctTaps).toBe(0);
        expect(state.wrongTaps).toBe(0);
        expect(state.peakStreak).toBe(0);
    });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Scene reload on restart | In-place state reset | Phase 4 (locked) | All nodes persist; new fields must be zeroed in onRestartTapped() as well as _beginSession() |
| Direct localStorage calls | StorageService abstraction | Phase 6 (this phase) | Clean swap surface for FB Instant Games post-v1 |

**Deprecated/outdated:**
- No deprecated patterns in scope.

---

## Open Questions

1. **Vitest environment has localStorage?**
   - What we know: `vitest.config.ts` sets `environment: 'node'`; Node does not provide `localStorage` natively.
   - What's unclear: Will `localStorage` be available in StorageService tests without a DOM environment?
   - Recommendation: Use `environment: 'jsdom'` in the test file or add a `localStorage` mock in `beforeEach`. The simplest approach: `vi.stubGlobal('localStorage', { getItem: ..., setItem: ... })` or switch the single test file to jsdom environment via a per-file config comment `// @vitest-environment jsdom`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` (workspace root) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RSLT-01 | Results screen shows score + highscore | unit (StorageService read logic) + manual (scene labels visible) | `npx vitest run --reporter=verbose` | ❌ Wave 0: StorageService.test.ts |
| RSLT-02 | Restart resets all stats to 0 | unit (GameState.reset() + new fields) | `npx vitest run BloomTap/assets/scripts/logic/GameState.test.ts` | ❌ Wave 0: extend GameState.test.ts |
| RSLT-03 | Highscore persists (localStorage) | unit (StorageService round-trip) | `npx vitest run BloomTap/assets/scripts/logic/StorageService.test.ts` | ❌ Wave 0: StorageService.test.ts |

RSLT-01 scene wiring (label display) is manual-only: no headless DOM test can verify Cocos scene node visibility.

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite (140 + new tests) green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `BloomTap/assets/scripts/logic/StorageService.test.ts` — covers RSLT-03 + RSLT-01 storage path
- [ ] Extend `BloomTap/assets/scripts/logic/GameState.test.ts` — covers RSLT-02 (correctTaps, wrongTaps, peakStreak, reset)
- [ ] Resolve localStorage in Vitest node environment: either `vi.stubGlobal` mock or `// @vitest-environment jsdom` per-file header

---

## Sources

### Primary (HIGH confidence)
- Direct code reading: `GameController.ts`, `GameState.ts`, `JuiceHelpers.ts` — all patterns verified from live source
- `CONTEXT.md` Phase 6 — all decisions locked by user
- `vitest.config.ts` + existing `.test.ts` files — test infrastructure confirmed running (140 tests green)

### Secondary (MEDIUM confidence)
- Cocos Creator 3.x `tween` API — patterns confirmed from Phase 5 implementation in `GameController.ts` (`_playMilestoneCelebration`, `_playRedFlash`)
- `scheduleOnce` API — confirmed in `_startCountdown` usage in GameController

### Tertiary (LOW confidence)
- None — all findings are from direct code inspection of the live codebase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; existing stack fully visible in source files
- Architecture: HIGH — implementation patterns extracted directly from existing working code
- Pitfalls: HIGH — derived from CONTEXT.md decisions and direct code analysis; one (Pitfall 1 peakStreak ordering) directly verifiable from ComboSystem.ts behavior
- localStorage silent-fail: HIGH — specified verbatim in CONTEXT.md §4

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable stack — Cocos Creator 3.x, no fast-moving dependencies)
