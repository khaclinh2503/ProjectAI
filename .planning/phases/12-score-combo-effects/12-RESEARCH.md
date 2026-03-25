# Phase 12: Score & Combo Effects — Research

**Researched:** 2026-03-25
**Domain:** Cocos Creator 3.x tween animations — score HUD punch, combo label punch-in, score float zigzag path
**Confidence:** HIGH (all findings verified against live codebase; no external library decisions required)

## Summary

Phase 12 is a pure animation polish phase. All required mechanics (score float count-up, combo label pulse, wrong-tap flash) already exist in the codebase — this phase extends and intensifies them per JUICE-02, JUICE-03, JUICE-04. No new systems need to be architected; the work is entirely within existing methods.

The primary technical challenge is the zigzag path for score floats when multiplier is active (D-07/D-08). The existing `spawnScoreFloat()` already uses a 3-segment `.by()` chain that produces a gentle wobble — the multiplier path simply uses the same chaining pattern with larger displacement magnitudes and more segments.

Score HUD punch+color flash (D-01/D-02) and combo punch-in with streak-scaled start size (D-03/D-04) are straightforward extensions of patterns already proven in `_pulseComboLabel()` and `_playMilestoneCelebration()`.

**Primary recommendation:** Extend three existing methods (`spawnScoreFloat`, `_updateScoreLabel` via a new score punch helper, `_playComboBreak`) and strengthen two existing ones (`_pulseComboLabel` for combo punch-in with streak-proportional start scale, `_playComboBreak` for more aggressive flash). All new animation logic lives inside the `logic/` layer only when helper parameters are needed — color constants and animation values go into `JuiceHelpers.ts` for testability.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Score HUD**
- D-01: Score label react mỗi khi điểm tăng — kết hợp punch scale (to → co lại) VÀ color flash cùng lúc
- D-02: Color flash thresholds và exact colors: Claude's Discretion dựa trên MILESTONE_THRESHOLDS từ JuiceHelpers

**Combo Display**
- D-03: Combo label punch-in mỗi lần streak tăng (x2, x3, x4...) — animation: scale to + fade in (mờ đập vào màn hình → rõ dần)
- D-04: Starting scale của punch-in tỉ lệ với streak level — streak cao hơn → bắt đầu to hơn (ví dụ x2 = 1.5x scale, x10 = 3x scale)
- D-05: Combo break flash mạnh hơn hiện tại — chi tiết implementation: Claude's Discretion (flash đỏ trên label + screen region)

**Score Float (SCORE_MULTIPLIER active)**
- D-06: Float đổi màu khi `powerUpMultiplier > 1` — màu khác với normal float (Claude's Discretion: gold/orange hoặc match multiplier color)
- D-07: Float animation sequence khi multiplier active: (1) Spawn to + mờ → rõ dần (punch-in effect), (2) Count-up từ base → final score (đã có, giữ nguyên), (3) Bay lên theo zigzag path
- D-08: Zigzag path = random bounce — mỗi segment ngẫu nhiên hướng trái/phải trong khi di chuyển lên. Số segment và displacement: Claude's Discretion
- D-09: Normal float (không có multiplier): giữ nguyên behavior hiện tại — straight up + fade

### Claude's Discretion
- Score HUD color flash thresholds (milestone values và màu tương ứng)
- Combo break flash exact implementation (label flash vs partial screen flash vs cả hai)
- Punch scale magnitude values (1.5x? 2x? tùy streak level)
- Zigzag segment count, displacement magnitude, duration

### Deferred Ideas (OUT OF SCOPE)
- ART-01, ART-02, ART-03 (sprite replacement cho hoa 5 trạng thái, board background, UI elements)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| JUICE-02 | Score label punches (scale up → back) với color flash mỗi khi điểm tăng | `_updateHUD()` in GameController calls `scoreLabel.string = ...` each frame — add punch tween there; score changes only on tap, so punch fires at correct moment. Color flash uses `scoreLabel.color` via pre-allocated Color constants. |
| JUICE-03 | Combo label punch-in mỗi lần streak tăng — scale bắt đầu to hơn theo streak cao (x5 to hơn x2); combo break có flash mạnh hơn | `_pulseComboLabel(streak)` already exists with `peakScale` logic (D-05 pattern) — extend to also set start scale proportional to streak. `_playComboBreak()` currently does label blink only — add stronger flash (redFlashOverlay at higher opacity OR a dedicated combo-break label pulse at larger scale). |
| JUICE-04 | Score float khi multiplier active: đổi màu + punch-in to→rõ → count-up → zigzag random bounce khi bay lên; Normal float giữ nguyên | `spawnScoreFloat()` already branches on `powerUpMultiplier > 1` for count-up. Extend that branch: set gold color, start opacity at 0→255 (punch-in), replace 3-segment wobble with random-sign multi-segment zigzag. Normal path unchanged. |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `tween` (cc) | Cocos Creator 3.8.8 | All animation (scale, position, opacity) | Already used project-wide — `shakeGrid`, `playTapPulse`, `_pulseComboLabel`, score float count-up |
| `Tween.stopAllByTarget` (cc) | 3.8.8 | Cancel in-flight animations before starting new ones | Required pattern — prevents tween accumulation when same node animated repeatedly |
| `UIOpacity` (cc) | 3.8.8 | Opacity animation independent of Color alpha | Already on all float nodes and `redFlashOverlay`; separate component = separate tween target |
| `Vec3` (cc) | 3.8.8 | Scale and position values | Required by `tween` property targets |
| `Color` (cc) | 3.8.8 | Pre-allocated color constants | Pattern established: define at module top, never `new Color()` inside tween callbacks |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `JuiceHelpers.ts` (project) | local | Pure TS helper functions for animation params | Add new helper functions here for punch scale calculation and color-flash thresholds — testable in vitest |

**No new npm packages required.** All animation capability needed is in the existing Cocos `cc` module.

---

## Architecture Patterns

### Recommended Project Structure
No new files required. All changes are edits to existing files:

```
BloomTap/assets/scripts/
├── GameController.ts        — score punch helper, combo punch-in extension, combo break upgrade
├── GridRenderer.ts          — spawnScoreFloat() zigzag + color branch
├── logic/
│   └── JuiceHelpers.ts      — new exported helpers: getScoreFlashColor(), getComboStartScale()
│   └── JuiceHelpers.test.ts — new tests for added helpers
```

### Pattern 1: Punch Scale with Initial Scale Set (Combo punch-in D-03, D-04)

The existing `_pulseComboLabel` starts scale at current (already-settled 1.0) and tweens up then back. The new behavior sets a large START scale proportional to streak, tweens DOWN toward 1.0, while also fading in from 0 → 255 opacity.

**Key difference from existing pulse:** Set scale BEFORE tween starts; tween direction is large → small (punch-in), not small → large (punch-out).

```typescript
// Pattern: punch-IN (object appears large, shrinks to normal)
// Verified in codebase: _playMilestoneCelebration uses 0.5 → 1.3 → 1.0 pattern
// D-03/D-04 uses: startScale → 1.0 (one step, not two)
const startScale = getComboStartScale(streak); // e.g. streak=2→1.5, streak=10→3.0
labelNode.setScale(startScale, startScale, 1);
const uiOp = labelNode.getComponent(UIOpacity);
if (uiOp) uiOp.opacity = 0;

Tween.stopAllByTarget(labelNode);
Tween.stopAllByTarget(uiOp);

tween(labelNode)
    .to(0.12, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'cubicOut' })
    .start();
tween(uiOp)
    .to(0.10, { opacity: 255 }, { easing: 'cubicOut' })
    .start();
```

**Integration point:** `_pulseComboLabel(streak)` in GameController — add this branch before/instead of the existing backOut pulse when `streak >= 2`.

### Pattern 2: Score HUD Punch + Color Flash (D-01, D-02)

Punch is applied to `scoreLabel.node` (scale). Color flash is applied to `scoreLabel.color` directly (not UIOpacity — color flash changes hue, not transparency).

```typescript
// Called from _updateHUD() after writing scoreLabel.string
// Source: playTapPulse() and _pulseComboLabel() patterns in this codebase
private _punchScoreLabel(rawScore: number): void {
    if (!this.scoreLabel) return;
    const labelNode = this.scoreLabel.node;
    Tween.stopAllByTarget(labelNode);
    tween(labelNode)
        .to(0.06, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'backOut' })
        .to(0.08, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'cubicIn' })
        .start();
    // Color flash: set color, tween back to white
    const flashColor = getScoreFlashColor(rawScore);
    this.scoreLabel.color = flashColor;
    // Tween label color back — use a plain JS object (Cocos tween supports numeric props)
    const c = { r: flashColor.r, g: flashColor.g, b: flashColor.b };
    tween(c)
        .to(0.15, { r: 255, g: 255, b: 255 })
        .onUpdate(() => { /* update scoreLabel.color each frame */ })
        .start();
}
```

**Alternative pattern (simpler):** Set color, then `scheduleOnce` to reset — avoids tween on color object. This is the pattern used by `paintFlash()`. Prefer this if color tween has Cocos quirks.

```typescript
// Simpler: set color directly, schedule reset (matches paintFlash() pattern)
this.scoreLabel.color = getScoreFlashColor(rawScore);
this.scheduleOnce(() => {
    if (this.scoreLabel) this.scoreLabel.color = COLOR_WHITE;
}, 0.15);
```

**Trigger point:** `_updateHUD()` currently updates `scoreLabel.string` every frame. Need to detect score CHANGED (not just update string). Best approach: track `_lastScore` private field; fire punch only when `Math.floor(this.gameState.score) !== this._lastScore`.

### Pattern 3: Zigzag Float Path (D-07, D-08)

Existing path (3-segment `.by()` chain, fixed wobbleX):
```typescript
// Current wobble pattern (GridRenderer.ts lines 453-457)
tween(slot.node)
    .by(duration / 3, { position: new Vec3( wobbleX,  riseY / 3, 0) }, { easing: 'sineOut' })
    .by(duration / 3, { position: new Vec3(-wobbleX * 2, riseY / 3, 0) })
    .by(duration / 3, { position: new Vec3( wobbleX,  riseY / 3, 0) })
    .start();
```

Multiplier-active zigzag: same `.by()` chain but random signs per segment, more segments, larger displacement. Cocos `tween` chains support any number of `.by()/.to()` calls.

```typescript
// Zigzag pattern — random sign per segment, more segments
const ZIGZAG_SEGMENTS = 5;
const ZIGZAG_X = 30; // px displacement per segment
const segDuration = duration / ZIGZAG_SEGMENTS;
const segRiseY = riseY / ZIGZAG_SEGMENTS;

let t = tween(slot.node);
for (let i = 0; i < ZIGZAG_SEGMENTS; i++) {
    const sign = Math.random() < 0.5 ? 1 : -1;
    t = t.by(segDuration, { position: new Vec3(sign * ZIGZAG_X, segRiseY, 0) },
             { easing: 'sineOut' });
}
t.start();
```

**Important:** `tween()` returns a new Tween object; each `.by()/.to()` call returns the same tween for chaining. The loop variable `t` must be reassigned each iteration to accumulate segments.

**Also required for D-07 punch-in at spawn:**
```typescript
// Spawn: start transparent + large, shrink to normal size while fading in
slot.node.setScale(1.5, 1.5, 1);
slot.opacity.opacity = 0;
tween(slot.node)
    .to(0.08, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'cubicOut' })
    .start();
tween(slot.opacity)
    .to(0.08, { opacity: 255 })
    .start();
// Then start zigzag position tween with a small delay (let punch-in settle)
```

**Conflict risk:** `Tween.stopAllByTarget(slot.node)` is called at start of `spawnScoreFloat()` — this correctly cancels any in-flight tweens before the new ones start. The scale tween and position tween run on the same target (`slot.node`); they must be started separately or use `.parallel()`. In practice, Cocos allows multiple concurrent tweens on the same node targeting different properties (scale vs position), but confirm by running `playTapPulse` pattern — it tweens `cellNode` scale while position remains static.

### Pattern 4: Combo Break — Stronger Flash (D-05)

Current `_playComboBreak()`: label opacity blink (3 cycles) + fade. This is subtle.

Stronger version adds: (1) label scale-punch to a large size then immediate shrink, (2) `redFlashOverlay` at higher opacity (currently 20% = 51/255 — increase to ~35% = ~89/255 for combo break vs normal wrong tap).

```typescript
// Stronger combo break: scale punch + higher opacity red flash
private _playComboBreak(): void {
    // Existing label blink — keep, but also add scale punch
    if (this.comboLabel) {
        const labelNode = this.comboLabel.node;
        Tween.stopAllByTarget(labelNode);
        tween(labelNode)
            .to(0.05, { scale: new Vec3(1.8, 1.8, 1) }, { easing: 'cubicOut' })
            .to(0.10, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'cubicIn' })
            .start();
        // Existing opacity blink unchanged
    }
    // Red flash at higher opacity than normal wrong tap (51 → 89)
    if (this.redFlashOverlay) {
        const uiOp = this.redFlashOverlay.getComponent(UIOpacity);
        if (uiOp) {
            uiOp.opacity = 0;
            this.redFlashOverlay.active = true;
            Tween.stopAllByTarget(uiOp);
            tween(uiOp)
                .to(0.04, { opacity: 89 })
                .to(0.12, { opacity: 0 })
                .call(() => { if (this.redFlashOverlay) this.redFlashOverlay.active = false; })
                .start();
        }
    }
}
```

**Note:** `_playComboBreak()` is called from `handleWrongTap()` which also calls `_playRedFlash()`. Both would fire on wrong tap. Combine them into one call — `_playComboBreak()` handles the stronger version (supersedes `_playRedFlash()`), and `_playRedFlash()` is no longer called separately. OR keep them separate and accept that combo-break wrong taps get both. Recommend: merge into `_playComboBreak()` so wrong taps without a combo-to-break get the softer version, combo-break taps get the stronger version. This requires `_playComboBreak()` to know if streak was >= 2 before the tap.

### Anti-Patterns to Avoid

- **Allocating `new Color()` inside tween callbacks or `update()`:** Pre-allocate at module top. Already established pattern in GameController (TIMER_COLOR_* constants).
- **Starting tween on same target without `Tween.stopAllByTarget` first:** Causes tween accumulation and jitter. Always stop before start on any node that may receive repeated events.
- **Forgetting to reset scale after interrupted tween:** `_pulseComboLabel()` already calls `labelNode.setScale(1, 1, 1)` before tweening — same guard required for score label and combo punch-in.
- **Tweening `Label.color` directly via Cocos tween `to()`:** Cocos tween works on objects with numeric properties; `Label.color` is a `Color` object. The correct approach is either (a) schedule a reset, (b) tween a plain JS object `{r, g, b}` with `onUpdate` to copy into label, or (c) use `scheduleOnce`. Option (a) is proven by `paintFlash()`.
- **Detecting score change in `_updateHUD()` using float comparison:** `gameState.score` is a float. Use `Math.floor(this.gameState.score) !== this._lastScore` and update `_lastScore` after punch to avoid double-firing.
- **Running zigzag tween loop before `Tween.stopAllByTarget`:** The tween builder accumulates synchronously; stopping must happen before the chain is built. This is already done at the top of `spawnScoreFloat()`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Easing functions | Custom sine/cubic interpolation | `'cubicOut'`, `'backOut'`, `'sineOut'` string literals in Cocos tween | Cocos provides 20+ named easings — already used throughout |
| Tween sequencing | Manual `scheduleOnce` chains for multi-step animation | `.to().to().by()` chain | Cocos tween chains are the established pattern (shakeGrid, milestoneLabel) |
| Color interpolation | Per-frame lerp in `update()` | `scheduleOnce` color reset or tween on plain JS object | Far simpler; color transitions here are snap-then-fade, not smooth gradients |
| Random number with sign | Separate positive/negative random | `Math.random() < 0.5 ? 1 : -1` | One-liner sufficient |

---

## Common Pitfalls

### Pitfall 1: Scale not reset before punch-in causes wrong starting size
**What goes wrong:** Combo label starts punch-in from whatever scale a previous interrupted tween left it at (e.g. 1.25 from a mid-flight pulse).
**Why it happens:** `Tween.stopAllByTarget` cancels future frames but leaves properties at current mid-tween value.
**How to avoid:** Always call `labelNode.setScale(startScale, startScale, 1)` immediately after `Tween.stopAllByTarget`, before starting new tween.
**Warning signs:** Label appears at wrong initial size on rapid consecutive taps.

### Pitfall 2: Score punch fires every frame because score comparison uses float
**What goes wrong:** `gameState.score` is a float that changes by a fractional amount each frame (it shouldn't — score is applied in one shot per tap — but defensive coding matters).
**Why it happens:** Comparing floats directly; `_lastScore` never catches up.
**How to avoid:** Use `Math.floor(this.gameState.score)` for comparison. The score label already displays `Math.floor(this.gameState.score)` so this is consistent.
**Warning signs:** Score label perpetually twitching.

### Pitfall 3: Zigzag tween variable not reassigned in loop
**What goes wrong:** All `.by()` calls chain from the original tween object returned by `tween(slot.node)`, not the accumulated chain — only the first and last segment are actually registered.
**Why it happens:** `t = t.by(...)` must reassign; forgetting the `t =` prefix drops the chain reference.
**How to avoid:** Use `t = t.by(...)` pattern explicitly in the loop. Alternatively, pre-build the full chain as an array and reduce.
**Warning signs:** Float goes straight up instead of zigzagging.

### Pitfall 4: D-07 punch-in tween conflicts with position zigzag tween (same node)
**What goes wrong:** Scale tween and position tween started simultaneously on `slot.node` — one may cancel the other if `Tween.stopAllByTarget` is called between them.
**Why it happens:** Cocos allows multiple simultaneous tweens on different properties of the same target, but `Tween.stopAllByTarget(slot.node)` cancels ALL tweens on that node.
**How to avoid:** Start scale punch-in first. Start position zigzag second. Do NOT call `Tween.stopAllByTarget(slot.node)` between them. Both must be started in the same synchronous call stack.
**Warning signs:** Float snaps to scale=1.0 immediately without punch-in.

### Pitfall 5: Combo punch-in opacity tween conflicts with `_playComboBreak` opacity blink
**What goes wrong:** If a wrong tap immediately follows a correct tap, `_playComboBreak()` calls `Tween.stopAllByTarget(uiOp)` on the combo label's UIOpacity — stopping the fade-in mid-animation.
**Why it happens:** Both methods target the same `UIOpacity` component.
**How to avoid:** `_playComboBreak()` already calls `Tween.stopAllByTarget(uiOp)` before the blink — this is correct. The punch-in fade-in will just be interrupted, which is acceptable (break > build). No code change needed; document as expected behavior.

### Pitfall 6: `_stopAllJuiceAnimations()` doesn't reset `_lastScore`
**What goes wrong:** On game restart, `_lastScore` still holds the previous session's final score — no punch fires on the first correct tap of the new session.
**Why it happens:** `_stopAllJuiceAnimations()` resets juice state but new `_lastScore` field won't be included unless explicitly added.
**How to avoid:** Add `this._lastScore = -1;` (or equivalent sentinel) to `_stopAllJuiceAnimations()`.

---

## Code Examples

### Verified: Existing combo pulse (to be extended for D-03/D-04)
```typescript
// Source: GameController.ts _pulseComboLabel(), lines 349-367
private _pulseComboLabel(streak?: number): void {
    if (!this.comboLabel) return;
    const labelNode = this.comboLabel.node;
    const uiT = labelNode.getComponent(UITransform);
    if (uiT) { uiT.anchorX = 0.5; uiT.anchorY = 0.5; }
    Tween.stopAllByTarget(labelNode);
    labelNode.setScale(1, 1, 1);
    const isMilestoneStreak = streak !== undefined && streak >= 10 && streak % 10 === 0;
    const peakScale = isMilestoneStreak ? 1.6 : 1.25;
    tween(labelNode)
        .to(0.08, { scale: new Vec3(peakScale, peakScale, 1) }, { easing: 'backOut' })
        .to(0.10, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'cubicIn' })
        .start();
}
```

### Verified: Existing score float spawn (to be extended for D-06/D-07/D-08)
```typescript
// Source: GridRenderer.ts spawnScoreFloat(), lines 412-467
// key branch:
if (powerUpMultiplier > 1) {
    const finalAmount = Math.round(amount * powerUpMultiplier);
    const counter = { value: amount };
    tween(counter)
        .to(0.4, { value: finalAmount }, { easing: 'cubicOut', onUpdate: () => {
            slot.label.string = `+${Math.round(counter.value)}`;
        }})
        .start();
}
```

### Verified: Tween on plain JS object with onUpdate (count-up pattern)
```typescript
// Source: GridRenderer.ts lines 433-441 — proven pattern for animating Label text
const counter = { value: amount };
tween(counter)
    .to(0.4, { value: finalAmount }, {
        easing: 'cubicOut',
        onUpdate: () => { slot.label.string = `+${Math.round(counter.value)}`; },
    })
    .start();
```

### Verified: Multi-step `.by()` chain (zigzag model)
```typescript
// Source: GridRenderer.ts lines 453-457, shakeGrid() lines 354-359
// shakeGrid uses .to() chaining; float uses .by() chaining — both patterns work
tween(slot.node)
    .by(duration / 3, { position: new Vec3( wobbleX,  riseY / 3, 0) }, { easing: 'sineOut' })
    .by(duration / 3, { position: new Vec3(-wobbleX * 2, riseY / 3, 0) })
    .by(duration / 3, { position: new Vec3( wobbleX,  riseY / 3, 0) })
    .start();
```

---

## Recommended Discretion Decisions

Items marked "Claude's Discretion" in CONTEXT.md — recommendations based on research:

### Score HUD Color Flash Thresholds (D-02)
MILESTONE_THRESHOLDS are `[10, 25, 50]` taps (not score values). For score-based flash, use a separate threshold table tied to score magnitude. Recommendation — three levels:
- Score delta < 50: white flash (same as CORRECT_FLASH_WHITE — subtle)
- Score delta 50-99: yellow flash (CORRECT_FLASH_YELLOW = `255, 220, 60`)
- Score delta >= 100: orange flash (`255, 160, 0`) — matches SCORE_MULTIPLIER border glow palette

This reuses existing Color constants and keeps the number of new constants minimal.

### Combo Punch-in Start Scale Formula (D-04)
Linear interpolation from streak=2 (1.5x) to streak=10+ (3.0x), clamped:
```
startScale = Math.min(1.5 + (streak - 2) * 0.1875, 3.0)
```
- streak=2 → 1.5x, streak=10 → 3.0x (exactly), streak>10 → 3.0x (clamped)

Export as `getComboStartScale(streak: number): number` from JuiceHelpers for testability.

### Zigzag Parameters (D-08)
5 segments, 28px displacement per segment, duration scaled same as existing float (`getFloatDuration(multiplier)` but multiply by 1.3 to make multiplier floats feel more substantial):
- Segment count: 5 (odd number — ensures net horizontal displacement is small)
- X displacement: 28px (vs existing wobbleX=14 for normal — 2x more dramatic)
- Duration multiplier: 1.3x `getFloatDuration(multiplier)` — longer hang time

### Combo Break Flash Implementation (D-05)
Two simultaneous effects:
1. Combo label: scale punch to 2.0x + immediate shrink (faster and bigger than normal pulse)
2. `redFlashOverlay`: opacity peak 89/255 (~35%) vs normal wrong-tap 51/255 (~20%)
No additional scene nodes needed — reuses existing `redFlashOverlay`.

### Score Float Color When Multiplier Active (D-06)
Gold: `new Color(255, 200, 50, 255)` — distinct from white (normal), distinct from red (wrong tap), harmonizes with SCORE_MULTIPLIER border glow color (`255, 100, 30`). Add as `FLOAT_COLOR_MULTIPLIER` constant in FlowerColors.ts.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — pure TypeScript/Cocos animation changes, no CLI tools, databases, or external services required).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 3.2.4 |
| Config file | `/e/workspace/ProjectAI/vitest.config.ts` |
| Quick run command | `npm run test:run -- --reporter=verbose` (from `/e/workspace/ProjectAI`) |
| Full suite command | `npm run test:run` (from `/e/workspace/ProjectAI`) |

Test scope is `BloomTap/assets/scripts/logic/**/*.test.ts` — only pure TS logic files. Cocos-dependent code (GameController, GridRenderer) is NOT covered by automated tests; those require human verification in Cocos Editor.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| JUICE-02 | `getScoreFlashColor(delta)` returns correct Color per threshold | unit | `npm run test:run -- JuiceHelpers` | ❌ Wave 0 — new helper |
| JUICE-03 | `getComboStartScale(streak)` returns correct scale values at streak=2, 5, 10, 15 | unit | `npm run test:run -- JuiceHelpers` | ❌ Wave 0 — new helper |
| JUICE-04 | Zigzag path params (segment count, displacement) are returned by new helper if extracted | unit | `npm run test:run -- JuiceHelpers` | ❌ Wave 0 — new helper |
| JUICE-02 | Score HUD punch+flash fires on score increase, not every frame | manual | Human verify in Cocos Editor | N/A |
| JUICE-03 | Combo label starts large and shrinks to normal on each streak increase | manual | Human verify in Cocos Editor | N/A |
| JUICE-03 | Combo break flash is visually stronger than normal wrong tap | manual | Human verify in Cocos Editor | N/A |
| JUICE-04 | Score float with multiplier active: gold color, punch-in, count-up, zigzag | manual | Human verify in Cocos Editor | N/A |
| JUICE-04 | Normal float (no multiplier) behavior unchanged | manual | Regression check in Cocos Editor | N/A |

### Sampling Rate
- **Per task commit:** `npm run test:run` (fast — <5s for all 11 logic test files)
- **Per wave merge:** `npm run test:run` + human verify in Cocos Editor
- **Phase gate:** Full suite green + all 4 manual criteria confirmed before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `JuiceHelpers.ts` — add `getScoreFlashColor(scoreDelta: number): Color` (requires 'cc' import — note: JuiceHelpers currently has NO 'cc' import; if Color import is avoided, return a plain `{r, g, b}` struct instead and convert at call site in GameController)
- [ ] `JuiceHelpers.ts` — add `getComboStartScale(streak: number): number`
- [ ] `JuiceHelpers.test.ts` — add tests for both new helpers

**Important:** JuiceHelpers.ts currently imports nothing from 'cc' — this is deliberate for testability (vitest runs in node environment without Cocos). `Color` is a Cocos class and cannot be imported in JuiceHelpers without breaking vitest. Solution: `getScoreFlashColor` returns `{r: number, g: number, b: number}` and the call site in GameController constructs `new Color(...)` from it. OR: define flash color data as plain objects in JuiceHelpers, keep Color construction in GameController/FlowerColors.ts.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Score float: static `+N` label | Count-up animation base→final | Phase 11 (D-18/D-20) | Float now shows multiplied value visually — extend with zigzag in this phase |
| Combo pulse: simple scale pulse | Milestone-aware peak scale (1.25 or 1.6) | Phase 11 | Basis for streak-proportional start scale in D-04 |
| Wrong tap: label opacity blink only | Label blink + redFlashOverlay | Phase 11 (JUICE-03) | Combo break can now reuse `redFlashOverlay` at higher opacity |

---

## Open Questions

1. **JuiceHelpers.ts Color import restriction**
   - What we know: File currently has zero 'cc' imports; vitest tests pass cleanly
   - What's unclear: Whether adding `Color` import would break vitest or if jsdom mock would cover it
   - Recommendation: Do NOT add Color to JuiceHelpers. Return `{r, g, b}` plain objects for color data. GameController/FlowerColors.ts constructs `new Color()` from them. This is clean and avoids test environment complexity.

2. **Score punch trigger: `_updateHUD()` fires every frame**
   - What we know: `_updateHUD` calls `scoreLabel.string = Math.floor(score)` every frame. Score only changes on tap events.
   - What's unclear: Whether to add `_lastScore` tracking in `_updateHUD()` or trigger punch directly in `handleCorrectTap()` return path.
   - Recommendation: Trigger in `handleCorrectTap()` directly (alongside the existing `_pulseComboLabel` call) — this is more explicit and eliminates the need for a dirty-check variable. Add `_punchScoreLabel(rawScore)` call there.

3. **`_playComboBreak()` vs `_playRedFlash()` overlap on wrong tap**
   - What we know: `handleWrongTap()` calls both `_playRedFlash()` AND `_playComboBreak()`. Both animate `redFlashOverlay` UIOpacity.
   - What's unclear: Whether running both causes visual conflict.
   - Recommendation: If streak was >= 2 (combo break), skip `_playRedFlash()` and use the stronger version inside `_playComboBreak()`. If streak was 0 or 1 (no combo to break), use only `_playRedFlash()`. Pass `streak` to `handleWrongTap()` or check `comboSystem.tapCount` before the wrong tap resets it.

---

## Sources

### Primary (HIGH confidence)
- `GridRenderer.ts` (live codebase) — `spawnScoreFloat()` lines 412-467, `shakeGrid()` lines 350-360, `playTapPulse()` lines 333-347
- `GameController.ts` (live codebase) — `_pulseComboLabel()` lines 349-367, `_playComboBreak()` lines 329-346, `_playRedFlash()` lines 312-327, `_playMilestoneCelebration()` lines 377-405, `_updateHUD()` lines 767-790
- `JuiceHelpers.ts` (live codebase) — `MILESTONE_THRESHOLDS`, all helper functions
- `FlowerColors.ts` (live codebase) — existing Color constants
- `vitest.config.ts` (live codebase) — test scope and runner config

### Secondary (MEDIUM confidence)
- Cocos Creator 3.8.8 tween documentation (behavior of `.by()` chain, multiple simultaneous tweens on same node) — inferred from existing working patterns in codebase rather than official docs fetch; consistent with Cocos 3.x tween API documented behavior.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies; all tooling verified in codebase
- Architecture: HIGH — all patterns verified against working code in same project
- Pitfalls: HIGH — derived from direct code reading; not theoretical
- Discretion decisions: MEDIUM — reasonable defaults based on existing color palette and scale values; playtest may want tuning

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable codebase; no external library churn)
