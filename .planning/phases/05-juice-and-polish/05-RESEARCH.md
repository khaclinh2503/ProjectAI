# Phase 5: Juice and Polish — Research

**Researched:** 2026-03-15
**Domain:** Cocos Creator 3.8 — tween API, node object pooling, Label opacity/color animation, full-screen overlay, blink scheduling, tween cleanup
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**JUICE-01: Tap Pulse**
- Tap bình thường (đúng hoặc sai): Scale 1.0 → ~1.1 → 1.0, duration 80ms, easing về discretion của Claude
- FULL_BLOOM tap (≥95% điểm — tức FlowerState.FULL_BLOOM): Pulse 120ms + ripple lan ra 4 ô lân cận (up/down/left/right) — ô lân cận pulse nhẹ hơn cell gốc
- Tap sai: Pulse bình thường 80ms — không ripple

**JUICE-02: Score Float Label**
- Nội dung: Chỉ hiển thị điểm — ví dụ "+120", không kèm "x3"
- Font size: Tỉ lệ với multiplier hiện tại — combo càng cao → chữ càng to
- Tap sai: Hiển thị "-30" màu đỏ (penalty amount)
- Hướng bay: Thẳng lên từ cell vừa tap + lắc ngang nhẹ (wobble)
- Duration: Tỉ lệ với multiplier, tối đa 1 giây, fade out cuối animation
- Xuất phát: Từ giữa cell vừa tap

**JUICE-03: Combo Break & Milestone Flash**
Khi tap sai (combo break):
- Combo label chớp nhanh rồi fade out (biến mất, về "Combo x0")
- Full-screen red overlay: ~20% opacity, thoáng qua 150ms, rồi fade out
- Cell flash đỏ: đã có từ Phase 3 (giữ nguyên)

Khi combo tăng (tap đúng liên tiếp):
- Combo label pulse nhẹ (scale nhỏ, nhanh) mỗi khi số tăng

Milestone combos — x10, x25, x50:
- Trigger mid-screen celebration: text lớn ("COMBO x10!") + particle burst hoặc glow effect
- Không freeze timer — visual only
- Ngưỡng: x10, x25, x50 — mỗi lần chỉ trigger 1 lần (không repeat)

**JUICE-04: Timer Urgency Escalation**
- Bình thường (>60s còn lại): Trắng, size bình thường, HUD bình thường
- Urgency 1 (≤60s còn lại): Vàng, to hơn nhẹ, HUD không đổi
- Urgency 2 (≤30s còn lại): Cam, to hơn nữa, HUD không đổi
- Urgency 3 (≤10s còn lại): Đỏ + blink nhanh, to nhất, toàn HUD thay đổi
- Transition giữa các mốc: instant (không tween màu), chỉ tween scale nếu muốn smooth

### Claude's Discretion

- Easing curve cho tap pulse và ripple
- Wobble magnitude và curve của score float
- Font size scale ratio theo multiplier (ví dụ: x1=24px, x2=28px, x3=32px...)
- Particle burst style cho milestone celebration (Cocos tween-based hay particle system)
- Timer size cụ thể ở mỗi mốc urgency (ví dụ 1.0x → 1.2x → 1.4x → 1.6x)
- Blink interval ở ≤10s (ví dụ 250ms on/off)
- HUD Urgency 3 styling cụ thể (màu background, border glow, shake...)
- Object pool size cho score float labels (đề xuất: pool 8–10 nodes)

### Deferred Ideas (OUT OF SCOPE)

- Combo Milestone Timer Freeze: Khi đạt x10, x25, x50 → timer dừng 10 giây (hoa vẫn phát triển bình thường). Đây là mechanic mới thay đổi game balance, cần phase riêng hoặc v2.
- Score count-up animation (số chạy lên) — nếu Phase 5 cảm thấy cần thêm
- Phase transition visual/audio khi bước vào Phase 2 và Phase 3 difficulty — v2 POLSH-02
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| JUICE-01 | Ô tap scale phồng lên rồi về khi nhấn (scale pulse ~100ms) — 80ms bình thường, 120ms FULL_BLOOM + ripple 4 ô lân cận | `tween(cellNode).to(0.04, {scale: Vec3(1.1,1.1,1)}, {easing:'cubicOut'}).to(0.04, {scale: Vec3(1,1,1)}).start()` trên `cellNode`; ripple = 4 tween riêng biệt cùng lúc với scale nhẹ hơn (1.07x) |
| JUICE-02 | Điểm nổi lên từ ô hoa vừa tap ("+120" float animation), font size theo multiplier, "-30" đỏ khi sai, wobble, fade out | Pool 8 Label nodes; `tween(floatNode)` kết hợp `position` (lên) + `UIOpacity.opacity` (fade); label.color cho đỏ/trắng; release về pool trong `call()` callback |
| JUICE-03 | Visual flash khi tap sai và combo bị reset — combo label chớp, full-screen red overlay, milestone celebration | `tween(comboLabel)` với sequence blink + `.call()` reset; overlay Node với `UIOpacity` tween 0→51→0 (20%); milestone = tween scale trên mid-screen Label node |
| JUICE-04 | Timer đổi màu hoặc nhấp nháy trong 15 giây cuối — 3 mốc escalation với color + scale + blink ở ≤10s | `_updateTimerUrgency(remainingSecs)` trong `_updateHUD()`; blink = `this.schedule(callback, 0.25)` + `this.unschedule()` khi out of Urgency 3; instant color via `timerLabel.color = new Color(...)` |
</phase_requirements>

---

## Summary

Phase 5 delivers four categories of game-feel enhancement: tap pulse (JUICE-01), score float (JUICE-02), combo break/milestone feedback (JUICE-03), and timer urgency escalation (JUICE-04). All effects use only built-in Cocos Creator 3.8 APIs — `tween()`, `schedule()`, `UIOpacity`, and `Label` — with no external libraries and no particle system assets required.

The central technical challenge is the score float label pool (JUICE-02). Because BloomTap's Phase 3 established a strict rule against creating Nodes in the hot loop (STATE.md Pitfall 3), score floats must be pre-created as a pool of 8–10 `Label` nodes inside `GridRenderer` (or a dedicated `AnimationSystem` component), checked out on tap, and returned after the animation completes. Tween cleanup on game-over is handled with `Tween.stopAllByTarget(node)` per pooled node plus `unscheduleAllCallbacks()` on the host component.

The tween API in Cocos Creator 3.8 is fully adequate for every Phase 5 effect: `tween(node).to()` chains for scale pulse and float path; `parallel()` for simultaneous scale + position on the same node; `repeatForever()` or `schedule()` for the timer blink; `Tween.stopAllByTarget()` for cleanup. The only opacity-tweening subtlety is that Label and Node do not expose a direct `opacity` tween target — you must tween `UIOpacity.opacity` by getting the `UIOpacity` component reference.

**Primary recommendation:** Implement `playTapPulse(row, col, isFullBloom)` and `spawnScoreFloat(row, col, amount, multiplier)` on `GridRenderer`; add a `ScoreFloatPool` inner class within `GridRenderer`; add `playComboBreak()` and `playMilestoneCelebration(count)` on `GameController`; extend `_updateHUD()` with `_updateTimerUrgency(remainingSecs)`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `tween` / `Tween` | Cocos Creator 3.8 built-in | All animation — scale pulse, float path, fade, blink, celebration | Engine tween system; `tween(target)` is the standard animation primitive in Cocos Creator 3.x |
| `Vec3` | Cocos Creator 3.8 built-in | Scale and position targets in tween calls | Required type for `node.scale` and `node.position` tween targets in 3.x |
| `UIOpacity` | Cocos Creator 3.8 built-in | Opacity animation on Label nodes and overlay Node | In Cocos Creator 3.x, `Label.color.a` alone cannot be tweened to fade a label — `UIOpacity` is the correct component to tween opacity |
| `Label` | Cocos Creator 3.8 built-in | Score float text, combo label, milestone celebration text | Already used in codebase for HUD; `label.string`, `label.color`, `label.fontSize` set at pool checkout |
| `Color` | Cocos Creator 3.8 built-in | Label color (green, red, white) and overlay color | `new Color(r, g, b, a)` — already imported in FlowerColors.ts pattern |
| `Node` | Cocos Creator 3.8 built-in | Pool nodes, overlay node, milestone label node | Already central to codebase; `node.active = true/false`, `node.setPosition()` |
| `UITransform` | Cocos Creator 3.8 built-in | Full-screen overlay sizing, score float hit area | Required to size a Node to cover the full screen |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `Component.schedule()` | Cocos Creator 3.8 built-in | Repeating blink timer for Urgency 3 (≤10s) | Use instead of `tween().repeatForever()` when you need to stop blinking on a condition check without stopping other tweens on the same node |
| `Component.unschedule()` | Cocos Creator 3.8 built-in | Stop the blink when urgency drops or game ends | Paired with `schedule()` — must store callback reference |
| `Component.unscheduleAllCallbacks()` | Cocos Creator 3.8 built-in | Clean up all scheduled callbacks on game-over/restart | Call on `GridRenderer` and `GameController` in `_triggerGameOver()` |
| `Tween.stopAllByTarget(node)` | Cocos Creator 3.8 built-in | Stop all running tweens on a given node | Call for each pool node on game-over to prevent callbacks firing after reset |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `UIOpacity` component for fade | Tweening `label.color.a` directly | `label.color` is a struct — tweening it directly works only for color changes, not opacity hierarchy; `UIOpacity` is the canonical fade mechanism and affects the entire sub-tree |
| `schedule()` for blink | `tween().repeatForever()` with opacity 0↔255 | Both work; `schedule()` is easier to cancel on a condition (`unschedule(cb)`) without affecting other tweens on the same node |
| Tween-based milestone text (scale punch + fade) | Cocos ParticleSystem2D | Particle system requires `.plist` asset files that do not exist; tween-based label scale + fade produces equivalent visual with zero asset cost |
| Pre-created pool Label nodes | `instantiate(prefab)` per tap | `instantiate()` triggers GC; pre-created pool matches the Pattern 3 already established for 64 cell nodes in GridRenderer |

**Installation:** No additional packages required — all APIs are built into Cocos Creator 3.8.

---

## Architecture Patterns

### Recommended Project Structure Additions

```
BloomTap/assets/scripts/
├── logic/                         — unchanged (pure TypeScript, no cc imports)
├── GameController.ts              — extend: playComboBreak(), playMilestoneCelebration(),
│                                    _updateTimerUrgency(), @property refs for overlay + milestoneLabel
├── GridRenderer.ts                — extend: playTapPulse(), spawnScoreFloat(),
│                                    ScoreFloatPool inner class (8-node pool)
└── FlowerColors.ts                — unchanged
```

**Scene additions needed in GameScene.scene:**

```
GameScene → Canvas
├── HUD (existing)
│   ├── ScoreLabel (existing)
│   ├── TimerLabel (existing)     — Phase 5: color + scale changes per urgency
│   └── ComboLabel (existing)     — Phase 5: pulse + combo break blink
├── GridContainer (existing)
├── RedFlashOverlay (Node NEW)    — full-screen, UITransform full-screen size,
│                                    Sprite component (white sprite, color set red),
│                                    UIOpacity component — active=false initially
├── MilestoneLabelNode (Node NEW) — centered, Label component ("COMBO x10!"),
│                                    UIOpacity component — active=false initially
├── StartScreenOverlay (existing)
├── CountdownOverlay (existing)
└── GameOverOverlay (existing)
```

---

### Pattern 1: Tap Pulse — tween scale on cellNode

**What:** On each tap, tween the `cellNode.scale` from `(1,1,1)` → `(peakScale,peakScale,1)` → `(1,1,1)` using `.to().to()` chaining. Scale only X and Y (not Z — this is a 2D game).

**When to use:** Every tap — normal pulse 80ms; FULL_BLOOM pulse 120ms.

**Critical:** `cellNode.scale` in Cocos Creator 3.x requires `Vec3`. Target the `node` directly (not Graphics component).

```typescript
// Source: Cocos Creator 3.8 Tween Examples docs + codebase CellView pattern
import { tween, Vec3, Tween } from 'cc';

// In GridRenderer.playTapPulse(row, col, isFullBloom):
playTapPulse(row: number, col: number, isFullBloom: boolean): void {
    const view = this._cellViews[row * GRID_COLS + col];
    const cellNode = view.node;
    const halfDuration = isFullBloom ? 0.06 : 0.04; // 120ms or 80ms total

    // Stop any in-flight pulse tween to prevent stacking
    Tween.stopAllByTarget(cellNode);

    tween(cellNode)
        .to(halfDuration, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'cubicOut' })
        .to(halfDuration, { scale: new Vec3(1, 1, 1) }, { easing: 'cubicIn' })
        .start();

    if (isFullBloom) {
        this._rippleNeighbors(row, col);
    }
}

// Ripple to 4 adjacent cells simultaneously (lighter pulse)
private _rippleNeighbors(row: number, col: number): void {
    const neighbors = [
        [row - 1, col], [row + 1, col],
        [row, col - 1], [row, col + 1],
    ];
    for (const [r, c] of neighbors) {
        if (r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS) continue;
        const neighborNode = this._cellViews[r * GRID_COLS + c].node;
        // Neighbor ripple: lighter scale, slight delay for wave feel
        tween(neighborNode)
            .delay(0.03)
            .to(0.06, { scale: new Vec3(1.07, 1.07, 1) }, { easing: 'cubicOut' })
            .to(0.06, { scale: new Vec3(1, 1, 1) }, { easing: 'cubicIn' })
            .start();
    }
}
```

---

### Pattern 2: Score Float Label Pool

**What:** Pre-create 8 Label nodes in `GridRenderer.onLoad()`. Each node has: `Label` component (string, color, fontSize), `UIOpacity` component (for fade), and is parented to the Canvas/root node (NOT GridContainer — so it floats in screen space). On tap, check out a free node, position it at the cell's world position, animate up + wobble + fade, then return to pool.

**When to use:** Every correct or wrong tap — float "+N" (white) or "-30" (red).

**Critical pool rules:**
1. Nodes are created once in `onLoad()` — never created/destroyed during play (STATE.md Pitfall 3).
2. The pool needs to know which nodes are "in use" — use a `_inUse: boolean` flag on each pool slot.
3. If all 8 nodes are in use (fast spam), silently skip the float (acceptable — animation, not gameplay).
4. On game-over/restart: call `Tween.stopAllByTarget(poolNode)` for each slot and reset `active=false`.

```typescript
// Source: Cocos Creator 3.8 node API + tween API + UIOpacity pattern
import { tween, Tween, Vec3, Label, UIOpacity, UITransform, Color, Node } from 'cc';

// Inner pool type (inside GridRenderer or a sibling AnimationSystem component):
interface FloatSlot {
    node: Node;
    label: Label;
    opacity: UIOpacity;
    inUse: boolean;
}

// In GridRenderer.onLoad() — pre-create pool:
private _floatPool: FloatSlot[] = [];

private _buildFloatPool(parentNode: Node): void {
    for (let i = 0; i < 8; i++) {
        const n = new Node(`scoreFloat_${i}`);
        n.layer = this.node.layer;
        const uiT = n.addComponent(UITransform);
        uiT.setContentSize(120, 40);
        const lbl = n.addComponent(Label);
        lbl.fontSize = 24;
        lbl.isBold = true;
        const uiOp = n.addComponent(UIOpacity);
        uiOp.opacity = 0;
        n.active = false;
        parentNode.addChild(n);
        this._floatPool.push({ node: n, label: lbl, opacity: uiOp, inUse: false });
    }
}

// Spawn a float from pool:
spawnScoreFloat(worldX: number, worldY: number, amount: number, multiplier: number): void {
    const slot = this._floatPool.find(s => !s.inUse);
    if (!slot) return; // pool exhausted — skip silently

    slot.inUse = true;
    slot.node.setWorldPosition(worldX, worldY, 0);
    slot.node.active = true;

    // Text and color
    const isWrong = amount < 0;
    slot.label.string = isWrong ? `${amount}` : `+${amount}`;
    slot.label.color = isWrong ? new Color(220, 60, 60, 255) : new Color(255, 255, 255, 255);
    // Font size scales with multiplier (discretion: x1=24, each step +4px, cap at 48)
    slot.label.fontSize = Math.min(24 + (multiplier - 1) * 4, 48);
    // Duration scales with multiplier, max 1s
    const duration = Math.min(0.4 + (multiplier - 1) * 0.1, 1.0);

    // Reset opacity
    slot.opacity.opacity = 255;

    // Animate: float up + wobble X + fade out
    const startPos = slot.node.worldPosition.clone();
    const riseY = 80 + multiplier * 10; // higher rise for bigger combos
    const wobbleX = 12; // lateral wobble amplitude (Claude's discretion)

    Tween.stopAllByTarget(slot.node);
    tween(slot.node)
        .parallel(
            tween(slot.node).to(duration, {
                worldPosition: new Vec3(startPos.x + wobbleX * Math.sin(Math.PI), startPos.y + riseY, 0)
            }),
            tween(slot.opacity).delay(duration * 0.5).to(duration * 0.5, { opacity: 0 })
        )
        .call(() => {
            slot.node.active = false;
            slot.inUse = false;
        })
        .start();
}
```

**Wobble alternative (simpler):** Use position tween with a custom `progress` callback or chain 3 short `to()` calls that zigzag X ±wobbleX while rising in Y. The approach above approximates a sine arc via endpoint; full multi-step wobble uses chained `by()` calls:

```typescript
// Chained zigzag wobble (more pronounced):
tween(slot.node)
    .by(duration / 3, { position: new Vec3(wobbleX,  riseY / 3, 0) }, { easing: 'sineOut' })
    .by(duration / 3, { position: new Vec3(-wobbleX * 2, riseY / 3, 0) })
    .by(duration / 3, { position: new Vec3(wobbleX,  riseY / 3, 0) })
    .start();
```

---

### Pattern 3: Full-Screen Red Overlay (JUICE-03 combo break)

**What:** A `Node` (child of Canvas) sized to cover the full design resolution (720×1280 or whatever the Canvas size is). It has a `Sprite` component set to a solid white 1×1 sprite with `color = new Color(220, 50, 50, 255)`, and a `UIOpacity` component for fade control. On combo break, tween `UIOpacity.opacity` from 0 → 51 (20% of 255) → 0 over 150ms total.

**When to use:** Only on wrong tap (combo break). Not on correct taps.

**Critical:** The overlay node must sit above the grid in the scene hierarchy z-order (later siblings in Canvas render on top). Set `node.active = false` initially; set `active = true` at animation start and `active = false` in the `call()` callback after fade.

```typescript
// Source: Cocos Creator 3.8 UIOpacity docs + tween API
import { tween, Tween, UIOpacity } from 'cc';

// In GameController — @property ref:
@property(Node) redFlashOverlay: Node | null = null;

// In handleComboBreak() or wherever wrong-tap visual is triggered:
private _playRedFlash(): void {
    if (!this.redFlashOverlay) return;
    const uiOp = this.redFlashOverlay.getComponent(UIOpacity)!;
    uiOp.opacity = 0;
    this.redFlashOverlay.active = true;

    Tween.stopAllByTarget(this.redFlashOverlay);
    tween(uiOp)
        .to(0.05, { opacity: 51 })      // 20% of 255 = 51
        .to(0.10, { opacity: 0 })        // fade out over 100ms
        .call(() => {
            this.redFlashOverlay!.active = false;
        })
        .start();
}
```

---

### Pattern 4: Combo Label Pulse (JUICE-03 correct tap)

**What:** Each correct tap pulses the combo label with a quick scale-up/down. This is separate from the score float and shares no nodes.

```typescript
// In GameController._updateHUD() or a new _pulseComboLabel():
import { tween, Tween, Vec3 } from 'cc';

private _pulseComboLabel(): void {
    if (!this.comboLabel) return;
    const labelNode = this.comboLabel.node;
    Tween.stopAllByTarget(labelNode);
    // Reset scale first (in case previous pulse was interrupted)
    labelNode.setScale(1, 1, 1);
    tween(labelNode)
        .to(0.08, { scale: new Vec3(1.25, 1.25, 1) }, { easing: 'cubicOut' })
        .to(0.10, { scale: new Vec3(1, 1, 1) }, { easing: 'cubicIn' })
        .start();
}
```

---

### Pattern 5: Combo Break Flash on Combo Label (JUICE-03 wrong tap)

**What:** When combo breaks, the combo label flashes (blinks 2–3 times) then fades to "Combo x0". Use `UIOpacity` tween with `.repeat()`.

```typescript
// In GameController._playComboBreak():
private _playComboBreak(): void {
    if (!this.comboLabel) return;
    const uiOp = this.comboLabel.node.getComponent(UIOpacity)!; // add UIOpacity to comboLabel in scene
    uiOp.opacity = 255;

    Tween.stopAllByTarget(this.comboLabel.node);
    tween(uiOp)
        .to(0.05, { opacity: 0 })
        .to(0.05, { opacity: 255 })
        .repeat(3)                       // 3 blinks total
        .to(0.15, { opacity: 0 })        // final fade out
        .call(() => {
            // comboLabel.string already updated to "Combo x0" by _updateHUD()
            uiOp.opacity = 255;          // restore opacity for next frame
        })
        .start();
}
```

---

### Pattern 6: Milestone Celebration — Tween-Based (JUICE-03 milestone)

**What:** Mid-screen Node with a Label ("COMBO x10!"). On trigger: `active=true`, scale from 0.5 → 1.3 → 1.0, then fade out and `active=false`. No particle assets needed.

**When to use:** When `comboSystem.tapCount` crosses 10, 25, or 50 — exactly once per threshold per session.

```typescript
// In GameController — track triggered milestones:
private _triggeredMilestones = new Set<number>();

// @property refs:
@property(Node) milestoneNode: Node | null = null;
@property(Label) milestoneLabel: Label | null = null; // child of milestoneNode

// Called after each correct tap in handleCorrectTap():
private _checkMilestone(tapCount: number): void {
    const milestones = [10, 25, 50];
    for (const m of milestones) {
        if (tapCount >= m && !this._triggeredMilestones.has(m)) {
            this._triggeredMilestones.add(m);
            this._playMilestoneCelebration(m);
            break; // only one milestone per tap
        }
    }
}

private _playMilestoneCelebration(count: number): void {
    if (!this.milestoneNode || !this.milestoneLabel) return;
    this.milestoneLabel.string = `COMBO x${count}!`;
    this.milestoneNode.setScale(0.5, 0.5, 1);
    this.milestoneNode.active = true;

    const uiOp = this.milestoneNode.getComponent(UIOpacity)!;
    uiOp.opacity = 255;

    Tween.stopAllByTarget(this.milestoneNode);
    tween(this.milestoneNode)
        .to(0.15, { scale: new Vec3(1.3, 1.3, 1) }, { easing: 'backOut' })
        .to(0.10, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'cubicOut' })
        .delay(0.5)
        .call(() => { /* begin fade */ })
        .start();
    tween(uiOp)
        .delay(0.6)
        .to(0.3, { opacity: 0 })
        .call(() => {
            this.milestoneNode!.active = false;
        })
        .start();
}
```

**Note:** `_triggeredMilestones` must be cleared on `onRestartTapped()` / `_beginSession()`.

---

### Pattern 7: Timer Urgency Escalation (JUICE-04)

**What:** Extend `_updateHUD()` with `_updateTimerUrgency(remainingSecs)`. Track current urgency stage with a `_urgencyStage: number` (0–3). On stage change: update label color, label node scale, and start/stop blink schedule.

**Blink implementation:** Use `this.schedule(callback, interval)` for the Urgency 3 blink — it's simpler to stop than `tween().repeatForever()` because `this.unschedule(callback)` stops just the blink without affecting other tweens on the timer label node.

```typescript
// Source: Cocos Creator 3.8 Scheduler docs + existing _updateHUD() pattern
import { Color, Vec3 } from 'cc';

// Pre-allocate color constants (no per-frame allocation):
const TIMER_COLOR_NORMAL   = new Color(255, 255, 255, 255); // white
const TIMER_COLOR_URGENCY1 = new Color(255, 220,  50, 255); // yellow
const TIMER_COLOR_URGENCY2 = new Color(255, 140,  30, 255); // orange
const TIMER_COLOR_URGENCY3 = new Color(220,  50,  50, 255); // red

private _urgencyStage: number = 0;
private _blinkVisible: boolean = true;
private _blinkCallback: (() => void) | null = null;

private _updateTimerUrgency(remainingSecs: number): void {
    let newStage: number;
    if (remainingSecs > 60)      newStage = 0;
    else if (remainingSecs > 30) newStage = 1;
    else if (remainingSecs > 10) newStage = 2;
    else                          newStage = 3;

    if (newStage === this._urgencyStage) return; // no change — skip

    this._urgencyStage = newStage;
    this._applyUrgencyStage(newStage);
}

private _applyUrgencyStage(stage: number): void {
    if (!this.timerLabel) return;

    // Stop any existing blink
    if (this._blinkCallback) {
        this.unschedule(this._blinkCallback);
        this._blinkCallback = null;
        this._blinkVisible = true;
        if (this.timerLabel) this.timerLabel.node.active = true;
    }

    switch (stage) {
        case 0:
            this.timerLabel.color = TIMER_COLOR_NORMAL;
            this.timerLabel.node.setScale(1.0, 1.0, 1);
            break;
        case 1:
            this.timerLabel.color = TIMER_COLOR_URGENCY1;
            this.timerLabel.node.setScale(1.2, 1.2, 1);
            break;
        case 2:
            this.timerLabel.color = TIMER_COLOR_URGENCY2;
            this.timerLabel.node.setScale(1.4, 1.4, 1);
            break;
        case 3:
            this.timerLabel.color = TIMER_COLOR_URGENCY3;
            this.timerLabel.node.setScale(1.6, 1.6, 1);
            // Start blink: toggle timer node active every 250ms
            this._blinkCallback = () => {
                this._blinkVisible = !this._blinkVisible;
                if (this.timerLabel) this.timerLabel.node.active = this._blinkVisible;
            };
            this.schedule(this._blinkCallback, 0.25); // 250ms interval
            // Also style HUD for panic feel (discretion: red background color on hudNode)
            if (this.hudNode) {
                // HUD urgency 3 styling — implementation details are Claude's discretion
            }
            break;
    }
}
```

**Cleanup on game-over/restart:** Must call `this.unschedule(this._blinkCallback)` and reset `_urgencyStage = 0` in `_triggerGameOver()` and `_beginSession()`.

---

### Pattern 8: Tween Cleanup on Game-Over / Restart

**What:** On `_triggerGameOver()` and `_beginSession()`, stop all running tweens for: each pooled score float node, the milestoneNode, the comboLabel node, the timerLabel node, the redFlashOverlay. Also `unscheduleAllCallbacks()` on GameController.

```typescript
// Source: Cocos Creator 3.8 Tween Interface docs
import { Tween } from 'cc';

private _stopAllJuiceAnimations(): void {
    // Stop tweens on GameController-owned nodes
    if (this.milestoneNode) Tween.stopAllByTarget(this.milestoneNode);
    if (this.redFlashOverlay) Tween.stopAllByTarget(this.redFlashOverlay);
    if (this.comboLabel) Tween.stopAllByTarget(this.comboLabel.node);
    if (this.timerLabel) Tween.stopAllByTarget(this.timerLabel.node);

    // Stop blink schedule
    if (this._blinkCallback) {
        this.unschedule(this._blinkCallback);
        this._blinkCallback = null;
    }
    this._urgencyStage = 0;
    this._triggeredMilestones.clear();

    // GridRenderer pool cleanup — call a public method on gridRenderer
    if (this.gridRenderer) this.gridRenderer.stopAllFloatAnimations();
}
```

---

### Anti-Patterns to Avoid

- **Creating new Node()/Label() per tap for score floats:** Triggers GC spikes — already the established Pitfall 3 in STATE.md. Pre-pool all float nodes in `onLoad()`.
- **Tweening `label.color.a` directly for fade:** In Cocos Creator 3.x, tweening a struct property like `color` requires the target to implement `lerp`, `add/mul`, and `clone` — `Color` does implement these, but using `UIOpacity` for fade is the canonical, engine-recommended approach and affects the node hierarchy correctly.
- **Using `tween().repeatForever()` for the blink timer:** Harder to stop cleanly without stopping other tweens on the same node; `schedule(callback, interval)` + `unschedule(callback)` is more precise.
- **Not calling `Tween.stopAllByTarget()` before starting a new pulse on the same cell:** Stacked tweens on the same node fight over the `scale` property, causing jitter. Always stop before starting.
- **Not clearing `_triggeredMilestones` on restart:** Player would never see x10/x25/x50 celebration in their second game.
- **Positioning score float labels as children of GridContainer:** They would scroll with the grid and be clipped by it. Parent them to Canvas (or a UIRoot node above GridContainer).
- **Storing `this.schedule()` callback as an arrow function literal:** `this.unschedule(callback)` requires the same function reference. Store the callback in an instance field.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scale pulse animation | Custom `update()` lerp logic with `_pulseTimer` field | `tween(node).to().to().start()` | Engine tween handles frame timing, easing, and completion callback; custom lerp accumulates float error |
| Opacity fade | Manually decrement `opacity` in `update()` | `tween(uiOpacityComp).to(duration, {opacity: 0})` | Tween handles duration math, easing, and cleanup |
| Blink on/off toggle | `tween().repeatForever()` with `set({active:false})` | `this.schedule(callback, 0.25)` | `unschedule()` stops only the blink; `Tween.stopAllByTarget()` would cancel ALL tweens on that node including the scale |
| Score float path math | Manual position update every frame in `update()` | `tween(node).to(duration, {worldPosition: targetVec3})` | Tween interpolates position; no per-frame callback needed |
| Particle burst for milestone | `.plist` particle asset + `ParticleSystem2D` component | `tween(node)` with scale punch + opacity fade on a Label node | No art assets required; equivalent visual for a text-only game; particles need assets that don't exist in this project |
| Timer urgency state detection | Comparing remainingSecs every frame with string comparisons | Stage enum `0-3` + early-out `if (newStage === this._urgencyStage) return` | O(1) comparison, no string allocation, no redundant style changes |

**Key insight:** Every juice effect in this phase is achievable with `tween()` + `schedule()` + `UIOpacity`. No external libraries, no particle assets, no custom animation systems are needed. The complexity is in pool management and cleanup discipline, not in animation math.

---

## Common Pitfalls

### Pitfall 1: Score Float Nodes Parented to GridContainer

**What goes wrong:** Float labels are positioned relative to GridContainer's local space. When GridContainer is not at world (0,0,0) or has a non-identity transform, the float appears offset from the tapped cell, or is clipped by the container's scissor rect.

**Why it happens:** Natural instinct to addChild to the nearest parent (GridRenderer's own node).

**How to avoid:** In `_buildFloatPool()`, call `parentNode.addChild(n)` where `parentNode` is the Canvas root or a dedicated UI effects layer above GridContainer. Obtain world position of the tapped cell via `cellNode.worldPosition` before parenting to Canvas, then pass that `worldX, worldY` to `spawnScoreFloat()`.

**Warning signs:** Floats appear in wrong position; floats disappear when they exit GridContainer bounds.

---

### Pitfall 2: UIOpacity Not Added to Scene Nodes

**What goes wrong:** Calling `node.getComponent(UIOpacity)` returns `null` at runtime because the component was not added in the scene or in `onLoad()`.

**Why it happens:** `UIOpacity` is not a default component — it must be explicitly added. For nodes added in the scene editor, add it via the Inspector. For nodes created in code (pool nodes), call `node.addComponent(UIOpacity)` in `_buildFloatPool()`.

**How to avoid:** Scene nodes (redFlashOverlay, milestoneNode, comboLabel.node, timerLabel.node): add UIOpacity in Cocos Creator scene editor Inspector. Pool nodes: `node.addComponent(UIOpacity)` in `_buildFloatPool()`. Always null-check the result.

**Warning signs:** `TypeError: Cannot read property 'opacity' of null` at runtime.

---

### Pitfall 3: Stacked Tweens on Cell Node

**What goes wrong:** If a player taps the same cell faster than the pulse duration (80ms), a second tween starts on the same node before the first finishes. Both tweens now update `node.scale` simultaneously, causing jitter or the scale getting stuck at 1.1.

**Why it happens:** `tween(node).start()` does not stop existing tweens on the same target.

**How to avoid:** Call `Tween.stopAllByTarget(cellNode)` immediately before starting each new pulse tween. This cancels any in-flight pulse and resets control to the new tween.

**Warning signs:** Cell scale appears stuck between 1.0 and 1.1 after fast tapping.

---

### Pitfall 4: schedule() Callback Reference Not Stored

**What goes wrong:** The blink schedule uses an anonymous arrow function: `this.schedule(() => { ... }, 0.25)`. Later, `this.unschedule(() => { ... })` creates a new function object — it is not the same reference, so the blink never stops.

**Why it happens:** JavaScript identity — arrow functions are new objects each time they are created.

**How to avoid:** Store the blink callback in an instance field: `this._blinkCallback = () => { ... }; this.schedule(this._blinkCallback, 0.25);`. Then `this.unschedule(this._blinkCallback)` correctly identifies the scheduled callback.

**Warning signs:** Timer continues blinking after game-over; blink does not stop when urgency drops below 10s threshold (e.g., after restart that resets remainingSecs to 120).

---

### Pitfall 5: Milestone Set Not Cleared on Restart

**What goes wrong:** `_triggeredMilestones` still contains `{10, 25, 50}` from the first session. On the second session, no milestone celebrations ever fire, even when the player reaches x10 again.

**Why it happens:** `_beginSession()` resets score and combo but doesn't clear the milestone tracking set.

**How to avoid:** Call `this._triggeredMilestones.clear()` in both `_beginSession()` and `onRestartTapped()`.

**Warning signs:** No milestone celebration in second playthrough.

---

### Pitfall 6: tween() on Color Struct vs UIOpacity

**What goes wrong:** `tween(label).to(0.3, { color: new Color(0, 0, 0, 0) })` — tweening the color's alpha channel appears to work but the `color` property changes the RGBA uniformly, and in Cocos Creator 3.x, attempting to tween `node.color` directly can fail with "Cannot animate color property because it does not have lerp/add/mul/clone functions" depending on the version.

**Why it happens:** `Node.color` in Cocos Creator 3.x is a getter/setter wrapping an internal struct; it is not always tween-animatable directly.

**How to avoid:** Use `UIOpacity.opacity` for fade effects (range 0–255). Use `label.color = new Color(r, g, b, 255)` for instant color changes (correct tap = white, wrong tap = red). Do NOT tween `label.color` — use `UIOpacity` for fade instead.

**Warning signs:** Runtime error "Cannot animate color property" or opacity animation has no effect.

---

## Code Examples

Verified patterns from official sources:

### Scale Pulse (80ms total)

```typescript
// Source: Cocos Creator 3.8 Tween Examples docs
import { tween, Tween, Vec3 } from 'cc';

Tween.stopAllByTarget(cellNode);
tween(cellNode)
    .to(0.04, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'cubicOut' })
    .to(0.04, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'cubicIn' })
    .start();
```

### Scale Pulse (120ms, FULL_BLOOM)

```typescript
// Source: Cocos Creator 3.8 Tween Examples docs
Tween.stopAllByTarget(cellNode);
tween(cellNode)
    .to(0.06, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'cubicOut' })
    .to(0.06, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'cubicIn' })
    .start();
```

### UIOpacity Fade (full-screen overlay 150ms)

```typescript
// Source: Cocos Creator 3.8 UIOpacity docs
import { tween, Tween, UIOpacity } from 'cc';

const uiOp = overlayNode.getComponent(UIOpacity)!;
uiOp.opacity = 0;
overlayNode.active = true;
Tween.stopAllByTarget(overlayNode);
tween(uiOp)
    .to(0.05, { opacity: 51 })   // peak at 20%
    .to(0.10, { opacity: 0 })    // fade out
    .call(() => { overlayNode.active = false; })
    .start();
```

### Repeating Blink via schedule()

```typescript
// Source: Cocos Creator 3.8 Scheduler docs
this._blinkCallback = () => {
    this._blinkVisible = !this._blinkVisible;
    if (this.timerLabel) this.timerLabel.node.active = this._blinkVisible;
};
this.schedule(this._blinkCallback, 0.25); // every 250ms

// To stop:
this.unschedule(this._blinkCallback);
this._blinkCallback = null;
if (this.timerLabel) this.timerLabel.node.active = true; // restore visibility
```

### Tween Cleanup on Game-Over

```typescript
// Source: Cocos Creator 3.8 Tween Interface docs
import { Tween } from 'cc';

// Stop tweens per node:
Tween.stopAllByTarget(someNode);

// Stop ALL tweens globally (use only if no other tweens should survive):
// Tween.stopAll(); // — avoid in this codebase; use per-target

// In _triggerGameOver():
this.unscheduleAllCallbacks(); // stops all schedule() timers on this component
Tween.stopAllByTarget(this.milestoneNode);
Tween.stopAllByTarget(this.redFlashOverlay);
if (this.gridRenderer) this.gridRenderer.stopAllFloatAnimations();
```

### Parallel Tween (float label: position + fade simultaneously)

```typescript
// Source: Cocos Creator 3.8 Tween Examples docs
import { tween, Tween, Vec3, UIOpacity } from 'cc';

const uiOp = floatNode.getComponent(UIOpacity)!;
Tween.stopAllByTarget(floatNode);
tween(floatNode)
    .parallel(
        tween(floatNode).to(duration, { worldPosition: new Vec3(wx, wy + 80, 0) }),
        tween(uiOp).delay(duration * 0.5).to(duration * 0.5, { opacity: 0 })
    )
    .call(() => {
        floatNode.active = false;
        slot.inUse = false;
    })
    .start();
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `cc.Action` system (Cocos Creator 2.x) | `tween()` API (Cocos Creator 3.x) | Cocos Creator 3.0 | Actions deprecated; all animation now uses tween() — no `cc.moveBy`, `cc.scaleTo` etc. |
| `node.opacity` property (Cocos Creator 2.x) | `UIOpacity` component on Node | Cocos Creator 3.0 | Direct `node.opacity` removed; must use `UIOpacity` component for opacity control |
| `cc.repeatForever()` action | `.repeatForever()` tween method | Cocos Creator 3.0 | Same concept, new API; memory warning: repeatForever tweens must be manually stopped |
| `node.color = cc.Color.RED` (2.x) | `label.color = new Color(r,g,b,a)` (3.x) | Cocos Creator 3.0 | Now set on the render component (Label/Sprite), not the Node itself for most cases |

**Deprecated/outdated in this codebase:**
- `cc.Action` / `cc.moveBy` / `cc.ScaleTo`: Not available in Cocos Creator 3.x at all — use `tween()` exclusively.
- `node.opacity` property: Does not exist in Cocos Creator 3.x — use `UIOpacity` component.

---

## Open Questions

1. **Score float worldPosition conversion**
   - What we know: `cellNode.worldPosition` exists on Node in Cocos Creator 3.x and returns a `Vec3` in world space.
   - What's unclear: Whether `node.setWorldPosition()` is available on the float label node when it is parented to Canvas (which has its own world transform). Cocos Creator 3.x Canvas may use a different coordinate system than world space.
   - Recommendation: In `spawnScoreFloat()`, use `floatNode.setPosition()` with the position converted from GridContainer local space to Canvas local space via `canvas.inverseTransformPoint()`, or use `floatNode.setWorldPosition(cellNode.worldPosition)` and verify in Cocos Creator preview that positions align correctly.

2. **UIOpacity on comboLabel.node — does it exist in scene?**
   - What we know: `comboLabel` is a `Label` component on the HUD. The node may not have a `UIOpacity` component yet.
   - What's unclear: Whether `comboLabel.node.getComponent(UIOpacity)` will return null at runtime.
   - Recommendation: In the plan for the scene setup wave, explicitly add `UIOpacity` to `comboLabel.node`, `timerLabel.node`, and any other nodes that need opacity animation. This is a scene-editor task, not a code task.

3. **tween() parallel target must be the same object?**
   - What we know: The official example shows `tween(this.node).parallel(tween(this.node).to(...), tween(this.node).to(...))` — both subtweens share the same target node.
   - What's unclear: When one subtween targets `slot.node` (position) and another targets `uiOp` (UIOpacity component), the outer tween target and inner tween targets are DIFFERENT objects. This is valid — the `parallel()` API accepts tweens with different targets. Verify with Cocos Creator preview.
   - Recommendation: Use `tween(slot.node).parallel(tween(slot.node).to(...position...), tween(uiOp).to(...opacity...)).call(...)` — the outer tween's `call()` fires after all parallel branches complete.

---

## Validation Architecture

> `nyquist_validation` is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (already installed, 111 tests passing as of Phase 4) |
| Config file | `E:/workspace/ProjectAI/vitest.config.ts` |
| Quick run command | `npx vitest run` (from `E:/workspace/ProjectAI/`) |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| JUICE-01 | Scale pulse triggered on tap — cellNode.scale peaks at 1.1 then returns to 1.0 | manual-only | N/A — requires Cocos runtime and tween execution | Not applicable |
| JUICE-01 | Ripple fires only when `isFullBloom=true` | unit (logic gate) | `npx vitest run` | ❌ Wave 0: add test to `logic/TapHandler.test.ts` or new `GridRenderer.test.ts` mock |
| JUICE-02 | Float label string is `"+N"` for correct tap, `"-30"` for wrong tap | unit (pool checkout logic) | `npx vitest run` | ❌ Wave 0: add pure-logic test for label string formatting |
| JUICE-02 | Font size = `Math.min(24 + (multiplier - 1) * 4, 48)` | unit | `npx vitest run` | ❌ Wave 0: pure arithmetic test |
| JUICE-02 | Float duration = `Math.min(0.4 + (multiplier - 1) * 0.1, 1.0)` | unit | `npx vitest run` | ❌ Wave 0: pure arithmetic test |
| JUICE-03 | Milestone triggers at tapCount >= 10, 25, 50 — exactly once per session | unit | `npx vitest run` | ❌ Wave 0: add to new `GameController.milestones.test.ts` (mock _triggeredMilestones logic) |
| JUICE-04 | Urgency stage is 0 when >60s, 1 when 30-60s, 2 when 10-30s, 3 when ≤10s | unit | `npx vitest run` | ❌ Wave 0: add `_getUrgencyStage(remainingSecs)` as a pure function, test it |
| JUICE-04 | Timer label color/scale changes on stage change | manual-only | N/A — requires Cocos runtime | Not applicable |
| JUICE-04 | Blink starts at ≤10s, stops on restart | manual-only | N/A — requires Cocos runtime + scheduler | Not applicable |

### Sampling Rate

- **Per task commit:** `npx vitest run` (from `E:/workspace/ProjectAI/`)
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green + manual Cocos Creator preview playthrough verifying each juice effect visually before `/gsd:verify-work`

### Wave 0 Gaps

**New test logic candidates** (pure TypeScript, no Cocos imports — testable in Vitest):

- [ ] Extract `_getUrgencyStage(remainingSecs: number): number` as a pure function (module-level or static) — test the 4 boundary conditions
- [ ] Extract `getFloatFontSize(multiplier: number): number` — test values at x1, x2, x5, x10, cap at x25
- [ ] Extract `getFloatDuration(multiplier: number): number` — test values at x1, x5, and cap
- [ ] Test milestone trigger logic: mock `_triggeredMilestones` Set, verify x10 triggers once, x25 triggers once, x50 triggers once, and no double-trigger
- [ ] Verify float label string format: `amount < 0 ? String(amount) : '+' + String(amount)` — test for -30, +0, +120, +500

*(All Cocos-dependent code — tween execution, UIOpacity, schedule() — is not testable in Vitest. Covered by manual Cocos Creator preview.)*

**No new framework setup needed** — Vitest already configured and passing 111 tests.

---

## Sources

### Primary (HIGH confidence)

- Cocos Creator 3.8 Tween Examples — https://docs.cocos.com/creator/3.8/manual/en/tween/tween-example.html — `tween().to().parallel().repeat().call().start()` API verified with code examples
- Cocos Creator 3.8 Tween Interface — https://docs.cocos.com/creator/3.8/manual/en/tween/tween-interface.html — `Tween.stopAllByTarget()`, `Tween.stopAll()`, `.stop()` individual tween, `.tag()` API
- Cocos Creator 3.8 Tween Functions — https://docs.cocos.com/creator/3.8/manual/en/tween/tween-function.html — all method signatures: `to`, `by`, `parallel`, `sequence`, `repeat`, `repeatForever`, `delay`, `call`; easing strings including `'cubicOut'`, `'cubicIn'`, `'backOut'`
- Cocos Creator 3.8 Scheduler — https://docs.cocos.com/creator/3.8/manual/en/scripting/scheduler.html — `schedule(callback, interval)`, `unschedule(callback)`, `unscheduleAllCallbacks()` API verified
- Cocos Creator 3.8 UIOpacity — https://docs.cocos.com/creator/3.8/manual/en/ui-system/components/editor/ui-opacity.html — `UIOpacity.opacity` property (0–255), `tween(uiOpacityComp).to()` pattern verified
- Existing codebase: `GameController.ts` — `@property` pattern, `scheduleOnce()` pattern, `_updateHUD()` structure — read directly
- Existing codebase: `GridRenderer.ts` — `CellView`, `_cellViews[]`, `GRID_COLS`, `CELL_SIZE`, `isFlashing` guard, `paintFlash()` pattern — read directly
- Existing codebase: `ComboSystem.ts` — `tapCount`, `multiplier` getters — read directly
- Existing codebase: `FlowerColors.ts` — `Color` pre-allocation pattern (no per-frame `new Color()`) — read directly
- Project STATE.md — Pitfall 3 (no Node creation in hot loop), Pitfall 2 (no delta accumulation), pure logic tier separation — read directly

### Secondary (MEDIUM confidence)

- Cocos Forum — https://forum.cocosengine.org/t/how-to-change-color-using-cc-tween/54462 — confirmed `new Color(r,g,b,a)` required for color tweening; hex strings cause "no lerp function" error
- WebSearch result (Cocos Creator 3.8 tween 2025) — `Tween.bindNodeState()` in 3.8.4+ auto-pauses tweens when node is deactivated; `pause()`/`resume()` added in 3.8.4

### Tertiary (LOW confidence)

- WebSearch result — `scheduleOnce()` + `unschedule()` repeated calls known bug (GitHub issue #16653, January 2024) — LOW confidence (single source); mitigation: use `schedule()` for repeating blink instead of `scheduleOnce()` chaining

---

## Metadata

**Confidence breakdown:**

- Standard stack (tween API): HIGH — Verified against official Cocos Creator 3.8 tween docs with actual code examples; consistent with existing codebase patterns
- Architecture (pool pattern): HIGH — Pool pre-creation pattern is the established project standard (64 cell nodes in GridRenderer.onLoad()); applying same pattern to 8 float nodes is a direct extension
- Pitfalls (UIOpacity, stop-before-start, callback reference): HIGH — Pitfalls 1–6 derived from direct codebase reading + official docs + verified forum issue
- Open questions (worldPosition conversion, parallel multi-target): MEDIUM — API exists per docs but coordinate system behavior in specific scene hierarchy needs runtime verification

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable Cocos Creator 3.8 API — 30-day window)
