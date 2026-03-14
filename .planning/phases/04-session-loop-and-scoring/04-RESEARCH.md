# Phase 4: Session Loop and Scoring - Research

**Researched:** 2026-03-14
**Domain:** Cocos Creator 3.x — session state machine, HUD Labels, overlay Nodes, combo streak display, session timer, game-over flow, restart flow
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Session start flow:**
- Trigger: Người chơi phải bấm nút "Start" trên màn hình — không auto-start
- Trước khi Start: Màn hình chờ với nút "Start" ở giữa, grid visible nhưng trống (không spawn)
- Sau khi tap Start: Hiện countdown **3 → 2 → 1** (animation số đếm ngược) rồi bắt đầu session
- Countdown duration: ~1 giây mỗi số (tổng ~3 giây trước khi game bắt đầu)

**Session timer:**
- Implementation: `sessionStartMs = performance.now()` khi countdown kết thúc — nhất quán với FlowerFSM pattern
- Duration: Chính xác 120,000ms
- Display format: Số giây nguyên, đếm ngược: "120" → "0"
- Không dùng: Cocos `dt` accumulation (đã reject ở Phase 2 — gây drift)

**Game-over behavior (Phase 4 scope):**
- Trigger: Khi `elapsed >= 120,000ms`
- Hành động ngay lập tức:
  1. Dừng spawn hoa mới
  2. Freeze grid — tắt hoàn toàn TOUCH_START trên tất cả 64 cell node
  3. Không nhận bất kỳ tap nào nữa
- Overlay hiển thị: "Game Over" + final score (số nguyên)
- Nút: Một nút "Chơi lại" — reset toàn bộ state và quay về Start Screen
- Không có: Highscore display (Phase 6), animation kết quả (Phase 6)

**Restart flow:**
- Tap "Chơi lại": Reset GameState (score=0), reset ComboSystem (multiplier=1, streak=0), clear toàn bộ Grid (tất cả 64 cell = empty), ẩn Game Over overlay, hiển thị Start Screen
- Không reload page — in-place reset

**HUD layout:**
- Vị trí: Phía trên grid, dạng 1 hàng ngang
- 3 phần tử: Score (trái), Timer (giữa), Combo (phải)

**Score display:**
- Format: Số nguyên, ví dụ "1240"
- Update: Realtime sau mỗi tap (ngay lập tức, không delay)
- Phase 4 scope: Số cập nhật đúng, không animation

**Timer display:**
- Format: Số giây nguyên đếm ngược: "120", "119", ..., "1", "0"
- Màu: Không đổi màu trong Phase 4
- Update: Mỗi giây (floor của ms elapsed)

**Combo display:**
- Format: Hiển thị số lần tap đúng liên tiếp — ví dụ "Combo x7"
- Update: Realtime sau mỗi tap
- Reset visual: Khi tap sai, số về 0 ngay lập tức
- Phase 4 scope: Số cập nhật đúng, không animation

### Claude's Discretion

- Exact Cocos Label node sizing, font size, color cho HUD elements
- Layout của Start Screen (nút Start ở đâu chính xác, có text hướng dẫn không)
- Countdown animation implementation (tween scale hay đơn giản label update)
- Game Over overlay styling (màu nền, kích thước, bo góc)
- Exact pixel spacing giữa HUD và grid top edge

### Deferred Ideas (OUT OF SCOPE)

- Score count-up animation (số chạy lên khi +điểm) — Phase 5 JUICE-02
- Score label phóng to nhất thời khi +điểm cao — Phase 5 JUICE-02
- Combo flash/animation khi streak tăng — Phase 5 JUICE-03
- Timer đổi màu đỏ hoặc nhấp nháy 15 giây cuối — Phase 5 JUICE-04
- Persistent highscore qua localStorage — Phase 6 RSLT-03
- Proper results screen với highscore comparison — Phase 6 RSLT-01
- Phase transition visual cue (audio/visual khi bước vào phase 2 và 3) — v2 POLSH-02
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GAME-04 | Tap đúng liên tiếp tăng combo multiplier; điểm tap đó được nhân với multiplier hiện tại | `ComboSystem.tapCount` getter đã có — expose as `tapStreak` via alias or new getter for HUD display; `applyCorrectTap()` already applies multiplier |
| GAME-05 | Tap sai reset combo multiplier về 1 | `ComboSystem.onWrongTap()` already resets — HUD update on wrong tap path in GameController |
| SESS-01 | Mỗi ván chính xác 120 giây | `GameState.sessionStartMs` + `performance.now()` pattern; `isGameOver()` method needed on GameState; check `elapsed >= 120_000` in `GameController.update()` |
| SESS-02 | Giai đoạn 1 (0–40s): spawn ngẫu nhiên chậm | `SpawnManager.getPhaseConfig()` already returns Phase 1 config (intervalMs=3000, maxAlive=8) — session loop drives elapsed time to this |
| SESS-03 | Giai đoạn 2 (40–80s): spawn đều ở tốc độ vừa | `SpawnManager.getPhaseConfig()` Phase 2 config (intervalMs=2000, maxAlive=16) — automatic via elapsed time |
| SESS-04 | Giai đoạn 3 (80–120s): làn sóng spawn nhanh dồn dập | `SpawnManager.getPhaseConfig()` Phase 3 config (intervalMs=1000, maxAlive=28) — automatic via elapsed time |
| SESS-05 | Ván kết thúc khi timer về 0 | Game-over trigger at `elapsed >= 120_000` — stop spawn, freeze input, show overlay |
| HUD-01 | Điểm số hiển thị và cập nhật realtime | `cc.Label` node wired to GameController; update `label.string` after each tap call |
| HUD-02 | Countdown timer hiển thị suốt ván | `cc.Label` polled every frame in `update()` via `Math.floor((120_000 - elapsed) / 1000)` |
| HUD-03 | Combo multiplier hiện trên màn và có animation khi tăng | `cc.Label` showing `ComboSystem.tapCount` (streak); animation deferred to Phase 5 — Phase 4 delivers correct number only |
</phase_requirements>

---

## Summary

Phase 4 builds the session state machine on top of the already-working logic tier (Phase 2) and renderer (Phase 3). The core additions are: (1) a session start/countdown flow using a `cc.Node` overlay with a `cc.Button` and a `cc.Label` for countdown, (2) a timer loop in `GameController.update()` that reads `performance.now()` and drives game-over when elapsed >= 120,000ms, (3) three `cc.Label` nodes in a HUD row above the grid (score, timer, combo), and (4) a game-over overlay Node with final score display and a "Chơi lại" button that performs an in-place full state reset.

The session state machine has four states: `WAITING` (start screen visible, grid empty, no spawning), `COUNTDOWN` (3-2-1 tick, grid visible but input still off), `PLAYING` (spawning active, input live, HUD updating), and `GAME_OVER` (spawn stopped, input frozen, overlay visible). All state is held on `GameController` as a `SessionPhase` enum. No new pure-logic classes are needed — `GameState`, `ComboSystem`, `SpawnManager`, and `GridRenderer` already exist and are extended only minimally.

The key addition to pure logic is `ComboSystem.tapCount` — already exposed as a getter (`tapCount`) and used as the "streak" number for HUD display. `GameState` needs one new method: `isGameOver(nowMs)` which returns `nowMs - sessionStartMs >= 120_000`. `GridRenderer` needs one new public method: `setInputEnabled(enabled: boolean)` that calls `node.off()` / `node.on()` on each of the 64 cell nodes to freeze/unfreeze touch.

**Primary recommendation:** Implement a `SessionPhase` enum on `GameController` to drive four states; extend `GridRenderer` with `setInputEnabled()`; add 3 Label nodes to GameScene in HUD row; use `scheduleOnce()` chain for countdown ticks; update HUD labels in `GameController.update()`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `cc.Label` | Cocos Creator 3.8 built-in | Score, Timer, Combo text display | Standard Cocos UI text component; string assignment is instant |
| `cc.Button` | Cocos Creator 3.8 built-in | "Start" and "Chơi lại" button | Provides click/touch handling with hitbox automatically sized to node |
| `cc.Node` (overlay) | Cocos Creator 3.8 built-in | Start Screen overlay and Game Over overlay | Set `node.active = true/false` to show/hide; zero cost when inactive |
| `performance.now()` | Browser/Node built-in | Session timer source of truth | Already used throughout codebase; locked decision from Phase 2 |
| `cc.Component.scheduleOnce()` | Cocos Creator 3.8 built-in | Countdown tick (1s intervals) | Engine-managed timer; consistent with Phase 3 flash timer pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `cc.tween` | Cocos Creator 3.8 built-in | Countdown number scale animation | Optional (Claude's discretion) — only if planner chooses animated countdown; fallback is plain label.string update |
| `cc.UITransform` | Cocos Creator 3.8 built-in | Button hit area sizing | Required for Button nodes to detect touches correctly |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `node.active = false` to hide overlays | `node.opacity = 0` | Inactive nodes skip `update()` calls and are invisible to hit testing — preferred; opacity=0 still receives touches |
| `scheduleOnce()` chain for countdown | `setInterval` / `setTimeout` | Engine scheduler auto-cancels on component destroy and is frame-synchronized; browser timers are not |
| `node.off(Node.EventType.TOUCH_START)` to freeze input | Checking a flag inside touch handler | `off()` is O(64) one-time; flag-check is O(64) every frame — `off()`/`on()` is cleaner for freeze/unfreeze |

**Installation:** No additional packages required — all APIs are built into Cocos Creator 3.8.

---

## Architecture Patterns

### Session State Machine

```
SessionPhase enum:
  WAITING    → Start Screen overlay visible, no spawning, no input
  COUNTDOWN  → Countdown overlay shows 3/2/1, no spawning, no input
  PLAYING    → HUD visible, spawning active, input live
  GAME_OVER  → Spawn stopped, input frozen, Game Over overlay visible
```

Transitions:
- `WAITING → COUNTDOWN`: tap "Start" button
- `COUNTDOWN → PLAYING`: after third `scheduleOnce` fires (3 seconds total)
- `PLAYING → GAME_OVER`: `update()` detects `elapsed >= 120_000`
- `GAME_OVER → WAITING`: tap "Chơi lại" button

### Recommended Project Structure

```
BloomTap/assets/scripts/
├── logic/
│   ├── GameState.ts          — ADD: isGameOver(nowMs): boolean method
│   ├── ComboSystem.ts        — tapCount getter already exists (tapStreak = tapCount)
│   └── ... (unchanged)
├── GameController.ts         — ADD: SessionPhase enum, session state machine,
│                                    HUD label @property refs, overlay @property refs,
│                                    countdown logic, game-over trigger
├── GridRenderer.ts           — ADD: setInputEnabled(enabled: boolean) method
└── ... (unchanged)
```

**Scene additions needed in GameScene.scene:**
```
GameScene
├── Canvas
│   ├── HUD (Node)
│   │   ├── ScoreLabel (Label)      — left
│   │   ├── TimerLabel (Label)      — center
│   │   └── ComboLabel (Label)      — right
│   ├── GridContainer (existing)
│   ├── StartScreenOverlay (Node)   — active=true initially
│   │   ├── StartLabel (Label)      — "Bloom Tap" or title
│   │   └── StartButton (Button+Label)
│   ├── CountdownOverlay (Node)     — active=false initially
│   │   └── CountdownLabel (Label)  — shows "3", "2", "1", "GO!"
│   └── GameOverOverlay (Node)      — active=false initially
│       ├── GameOverTitle (Label)   — "Game Over"
│       ├── FinalScoreLabel (Label) — "Score: XXXX"
│       └── RestartButton (Button+Label) — "Chơi lại"
```

### Pattern 1: Session State Machine on GameController

**What:** `GameController` owns a `SessionPhase` enum field. All phase-dependent logic (spawning gate, input gate, HUD visibility, overlay visibility) reads this field.

**When to use:** Whenever behavior depends on which session phase is active.

**Example:**
```typescript
// Source: existing GameController.ts pattern extended
enum SessionPhase {
    WAITING,
    COUNTDOWN,
    PLAYING,
    GAME_OVER,
}

@ccclass('GameController')
export class GameController extends Component {
    // ... existing @property fields ...
    @property(Label) scoreLabel:    Label | null = null;
    @property(Label) timerLabel:    Label | null = null;
    @property(Label) comboLabel:    Label | null = null;
    @property(Node)  startOverlay:  Node  | null = null;
    @property(Node)  countdownOverlay: Node | null = null;
    @property(Label) countdownLabel: Label | null = null;
    @property(Node)  gameOverOverlay: Node | null = null;
    @property(Label) finalScoreLabel: Label | null = null;

    private _phase: SessionPhase = SessionPhase.WAITING;

    onLoad(): void {
        // Do NOT call gameState.reset() here — reset happens on Start tap
        if (this.gridRenderer) {
            this.gridRenderer.init(this.grid, this);
            this.gridRenderer.setInputEnabled(false); // input off until PLAYING
        }
        this._showStartScreen();
    }

    update(_dt: number): void {
        if (this._phase !== SessionPhase.PLAYING) return;
        const nowMs = performance.now();
        const elapsedMs = nowMs - this.gameState.sessionStartMs;

        // Game-over check
        if (this.gameState.isGameOver(nowMs)) {
            this._triggerGameOver();
            return;
        }

        // SpawnManager tick (existing logic unchanged)
        if (nowMs >= this._nextSpawnMs) {
            // ... existing spawn logic ...
        }

        // HUD update
        this._updateHUD(elapsedMs);
    }
}
```

### Pattern 2: Countdown via scheduleOnce Chain

**What:** Three chained `scheduleOnce()` calls, each 1 second apart, update the countdown label. The third fires the session start.

**When to use:** Countdown from WAITING → COUNTDOWN → PLAYING transition.

**Example:**
```typescript
// Source: Cocos Creator 3.8 Scheduler docs — scheduleOnce pattern
private _startCountdown(): void {
    this._phase = SessionPhase.COUNTDOWN;
    if (this.startOverlay) this.startOverlay.active = false;
    if (this.countdownOverlay) this.countdownOverlay.active = true;
    if (this.countdownLabel) this.countdownLabel.string = '3';

    this.scheduleOnce(() => {
        if (this.countdownLabel) this.countdownLabel.string = '2';
        this.scheduleOnce(() => {
            if (this.countdownLabel) this.countdownLabel.string = '1';
            this.scheduleOnce(() => {
                this._beginSession();
            }, 1);
        }, 1);
    }, 1);
}

private _beginSession(): void {
    if (this.countdownOverlay) this.countdownOverlay.active = false;
    this.gameState.reset();                           // sets sessionStartMs = performance.now()
    this._nextSpawnMs = performance.now();
    if (this.gridRenderer) this.gridRenderer.setInputEnabled(true);
    this._phase = SessionPhase.PLAYING;
}
```

### Pattern 3: HUD Label Update in update()

**What:** HUD labels are updated every frame in `update()` when `_phase === PLAYING`. Timer uses integer floor of remaining seconds; combo uses `comboSystem.tapCount`.

**When to use:** Always for live HUD display during a session.

**Example:**
```typescript
// Source: codebase pattern — existing debugScoreLabel update adapted
private _updateHUD(elapsedMs: number): void {
    const remainingSecs = Math.max(0, Math.floor((120_000 - elapsedMs) / 1000));
    if (this.timerLabel)  this.timerLabel.string  = `${remainingSecs}`;
    if (this.scoreLabel)  this.scoreLabel.string  = `${Math.floor(this.gameState.score)}`;
    if (this.comboLabel)  this.comboLabel.string  = `Combo x${this.comboSystem.tapCount}`;
}
```

### Pattern 4: GridRenderer.setInputEnabled()

**What:** Public method on GridRenderer that iterates all 64 cell views and calls `node.off()` or `node.on()` for `TOUCH_START`.

**When to use:** Call with `false` when entering COUNTDOWN or GAME_OVER; call with `true` when entering PLAYING.

**Example:**
```typescript
// Source: existing GridRenderer.ts touch registration pattern
setInputEnabled(enabled: boolean): void {
    for (const view of this._cellViews) {
        if (enabled) {
            // Re-register the handler (must use consistent listener reference)
            view.node.on(Node.EventType.TOUCH_START, () => {
                this._onCellTapped(view);
            }, this);
        } else {
            view.node.off(Node.EventType.TOUCH_START);
        }
    }
}
```

**CRITICAL NOTE:** Using anonymous arrow functions in both `on()` and `off()` will fail — `off()` with no specific listener removes ALL TOUCH_START listeners on the node, which is acceptable here since GridRenderer is the only TOUCH_START registrant. However, calling `on()` again after `off()` creates duplicate listeners. The safer pattern is to track an `_inputEnabled: boolean` flag and check it at the start of `_onCellTapped()` instead:

```typescript
// Safer alternative — no listener add/remove, no duplicate risk
private _inputEnabled: boolean = false;

setInputEnabled(enabled: boolean): void {
    this._inputEnabled = enabled;
}

private _onCellTapped(view: CellView): void {
    if (!this._inputEnabled) return;  // gate at top
    if (view.isFlashing) return;
    // ... rest of existing tap logic
}
```

This approach is simpler, zero-risk of duplicate listeners, and consistent with the `isFlashing` guard pattern already in the codebase.

### Pattern 5: Game-Over Trigger and In-Place Reset

**What:** Game-over is detected in `update()`, overlays swapped, state frozen. Restart performs full in-place reset without page reload.

**When to use:** PLAYING → GAME_OVER transition; GAME_OVER → WAITING on restart tap.

**Example:**
```typescript
private _triggerGameOver(): void {
    this._phase = SessionPhase.GAME_OVER;
    if (this.gridRenderer) this.gridRenderer.setInputEnabled(false);
    // Clear all remaining flowers so grid shows empty on restart
    // (optional: could also leave grid as-is for visual continuity)
    if (this.gameOverOverlay) this.gameOverOverlay.active = true;
    if (this.finalScoreLabel) {
        this.finalScoreLabel.string = `Score: ${Math.floor(this.gameState.score)}`;
    }
}

public onRestartTapped(): void {
    // Called by "Chơi lại" Button click handler
    this.gameState.score = 0;              // reset score
    this.comboSystem.onWrongTap();         // resets multiplier=1, tapCount=0
    this.grid.clearAll();                  // clear all 64 cells
    if (this.gameOverOverlay) this.gameOverOverlay.active = false;
    if (this.gridRenderer) {
        this.gridRenderer.setInputEnabled(false);
        this.gridRenderer.clearAllCells(); // repaint 64 cells to empty state
    }
    this._showStartScreen();
}

private _showStartScreen(): void {
    this._phase = SessionPhase.WAITING;
    if (this.startOverlay) this.startOverlay.active = true;
}
```

### Anti-Patterns to Avoid

- **Auto-starting session in onLoad():** Call `gameState.reset()` only when countdown ends — not in `onLoad()`. Current `GameController.onLoad()` calls `reset()` — this must be removed and moved to `_beginSession()`.
- **Using dt accumulation for the session timer:** Already locked out. Always compute `elapsed = performance.now() - gameState.sessionStartMs`.
- **Calling `gridRenderer.setInputEnabled(false)` after `update()` detects game-over:** The same `update()` frame may still process queued touch events. Set phase flag AND disable input in the same synchronous call.
- **Showing HUD while in WAITING or COUNTDOWN:** HUD node should be `active=false` until PLAYING begins; otherwise timer shows "120" before player starts.
- **Re-adding touch listeners on re-enable without removing first:** If using `on()`/`off()` pattern (not the flag pattern), calling `on()` twice registers duplicate listeners causing double score on single tap.
- **Not calling `grid.clearAll()` on restart:** If flowers remain in Grid logic tier but GridRenderer shows empty cells, state mismatch causes ghost tap behavior.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Countdown timer | Manual second-accumulation in update() | `scheduleOnce()` chained 3×1s | Engine timer is simpler; no state variable needed for countdown seconds |
| Button tap detection | Canvas-level touch + coordinate check | `cc.Button` component with click event | Button handles UITransform hit area automatically; no coordinate math |
| Overlay show/hide | opacity/color transitions | `node.active = true/false` | Inactive nodes are free (no update calls, no touch); simpler than opacity |
| "Remaining seconds" computation | Custom floor/ceil logic | `Math.floor((120_000 - elapsed) / 1000)` | One-liner; clamp with `Math.max(0, ...)` for the last frame edge case |
| Input freeze | Per-frame flag check everywhere | Single `_inputEnabled` flag at top of `_onCellTapped()` | Already the correct pattern per existing `isFlashing` guard; one check, zero overhead |

**Key insight:** Session state management is a simple enum + node activation pattern. The temptation to build custom transition systems or coroutines is unnecessary — Cocos Creator's `scheduleOnce`, `node.active`, and a plain enum cover all Phase 4 needs.

---

## Common Pitfalls

### Pitfall 1: gameState.reset() Called in onLoad()

**What goes wrong:** `GameController.onLoad()` currently calls `this.gameState.reset()` which sets `sessionStartMs = performance.now()`. If the session timer check runs in `update()` immediately, elapsed time begins counting before the player taps Start.

**Why it happens:** Phase 3 had no session concept — `reset()` in `onLoad()` was fine there.

**How to avoid:** Remove `gameState.reset()` from `onLoad()`. Move it to `_beginSession()` (fires after countdown). Set `_phase = SessionPhase.WAITING` initially and guard `update()` spawn/timer logic with `if (_phase !== SessionPhase.PLAYING) return`.

**Warning signs:** Timer reaches 0 seconds before player taps Start; game-over fires immediately.

---

### Pitfall 2: _nextSpawnMs Not Reset on Restart

**What goes wrong:** On restart, `_nextSpawnMs` still holds the old timestamp from the previous session. On the new session start, `performance.now() >= _nextSpawnMs` is immediately true, causing an instant burst of spawns.

**Why it happens:** `_nextSpawnMs` is a private timestamp, not reset during in-place restart.

**How to avoid:** In `_beginSession()`, reset: `this._nextSpawnMs = performance.now() + this.spawnManager.getPhaseConfig(0).intervalMs`. This delays first spawn by one full interval (3000ms in Phase 1).

**Warning signs:** On second playthrough, grid floods with flowers in the first second.

---

### Pitfall 3: Grid Not Cleared on Restart

**What goes wrong:** The `Grid` logic tier still has living `FlowerFSM` instances from the previous session. `GridRenderer.update()` polls these and repaints cells as colored flowers. The start screen appears over a grid full of flowers from the previous game.

**Why it happens:** `onRestartTapped()` only hides the overlay but doesn't call `grid.clearAll()`.

**How to avoid:** On restart, call `this.grid.clearAll()` (need to add this method to `Grid.ts` if it doesn't exist — see Open Questions). Then immediately repaint all cells to empty via `gridRenderer.clearAllCells()` or let `update()` handle it on the next frame (it will see `cell.flower === null` and paint empty).

**Warning signs:** Start screen shows over partially-filled grid; on second game start, old flowers are still visible.

---

### Pitfall 4: Button Click vs Touch_Start Mismatch

**What goes wrong:** "Start" and "Chơi lại" buttons use `cc.Button` with a click handler, but `GameController` may not correctly wire the button click callback in scene setup.

**Why it happens:** Cocos Creator Button click events can be wired in scene inspector (Click Events array) or in code. If wired in inspector, the method must be `public` on a component attached to the same node. If wired in code via `node.on(Button.EventType.CLICK)`, the import must be correct.

**How to avoid:** Wire button click handlers in `GameController.onLoad()` using:
```typescript
// Source: Cocos Creator 3.8 Button docs
this.startButton?.node.on(Button.EventType.CLICK, this._onStartTapped, this);
this.restartButton?.node.on(Button.EventType.CLICK, this.onRestartTapped, this);
```
Make callback methods `public` for potential inspector wiring.

**Warning signs:** Tapping the Start button has no effect; no errors in console.

---

### Pitfall 5: HUD Visible Before Session Starts

**What goes wrong:** HUD node (Score/Timer/Combo labels) is active during WAITING and COUNTDOWN states. Timer shows "120" and score shows "0" before play begins — confusing and aesthetically wrong.

**Why it happens:** HUD node starts `active=true` in the scene.

**How to avoid:** Set the HUD node to `active=false` in the scene. In `_beginSession()`, set `hudNode.active = true`. In `_triggerGameOver()` or `onRestartTapped()`, set `hudNode.active = false`.

**Warning signs:** "120" timer visible on the Start Screen.

---

### Pitfall 6: Game-Over Fires on the Exact 120,000ms Frame

**What goes wrong:** SpawnManager's defensive fallback at `elapsedMs >= 120_000` returns Phase 3 config instead of stopping. If `update()` checks `isGameOver()` AFTER the spawn tick, one extra flower may spawn in the game-over frame.

**Why it happens:** Order of operations in `update()` — spawn tick runs before game-over check.

**How to avoid:** Check game-over FIRST in `update()` before any spawn logic. If `isGameOver()`, call `_triggerGameOver()` and return immediately — do not enter the spawn block.

**Warning signs:** One extra flower appears at the exact moment game-over triggers.

---

## Code Examples

### GameState.isGameOver() Addition

```typescript
// Source: existing GameState.ts pattern — pure TypeScript, no cc imports
export const SESSION_DURATION_MS: number = 120_000;

// Add to GameState class:
isGameOver(nowMs: number): boolean {
    return (nowMs - this.sessionStartMs) >= SESSION_DURATION_MS;
}
```

### Grid.clearAll() Addition

```typescript
// Source: existing Grid.ts pattern — pure TypeScript
// Add to Grid class:
clearAll(): void {
    for (const cell of this._cells) {
        cell.flower = null;
    }
}
```

### SessionPhase Enum + GameController Skeleton

```typescript
// Source: existing GameController.ts extended with session state machine
enum SessionPhase { WAITING, COUNTDOWN, PLAYING, GAME_OVER }

@ccclass('GameController')
export class GameController extends Component {
    @property(GridRenderer) gridRenderer: GridRenderer | null = null;
    @property(Node)  hudNode:             Node  | null = null;
    @property(Label) scoreLabel:          Label | null = null;
    @property(Label) timerLabel:          Label | null = null;
    @property(Label) comboLabel:          Label | null = null;
    @property(Node)  startOverlay:        Node  | null = null;
    @property(Button) startButton:        Button | null = null;
    @property(Node)  countdownOverlay:    Node  | null = null;
    @property(Label) countdownLabel:      Label | null = null;
    @property(Node)  gameOverOverlay:     Node  | null = null;
    @property(Label) finalScoreLabel:     Label | null = null;
    @property(Button) restartButton:      Button | null = null;

    private _phase: SessionPhase = SessionPhase.WAITING;
    // ... rest unchanged
}
```

### HUD Update — Minimal Overhead Pattern

```typescript
// Source: existing debugScoreLabel pattern adapted
private _lastDisplayedSecond: number = -1;  // throttle label writes

private _updateHUD(elapsedMs: number): void {
    // Score: update every frame (changes only on tap — cheap string assign)
    if (this.scoreLabel) {
        this.scoreLabel.string = `${Math.floor(this.gameState.score)}`;
    }
    // Combo: update every frame (changes only on tap)
    if (this.comboLabel) {
        this.comboLabel.string = `Combo x${this.comboSystem.tapCount}`;
    }
    // Timer: only update Label.string when the second changes
    const remainingSecs = Math.max(0, Math.floor((120_000 - elapsedMs) / 1000));
    if (remainingSecs !== this._lastDisplayedSecond) {
        this._lastDisplayedSecond = remainingSecs;
        if (this.timerLabel) this.timerLabel.string = `${remainingSecs}`;
    }
}
```

### GridRenderer.setInputEnabled() — Flag Pattern

```typescript
// Source: existing _onCellTapped() guard pattern in GridRenderer.ts
private _inputEnabled: boolean = false;

setInputEnabled(enabled: boolean): void {
    this._inputEnabled = enabled;
}

// In _onCellTapped() — add as FIRST guard (before isFlashing check):
private _onCellTapped(view: CellView): void {
    if (!this._inputEnabled) return;   // NEW: session gate
    if (view.isFlashing) return;       // existing guard
    // ... rest unchanged
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `dt` accumulation for session timer | `performance.now() - sessionStartMs` | Phase 2 decision (locked) | Eliminates 60fps float drift over 120s |
| `cc.find()` to locate nodes at runtime | `@property` decorator + scene wiring | Cocos Creator 3.x | `@property` is inspector-visible, type-safe, and resolved at scene load |
| `director.loadScene()` for restart | In-place state reset | Phase 4 decision (locked) | No scene reload cost; no flicker; preserves node references |

**Deprecated/outdated:**
- `debugScoreLabel` on `GameController`: Replace with proper `scoreLabel` in HUD — the debug label was Phase 3 temporary scaffolding.

---

## Open Questions

1. **Does `Grid` have a `clearAll()` method?**
   - What we know: `Grid.clearCell(cell)` exists (used in Phase 3). No `clearAll()` observed in Grid.ts.
   - What's unclear: Whether iterating `_cells` directly is safe or an accessor is needed.
   - Recommendation: Add `clearAll(): void` that sets `cell.flower = null` for all 64 cells. Pure TypeScript, no Cocos dependency — safe to add to logic tier.

2. **Should the HUD be a separate Node or part of Canvas directly?**
   - What we know: Claude's discretion per CONTEXT.md. Scene hierarchy is flexible.
   - Recommendation: Single `HUD` Node containing 3 Label children. `@property(Node) hudNode` on GameController controls visibility. Simpler to show/hide as a unit than 3 separate active flags.

3. **Countdown animation: tween scale vs plain string update?**
   - What we know: Claude's discretion. `cc.tween` works reliably on Node scale (not Graphics.fillColor).
   - Recommendation: Plain `countdownLabel.string = '3'` with no tween for Phase 4. Phase 5 can add scale punch as JUICE-03 equivalent. Plain update is simpler, zero risk of tween conflict with the scheduleOnce chain.

4. **Button import path in Cocos Creator 3.8?**
   - What we know: `Button` is imported from `'cc'` same as `Label`, `Node`. Used in `@property(Button)` declarations.
   - Recommendation: `import { ..., Button } from 'cc'` — same import source as all other Cocos components.

---

## Validation Architecture

> `nyquist_validation` is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `E:/workspace/ProjectAI/vitest.config.ts` |
| Quick run command | `npx vitest run` (from workspace root `E:/workspace/ProjectAI/`) |
| Full suite command | `npx vitest run --coverage` |

**Note:** Vitest covers only `BloomTap/assets/scripts/logic/**/*.test.ts`. All `cc`-dependent code (GameController, GridRenderer, overlays, Labels) is verified via Cocos Creator preview (manual). New logic-tier additions (`GameState.isGameOver()`, `Grid.clearAll()`) ARE testable in Vitest.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GAME-04 | Correct taps increment combo; score multiplied by multiplier | unit | `npx vitest run` | ✅ `logic/ComboSystem.test.ts` + `logic/GameState.test.ts` |
| GAME-05 | Wrong tap resets combo to multiplier=1 | unit | `npx vitest run` | ✅ `logic/ComboSystem.test.ts` + `logic/GameState.test.ts` |
| SESS-01 | Session is exactly 120,000ms; `isGameOver()` triggers at >= 120_000ms | unit | `npx vitest run` | ❌ Wave 0: add to `logic/GameState.test.ts` |
| SESS-02 | Phase 1 (0–40s) uses intervalMs=3000, maxAlive=8 | unit | `npx vitest run` | ✅ `logic/SpawnManager.test.ts` |
| SESS-03 | Phase 2 (40–80s) uses intervalMs=2000, maxAlive=16 | unit | `npx vitest run` | ✅ `logic/SpawnManager.test.ts` |
| SESS-04 | Phase 3 (80–120s) uses intervalMs=1000, maxAlive=28 | unit | `npx vitest run` | ✅ `logic/SpawnManager.test.ts` |
| SESS-05 | Timer reaches 0 and game ends | manual-only | N/A — requires Cocos runtime + session wait | Wave 0 not applicable |
| HUD-01 | Score label shows correct integer after each tap | manual-only | N/A — requires Cocos runtime | Wave 0 not applicable |
| HUD-02 | Timer label counts down correctly per second | manual-only | N/A — requires Cocos runtime | Wave 0 not applicable |
| HUD-03 | Combo label shows correct tapCount number | manual-only | N/A — ComboSystem.tapCount logic verified by existing tests | Wave 0 not applicable |

### Sampling Rate

- **Per task commit:** `npx vitest run` (from `E:/workspace/ProjectAI/`)
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green + manual Cocos Creator preview session playthrough (start → 120s → game over → restart) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `BloomTap/assets/scripts/logic/GameState.ts` — add `isGameOver(nowMs: number): boolean` and `SESSION_DURATION_MS` constant
- [ ] `BloomTap/assets/scripts/logic/GameState.test.ts` — add tests for `isGameOver()`: returns false before 120_000ms, true at exactly 120_000ms, true after 120_000ms
- [ ] `BloomTap/assets/scripts/logic/Grid.ts` — add `clearAll(): void` method
- [ ] `BloomTap/assets/scripts/logic/Grid.test.ts` — add test for `clearAll()`: all 64 cells have `flower === null` after call

*(Cocos-dependent code — GameController session state machine, overlay nodes, HUD Labels, Button wiring — is not testable in Vitest. Covered by manual Cocos Creator preview verification.)*

---

## Sources

### Primary (HIGH confidence)

- Existing codebase: `BloomTap/assets/scripts/logic/GameState.ts` — `sessionStartMs`, `reset()`, `getElapsedMs()` — verified via direct read
- Existing codebase: `BloomTap/assets/scripts/logic/ComboSystem.ts` — `tapCount` getter confirmed present — verified via direct read
- Existing codebase: `BloomTap/assets/scripts/GameController.ts` — current `onLoad()`, `update()`, spawn loop — verified via direct read
- Existing codebase: `BloomTap/assets/scripts/GridRenderer.ts` — `_onCellTapped()`, `_registerCellTouch()`, `isFlashing` guard pattern — verified via direct read
- Existing codebase: `BloomTap/assets/scripts/logic/SpawnManager.ts` — PHASE_CONFIGS confirmed; defensive fallback at >= 120_000ms — verified via direct read
- Phase 3 RESEARCH.md — `scheduleOnce()` pattern, Graphics flash pattern, `node.active` for overlays — verified via direct read
- Project STATE.md — `performance.now()` timing lock, in-place reset decision, pure-logic tier separation — verified via direct read
- Project CONTEXT.md (Phase 4) — All locked decisions, discretion areas, deferred scope — verified via direct read
- Cocos Creator 3.8 — `cc.Label`, `cc.Button`, `cc.Node.active` are standard built-in components (HIGH confidence from prior Phase 3 research establishing Cocos 3.8 API baseline)

### Secondary (MEDIUM confidence)

- Cocos Creator 3.8 Manual — Button component: https://docs.cocos.com/creator/3.8/manual/en/ui-system/components/editor/button.html — `Button.EventType.CLICK` wiring pattern
- Cocos Creator 3.8 Manual — Label component: https://docs.cocos.com/creator/3.8/manual/en/ui-system/components/editor/label.html — `label.string` assignment API

### Tertiary (LOW confidence)

- None — all critical claims verified with official sources or existing codebase.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all APIs (`Label`, `Button`, `scheduleOnce`, `node.active`) are built-in Cocos Creator 3.8; verified via Phase 3 research and existing codebase patterns
- Architecture: HIGH — session state machine is a straightforward enum + boolean flags extension of existing GameController; all integration points confirmed by reading actual source files
- Pitfalls: HIGH — derived from direct code inspection (e.g., `onLoad()` currently calls `reset()`, `_nextSpawnMs` not reset on restart identified from source)
- HUD patterns: HIGH — `Label.string` assignment is a trivial API; `@property` wiring is the established Cocos pattern already used for `debugScoreLabel` and `gridRenderer`

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable Cocos Creator 3.8 API — 30-day window)
