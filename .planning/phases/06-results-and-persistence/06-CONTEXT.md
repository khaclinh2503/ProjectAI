# Phase 6 Context: Results and Persistence

**Phase goal:** After every session, player sees score, knows all-time best, and can restart immediately.
**Requirements:** RSLT-01, RSLT-02, RSLT-03
**Depends on:** Phase 5 complete (all juice/polish wired)

---

## Decisions

### 1. Results screen content and layout

**What to show (dọc, top-to-bottom):**
1. **Score** — large, visually dominant (existing `finalScoreLabel`)
2. **Highscore row** — `"Highscore: X"` label (hidden until first highscore exists — see §4)
3. **Best combo** — `"Best combo: X"` where X = max streak (integer, not multiplier value)
4. **Accuracy** — `"X / Y taps (Z%)"` where X = correct taps, Y = total taps, Z = X/Y×100 rounded

**Layout:** Vertical list, all in the existing `gameOverOverlay` Node. New Labels added as children.

**What NOT to show:** Time, flower type breakdown, multiplier peak — keep it tight.

---

### 2. Session stats tracking — GameState extension

`GameState` currently only tracks `score` and `sessionStartMs`. Phase 6 must add:

```typescript
correctTaps: number = 0;
wrongTaps: number = 0;
peakStreak: number = 0;
```

- `applyCorrectTap()` increments `correctTaps`, then checks `combo.tapCount > peakStreak` after `combo.onCorrectTap()` to update `peakStreak`
- `applyWrongTap()` increments `wrongTaps`
- `reset()` zeroes all three new fields alongside existing score reset

`totalTaps` is derived: `correctTaps + wrongTaps` (not stored — computed at display time).

---

### 3. "New highscore!" celebration

**Trigger condition:** `finalScore > currentHighscore` (strictly greater — ties do not celebrate)

**Sequence:**
1. Overlay opens → score label shows immediately (existing behavior)
2. ~0.5s delay (`scheduleOnce` at 0.5s)
3. "NEW BEST!" Label appears above score row — yellow color, scale-pop tween (0→1.2→1.0)
4. Celebration stays visible until restart (no auto-hide)

**Every beat triggers celebration** — if player beats highscore in session 2, 3, 4, each time shows "NEW BEST!"

**"NEW BEST!" Label:** New `@property` node in `gameOverOverlay`, `.active = false` by default. GameController sets `.active = true` and plays tween in the delayed callback.

---

### 4. StorageService

**Interface (static class):**
```typescript
class StorageService {
    static get(key: string): string | null
    static set(key: string, value: string): void
}
```

**Key prefix:** All keys auto-prefixed with `"bloomtap_"` internally — callers pass `"highscore"`, stored as `"bloomtap_highscore"`.

**Error handling:** Silent fail — `try/catch` wraps all localStorage calls. `get` returns `null` on error; `set` swallows error silently. Game continues without persistence (no crash, no user feedback).

**Usage in GameController:**
```typescript
// Read on game-over
const stored = StorageService.get('highscore');
const currentBest = stored ? parseInt(stored, 10) : null;

// Write if new best
if (finalScore > 0 && (currentBest === null || finalScore > currentBest)) {
    StorageService.set('highscore', String(Math.floor(finalScore)));
}
```

---

### 5. First-run / zero state

**Highscore row hidden when no highscore stored** (`StorageService.get('highscore') === null`).

**Hidden means:** `highscoreLabel.node.active = false` — not just opacity, so layout doesn't reserve space.

**Reveal on first beat:** If `currentBest === null` and `finalScore > 0` → save highscore → set `highscoreLabel.node.active = true` → show value → trigger "NEW BEST!" celebration (same flow as any other beat).

**Score = 0 edge case:** Do NOT save highscore if `finalScore <= 0`. Row stays hidden.

**Label text format:** `"Highscore: 1200"` (not "Best:", not icon)

---

## Code Context

**Files to modify:**
- `BloomTap/assets/scripts/logic/GameState.ts` — add `correctTaps`, `wrongTaps`, `peakStreak` fields; update `applyCorrectTap`, `applyWrongTap`, `reset`
- `BloomTap/assets/scripts/GameController.ts` — add `@property` refs for new labels + "NEW BEST!" node; update `_triggerGameOver()` for storage + celebration logic; update `onRestartTapped()` to zero new stats

**New file:**
- `BloomTap/assets/scripts/StorageService.ts` — static class, no Cocos imports

**Scene to modify:**
- `BloomTap/assets/scene/GameScene.scene` — add new Label nodes inside `gameOverOverlay`: `highscoreLabel`, `bestComboLabel`, `accuracyLabel`, `newBestLabel`

**Existing @property already wired (do not re-add):**
- `gameOverOverlay: Node` ✓
- `finalScoreLabel: Label` ✓
- `restartButton: Button` ✓

**Architecture constraint (locked Phase 4 decision):** In-place reset — no scene reload on restart. `onRestartTapped()` continues to reset state in-place.

**Architecture constraint (locked Phase 4 decision):** StorageService is a thin localStorage wrapper now. Full FB Instant Games swap is post-v1.

---

## Deferred Ideas

- Persistent leaderboard / cloud sync → post-v1
- "Share score" button → post-v1
- Session replay / stats history → out of scope v1
- Animated score counter (count up from 0 to final value) → not requested, defer if desired
