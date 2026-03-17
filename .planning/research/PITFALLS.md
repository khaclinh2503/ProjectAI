# Pitfalls Research

**Domain:** Cocos Creator 3.8.8 TypeScript casual game — adding config-driven gameplay, power-up flowers, pause system, and sprite art to existing timestamp-based FSM game (Bloom Tap v1.1)
**Researched:** 2026-03-17
**Confidence:** HIGH (based on direct inspection of live source code: FlowerFSM.ts, GameController.ts, GridRenderer.ts, GameState.ts, SpawnManager.ts, ComboSystem.ts)

---

## Critical Pitfalls

### Pitfall 1: Timestamp Pause — Using a Simple Flag Instead of an Offset

**What goes wrong:**
The existing `FlowerFSM` derives state from `nowMs - spawnTimestamp`. If pause is implemented as a boolean flag that stops calling `update()` but does NOT adjust `spawnTimestamp`, every flower skips forward by the full pause duration the moment the game resumes. A flower that was 800ms into its 900ms BUD phase instantly transitions to DEAD when unpausing after a 2-second pause. The session countdown similarly jumps forward — a 30-second pause makes the game end 30 seconds early.

**Why it happens:**
The flag approach feels correct because it stops visible rendering changes. The bug only appears at resume. Developers test by tapping Start then immediately tapping Pause → Resume without waiting, and see no problem — the issue requires a real pause duration (>1s) to manifest.

**How to avoid:**
When `pause()` is called, record `pauseStartMs = performance.now()`. When `resume()` is called, compute `pauseDurationMs = performance.now() - pauseStartMs`. Apply this offset to ALL timestamp anchors:

- `gameState.sessionStartMs += pauseDurationMs` — shifts the session clock forward so elapsed time excludes pause
- For every live flower in `grid.getCells()`: `flower.shiftSpawnTimestamp(pauseDurationMs)` — requires adding a `shiftSpawnTimestamp(offsetMs: number)` method to `FlowerFSM` that adds the offset to `_spawnTimestamp`
- `_nextSpawnMs += pauseDurationMs` in `GameController` — prevents the spawn scheduler from firing a burst of spawns immediately on resume
- `comboSystem` does not use timestamps — no adjustment needed

This is the only correct strategy for a timestamp-based FSM. There is no shortcut.

**Warning signs:**
- On resume, flowers that were in BUD jump directly to WILTING or DEAD
- Game ends early by exactly the pause duration
- Score float animations that were mid-flight skip to completion on resume
- Spawn burst of multiple flowers appears immediately on resume

**Phase to address:** Pause implementation phase (PAUSE-01). Must be the first thing verified in that phase — all other pause behavior depends on this offset math being correct.

---

### Pitfall 2: Combo Timer Pause — ComboSystem Has No Timestamp; GameController Does

**What goes wrong:**
`ComboSystem` does not use timestamps — it is stateless between taps. However, `GameController` uses `this.scheduleOnce()` for the countdown chain, and `this.schedule()` for the urgency blink. Pausing via `this.node.active = false` or a simple flag does not stop Cocos-scheduled callbacks. The urgency blink timer continues running during pause; when the game resumes the blink state is desynced from the actual timer.

**Why it happens:**
Cocos `schedule()` / `scheduleOnce()` are attached to the Component's node. They pause automatically when the node is set inactive BUT only if the node itself is deactivated — not if just a flag is checked. Developers often assume `_isPaused = true` stops everything, but Cocos schedules keep firing.

**How to avoid:**
During pause, call `this.unschedule(this._blinkCallback)` explicitly (mirroring what `_applyUrgencyStage` does when stopping the blink). Store whether blink was active at pause time and restore it on resume. Alternatively, set `this.node.active = false` during pause to freeze all Cocos schedules on that node — but this also stops `update()`, which is fine if the pause flag pattern is already implemented there.

The safest approach: combine node deactivation with timestamp offset strategy. Deactivate the main game node to freeze all schedules, then on re-activation apply the cumulative `pauseDurationMs` offset to all timestamps before re-enabling `update()`.

**Warning signs:**
- Timer blink continues running during pause (blink visible through overlay)
- After resume, blink fires out of rhythm with the timer countdown
- Urgency stage jumps unexpectedly after resume

**Phase to address:** Pause implementation phase (PAUSE-01). Verify by pausing at exactly ≤10s remaining and confirming the blink stops completely.

---

### Pitfall 3: Power-up Active Duration Uses Wall-Clock Time — Pause Drains It

**What goes wrong:**
If a power-up effect (e.g., score multiplier x2 for 8 seconds) is implemented as `effectExpiry = performance.now() + 8000`, pausing does not stop the expiry countdown. The power-up expires normally during a pause, wasting the effect. From the player's perspective: tap a rare power-up flower, immediately pause to think about strategy, resume to find the power-up already gone.

**Why it happens:**
The same root cause as Pitfall 1 — wall-clock timestamps run through pauses. Developers add power-ups before the pause system and forget to add power-up expiry to the offset adjustment list.

**How to avoid:**
Power-up expiry timestamps must be part of the same offset adjustment done at resume. When `pauseDurationMs` is calculated, shift every active power-up's `expiryMs += pauseDurationMs` in the same pass that adjusts flower spawn timestamps and `sessionStartMs`.

Implement a central `_applyPauseOffset(offsetMs: number)` method in `GameController` that adjusts ALL timestamp anchors in one place:
- `gameState.sessionStartMs`
- All flower `spawnTimestamp` values via `shiftSpawnTimestamp()`
- `_nextSpawnMs`
- All active power-up `expiryMs` values

Never adjust timestamps in scattered locations — missing one causes subtle bugs.

**Warning signs:**
- Tapping a power-up flower then immediately pausing and resuming shows the effect duration was consumed during pause
- Power-up visual indicator (timer bar/countdown) continues counting down during pause
- Power-up expires 0-2 seconds after resume despite being tapped just before pause

**Phase to address:** Power-up system phase (SPECIAL-01 through SPECIAL-04). Design the expiry mechanism with pause-compatibility from the start, before implementing any individual power-up effects.

---

### Pitfall 4: Power-up Stacking — Multiple Active Effects Overwrite Each Other

**What goes wrong:**
If the player taps a score multiplier power-up while one is already active, a naive implementation sets `activeMultiplier = 2.0` again, resetting the expiry timer and discarding any remaining duration of the first effect. Worse: if two different power-up types are active simultaneously (e.g., score multiplier + slow growth), one power-up expiring clears the other because expiry logic assumes only one active effect at a time.

**Why it happens:**
Single-variable storage: `activePowerUp: PowerUpType | null` with a single `expiryMs`. Works fine when only one power-up can ever be active, fails immediately when two overlap (which is inevitable in Phase 3 with higher spawn rates).

**How to avoid:**
Model active effects as a Map keyed by effect type, not a single variable:

```
activeEffects: Map<PowerUpType, { expiryMs: number }>
```

On tick: iterate all active effects, remove expired ones, compute the effective multiplier as the product or maximum of all active multipliers. Each power-up type independently expires. On pause offset, iterate the Map and shift each `expiryMs`.

Define a stacking policy per effect type:
- `SCORE_MULTIPLIER`: stack multiplicatively (two x2 = x4), OR refresh duration (keep existing, extend to max of old/new expiry)
- `TIME_FREEZE`: refresh duration (extending is sufficient; stacking does not make sense)
- `SLOW_GROWTH`: stack additively up to a cap (e.g., max 3 slow stacks)

Document this policy before implementation — it is a gameplay balance decision, not a technical one.

**Warning signs:**
- Tapping a second score multiplier power-up resets the timer instead of extending it
- Tapping a freeze flower cancels a slow-growth effect that was already active
- Effect indicator HUD shows wrong remaining duration after second power-up tap

**Phase to address:** Power-up system phase (SPECIAL-02 through SPECIAL-04). The Map-based model must be the initial design, not a refactor.

---

### Pitfall 5: Config JSON Load Is Async — Game Boots Before Config Is Ready

**What goes wrong:**
Cocos Creator loads JSON resources via `resources.load()` which is asynchronous. If `GameController.onLoad()` calls `SpawnManager` or reads flower config before the JSON load callback fires, all config reads return `undefined` and the game silently uses fallback/default values. Flowers spawn with zero-duration cycles (instantly die), scores are NaN, phase boundaries are missing.

**Why it happens:**
Developers call `resources.load('configs/flower_config')` in `onLoad()` and proceed with initialization on the next line assuming the load is synchronous. The load callback fires 1-3 frames later. This works correctly on localhost (fast disk) but fails on the first real device test where asset loading has network latency.

**How to avoid:**
Gate all game startup on config load completion. Do not proceed from `WAITING` to `COUNTDOWN` until configs are loaded. Pattern:

```typescript
onLoad(): void {
    this._phase = SessionPhase.LOADING;
    resources.load('configs/flower_config', JsonAsset, (err, asset) => {
        if (err) { console.error('Config load failed', err); return; }
        this._flowerConfig = asset.json;
        resources.load('configs/spawn_config', JsonAsset, (err2, asset2) => {
            if (err2) { console.error('Spawn config load failed', err2); return; }
            this._spawnConfig = asset2.json;
            this._onConfigsReady(); // ONLY here proceed to WAITING phase
        });
    });
}
```

Alternatively use `Promise.all()` with Cocos's promisified load helpers if available in 3.8.8.

**Warning signs:**
- Flowers spawn and die instantly on first launch (config undefined → `budMs = undefined → NaN`)
- Console shows `TypeError: Cannot read property 'budMs' of undefined`
- Works on fast localhost, fails on physical device or after clearing asset cache

**Phase to address:** Config-driven system phase (CFG-01, CFG-02). The async-safe load pattern must be established before any config values are consumed.

---

### Pitfall 6: Config JSON Schema Validation Missing — Bad Values Corrupt Gameplay Silently

**What goes wrong:**
A JSON config file with `"budMs": "1350"` (string instead of number) or `"tapWindowMs": 0` (invalid) loads without errors and propagates NaN or zero values into the FSM. Division by zero in `getScore()` (`t / tapWindowMs` where `tapWindowMs = 0`) produces `Infinity`. `Math.round(Infinity * multiplier)` produces `Infinity`, which then appears as "Infinity" in the score label and corrupts localStorage.

**Why it happens:**
JSON parsing (`JSON.parse`) performs no type validation. TypeScript interfaces are compile-time only — they do not validate runtime JSON values. Developers trust that their JSON is well-formed and skip validation.

**How to avoid:**
Add a `validateFlowerConfig(config: unknown): FlowerTypeConfig` function that checks:
- All required fields are present
- All `*Ms` values are positive integers (`> 0`)
- `budMs + tapWindowMs + wiltingMs + deadMs === cycleDurationMs` (sum check)
- `bloomingMs + fullBloomMs === tapWindowMs` (sub-split check)
- `scoreBloom > 0 && scoreFull > scoreBloom`

Throw a descriptive error at load time, not at runtime. Same validation for spawn config: `intervalMs > 0`, `maxAlive > 0`, all weights sum to a positive total.

Run this validation in the config load callback before accepting the config. Unit-test the validator with intentionally malformed inputs.

**Warning signs:**
- Score label shows "NaN" or "Infinity"
- Flowers appear and immediately disappear (0ms durations)
- Weights that sum to zero cause `pickFlowerType()` to return the last entry every time
- No error thrown — silent corruption is the signature of missing validation

**Phase to address:** Config-driven system phase (CFG-01). The validator must be written before or simultaneously with the config loader, not as a later polish step.

---

### Pitfall 7: Sprite Atlas Swap on Pooled Graphics Nodes — Graphics Component Conflicts With Sprite

**What goes wrong:**
The current `GridRenderer` uses Cocos `Graphics` components on each cell node to draw colored rounded rectangles. Adding sprite textures for the art refresh (ART-01) while keeping the `Graphics` component on the same node causes rendering order conflicts. Both `Graphics` and `Sprite` components attempt to draw in the same render pass on the same node. The result is either sprites drawn under the colored rectangles (invisible) or the Graphics component overdrawing the sprite each frame.

**Why it happens:**
It is tempting to add a `Sprite` component alongside the existing `Graphics` component as a "quick toggle" between color mode and sprite mode. Cocos Creator does not prevent adding both to the same node, but the rendering result is undefined when both have content.

**How to avoid:**
Two options — choose one before starting ART-01:

1. **Replace strategy:** Remove the `Graphics` component from each cell node in `_buildCellViews()` and add a `Sprite` component instead. The `_paintState()` method switches `sprite.spriteFrame` instead of `g.fillColor`. The `_paintEmpty()` method sets `sprite.spriteFrame` to a transparent or empty placeholder frame. This requires a sprite atlas with frames for each flower type × each state (5 types × 5 states = 25 frames minimum) plus an empty cell frame.

2. **Layer strategy:** Keep the `Graphics` component as the background (empty cell styling), add a child node on each cell with a `Sprite` component for the flower art. The flower child node is active only when a flower is present. This is more nodes (128 total) but cleaner separation of concerns.

Do not try to use both `Graphics` and `Sprite` on the same node for the same purpose.

**Warning signs:**
- Adding a `Sprite` component to a cell node makes the colored rectangle disappear
- Or: the sprite is visible but covered by a solid-color rectangle on every frame
- Switching between color and sprite mode causes a one-frame flash of wrong content

**Phase to address:** Art refresh phase (ART-01). Architectural decision must be made at the start of this phase. The "layer strategy" (option 2) is recommended to preserve the existing color system as a fallback during transition.

---

### Pitfall 8: Sprite Atlas Memory — Loading All 25 Flower State Frames Redundantly

**What goes wrong:**
If flower sprites are added as 25 individual `SpriteFrame` assets (one per flower type × state combination) instead of a single sprite atlas, Cocos loads 25 separate textures into GPU memory. On mobile WebGL, each texture upload has overhead and VRAM usage is ~25x that of a single atlas. Additionally, `resources.load()` for 25 separate frames is 25 async calls, increasing load time.

**Why it happens:**
Individual sprite files are easier to manage in the asset browser during development. The performance problem only appears on target hardware, not on desktop.

**How to avoid:**
Package all flower state frames into a single sprite atlas using Cocos Creator's Auto Atlas feature (Project → Auto Atlas). One atlas texture = one GPU upload = one texture slot. The atlas packs all frames automatically at build time. Access individual frames via `spriteAtlas.getSpriteFrame('cherry_bud')`.

Size the atlas to a power-of-two texture (e.g., 512×512 or 1024×512) to maximize GPU compatibility. For 25 frames at ~64×64px each, a 512×512 atlas with some headroom for the special flower frames is sufficient.

**Warning signs:**
- First session load takes 3-5 seconds instead of <1 second (many separate texture uploads)
- Memory profiler shows 25+ separate texture allocations instead of 1-2
- Frame rate drops on the first render frame after flowers spawn (texture upload stall)

**Phase to address:** Art refresh phase (ART-01, ART-02). Atlas must be set up before any sprites are assigned to cell nodes — retrofitting an atlas requires updating all SpriteFrame references.

---

### Pitfall 9: HUD Combo Label Shows tapCount (Current Bug) — v1.1 Targets multiplier

**What goes wrong:**
The existing `_updateHUD()` code sets `comboLabel.string = streak > 1 ? 'Combo x${streak}' : ''` where `streak = comboSystem.tapCount`. This is the documented HUD-03 bug: it shows tap count, not the multiplier value. In v1.1, if the combo label is updated to show `multiplier.toFixed(1)` without also updating the initial display (when tapCount = 0), the label shows empty string on a fresh session but should show "x1.0".

**Why it happens:**
The fix is simple but has a subtle off-by-one: `comboSystem.multiplier` starts at 1.0, so the condition `streak > 1` hides the label when it should now show "x1.0". If the fix only changes `tapCount` to `multiplier` without adjusting the visibility condition, the combo label disappears for the first 9 taps (multiplier = 1.0 to 5.5, but the old threshold was tapCount > 1).

**How to avoid:**
Define a clear display policy before writing the fix:
- Show "x1.0" from the first frame of a session (do not hide at multiplier = 1.0)
- Or: hide at exactly 1.0 and show as soon as the first correct tap increases it to 1.5

The PROJECT.md requirement "comboLabel hiển thị multiplier.toFixed(1) từ đầu ván" means show from the start. Therefore remove the `streak > 1` condition entirely and always show the label with `multiplier.toFixed(1)`. Update the existing test for comboLabel display logic to reflect the new behavior before changing the code.

**Warning signs:**
- Combo label is blank for the first 9 taps of a new session
- After 10+ correct taps the label suddenly appears showing "x5.5" with no intermediate steps visible
- Power-up score multiplier (a global modifier on top of combo multiplier) shows wrong value because the label was built for combo only

**Phase to address:** Bug fix phase (HUD-03). Fix this before implementing power-up effects — the combo label is also where score multiplier power-up status should be visible.

---

### Pitfall 10: Time Freeze Power-up — Session Clock Must Freeze, Not Just Stop Spawns

**What goes wrong:**
A naive "freeze time" implementation stops the spawn scheduler (`_nextSpawnMs` is not advanced) but does not freeze `gameState.sessionStartMs`. The session countdown continues running during freeze. The player's clock shows "30 seconds remaining" ticking down while the freeze is supposed to halt time — the player paid for a power-up that doesn't actually freeze the game timer.

**Why it happens:**
Stopping spawns is the visible part of "freeze." The session timer is a separate system that developers forget to also freeze.

**How to avoid:**
TIME_FREEZE effect must do two things simultaneously:
1. Advance `gameState.sessionStartMs` forward by delta-time each frame during the freeze effect (effectively "pausing" the session clock without pausing the actual game loop)
2. Prevent `FlowerFSM` state transitions during freeze by also advancing all `spawnTimestamp` values forward by delta-time each frame

This is conceptually the same as a continuous rolling pause — each frame while freeze is active, apply a 1-frame-duration offset to all timestamps. The implementation reuses the same offset mechanism from Pitfall 1/3 but applied incrementally per frame instead of all-at-once at resume.

Alternatively: track a separate `frozenSessionTime` that the game uses instead of the wall clock during freeze. This is cleaner but requires threading a `gameTimestamp` parameter through more methods than the current `nowMs` pattern.

**Warning signs:**
- Session countdown visibly continues during "freeze time" effect
- Flowers stop spawning but continue their lifecycle animations during freeze
- The freeze effect visually appears in the renderer but the game clock keeps running

**Phase to address:** Power-up system phase (SPECIAL-03). This is the hardest power-up to implement correctly — design the freeze mechanism before writing any other SPECIAL-0x code.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single `activePowerUp` variable instead of `Map<PowerUpType, effect>` | Simpler for first power-up | Second power-up type added → rewrite required; stacking edge cases multiply | Never — start with Map immediately |
| Inline timestamp offset calls at pause/resume instead of `_applyPauseOffset()` | Fewer lines of code for MVP | Missing one timestamp anchor on addition of each new feature (power-ups, special flowers) causes subtle bugs | Never — centralize the offset function |
| Load JSON without schema validation | Faster config plumbing | Silent NaN/Infinity corruption when file is manually edited; hard to diagnose | Never for gameplay-critical fields (durations, scores) |
| Add `Sprite` component to existing `Graphics` node rather than replacing or layering | No refactor of existing node structure | Rendering conflicts; one or both components silently overdraw | Never — pick one approach before adding sprites |
| Hardcode `_nextSpawnMs` pause offset at the call site rather than in the centralized offset function | Local fix is quick | Spawner is missed in future pause extension (e.g., rewinding after power-up expires) | Never |
| Skip `shiftSpawnTimestamp()` method on FlowerFSM and instead clear all flowers on pause | No FSM changes needed | All flowers disappear every time player pauses — bad UX | Only acceptable in an extreme time-constraint MVP; document as known issue |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Cocos `resources.load()` + config JSON | Reading config values on the line immediately after `resources.load()` call | All config consumption must be inside the callback or chained via Promise; never assume sync load |
| Cocos `schedule()` / `scheduleOnce()` | Assuming a boolean flag stops scheduled callbacks | Scheduled callbacks fire regardless of game flags; explicitly `unschedule()` them on pause or set the node inactive |
| Cocos Sprite + Graphics on same node | Both components present renders unpredictably | Use either Graphics or Sprite per node; use child nodes to layer them |
| Cocos Auto Atlas | Referencing individual SpriteFrame assets by file path after atlas is built | After auto-atlas, reference frames via `SpriteAtlas.getSpriteFrame(frameName)`, not direct file path |
| FlowerFSM `_spawnTimestamp` (private readonly) | Cannot shift timestamp if it is `readonly` | Change to `private` (non-readonly) and add `shiftSpawnTimestamp(offsetMs)` method; or use a separate mutable offset field on the FSM |
| ComboSystem multiplier + power-up global multiplier | Applying both multipliers at the same applyCorrectTap call site | Define a clear score pipeline: `rawScore × comboMultiplier × globalPowerUpMultiplier`; the current `GameState.applyCorrectTap` only takes `rawScore` and `combo` — add `globalMultiplier` parameter or compute before calling |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Iterating all 64 cells to apply pause offset | Micro-stutter on pause tap | 64 iterations is trivial — not a real trap; do it without hesitation | Not an issue — 64 cells is O(1) equivalent |
| Per-frame `resources.load()` calls in `update()` | Asset loading triggered every frame during the LOADING phase | Load configs once in `onLoad()`, gate with a `_configsLoaded` flag | Immediately visible as console flood of load requests |
| Creating new `Vec3` objects in tween callbacks every frame | GC accumulation over 120s | Pre-allocate `Vec3` instances for recurring tween targets | After ~500 tween starts; becomes visible in Phase 3 combos |
| Scanning `activeEffects Map` in `getScore()` hot path | Multiplier lookup adds per-tap cost | Keep a pre-computed `cachedGlobalMultiplier` that is recomputed only when effects Map changes | With >3 simultaneous active effects (unlikely in v1.1 but worth noting) |
| Sprite atlas not loaded before first flower spawn | First flower appears blank/missing for 1-2 frames then pops in | Pre-load atlas in config-load phase before allowing session start | On first play only; cached thereafter — still bad UX |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Pause button not visible during intense Phase 3 | Player cannot pause when they most need to — needs a break during fast wave | Keep pause button at constant position, never covered by score floats or milestone overlays |
| Power-up effect has no visible duration indicator | Player does not know how much time remains on multiplier/freeze | Show a timer bar or countdown near the power-up HUD icon; drain animation makes duration visceral |
| Score multiplier power-up stacks with combo multiplier confusingly | Score jump feels arbitrary; player cannot mentally predict points | Show combined effective multiplier clearly: "x2.0 combo × x2.0 power = x4.0" or simplify display |
| Time freeze effect leaves flowers in BLOOMING state longer than expected | Players tap frozen flowers aggressively then discover the freeze ended; wrong-tap burst | Flash a clear visual indicator when freeze is about to expire (last 1-2 seconds) |
| Slow growth power-up extends tap windows invisibly | Players do not realize they have more time and rush taps as usual | Visual cue on affected flowers during slow growth: different animation speed is itself the indicator if frame-rate-independent |
| Special flower spawns immediately followed by death before player notices | Power-up opportunity lost; player frustration at random bad luck | Give special flowers a longer `budMs` minimum (e.g., 2× the normal flower's cycle) or a visual spawn animation that draws attention |

---

## "Looks Done But Isn't" Checklist

- [ ] **Pause offset:** Flowers appear frozen during pause — verify they resume from the SAME state, not jumped forward. Test: pause for exactly 5 seconds, resume, confirm flower lifecycle continues as if 0ms passed.
- [ ] **Power-up expiry through pause:** Tap a power-up, immediately pause for 3 seconds, resume — power-up duration must not have drained during the pause.
- [ ] **Config validation at load time:** Manually corrupt `flower_config.json` (set `budMs` to a string) — game must log a descriptive error, not silently produce NaN scores.
- [ ] **Sprite swap on correct tap:** After ART-01, a correct tap flash (yellow/white) then EMPTY must show the correct sprite frame sequence, not a one-frame color flash from the old Graphics renderer.
- [ ] **Config hotswap:** After changing a flower's `cycleDurationMs` in JSON and reloading, the in-game flower timings must reflect the new value without a code change.
- [ ] **Multiple power-up stacking:** Tap a score multiplier flower, then tap another one before the first expires — confirm the second extends or stacks correctly per the defined policy, not resets to baseline.
- [ ] **Combo label from session start:** On a fresh session, `comboLabel` must show "x1.0" immediately (not blank) per the HUD-03 fix requirement.
- [ ] **Spawn burst on resume:** After a 10-second pause, resume and confirm the spawn scheduler does NOT fire a burst of flowers in the first 3 frames.
- [ ] **TIME_FREEZE countdown:** During an active freeze, the session countdown timer must visibly stop, not continue decrementing.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Pause offset bug discovered after power-up system is built | HIGH | Add `shiftSpawnTimestamp()` to FlowerFSM, add `_applyPauseOffset()` to GameController, update every power-up expiry to go through the same offset — touches 4-5 files |
| Config validation missing; NaN in localStorage highscore | LOW-MEDIUM | Add validator function, run it at config load, add `isNaN()` guard in StorageService before writing; clear corrupt localStorage entry |
| Sprite/Graphics conflict on cell nodes | MEDIUM | Choose layer strategy (child Sprite node), add child node construction to `_buildCellViews()`, update `_paintState()` to activate/deactivate child, keep `_paintEmpty()` using Graphics |
| Power-up effects not in centralized offset function | MEDIUM | Audit all timestamp anchors (grep for `performance.now()` assignments), move each to `_applyPauseOffset()`, add tests |
| Time freeze session clock continues running | MEDIUM | Implement per-frame rolling offset during freeze (same mechanism as pause but continuous), requires threading `gameTimestamp` through `isGameOver()` check |
| Sprite atlas not set up; 25 separate textures | LOW | Create Auto Atlas, assign all flower SpriteFrames, update all `getSpriteFrame()` calls to use atlas; 1-2 hour effort |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Timestamp pause offset bug (Pitfall 1) | PAUSE-01 | Pause for 5s; resume; flowers must be in the same lifecycle position as at pause time. Measure `flower.getState(performance.now())` before and after pause — must be equal or within 1 frame's worth of progress |
| Combo timer / Cocos schedule during pause (Pitfall 2) | PAUSE-01 | Pause at ≤10s remaining; urgency blink must stop completely; confirm `_blinkCallback` is unscheduled |
| Power-up expiry drains during pause (Pitfall 3) | SPECIAL-01 through SPECIAL-04 (design phase) | Tap power-up, pause 5s, resume — effect duration must still show full duration minus the pre-pause time only |
| Power-up stacking edge cases (Pitfall 4) | SPECIAL-02 through SPECIAL-04 | Tap two score multiplier flowers back-to-back; confirm defined stacking policy (extend/multiply) is applied; no reset to baseline |
| Config load async race condition (Pitfall 5) | CFG-01 | Load game on a throttled connection (DevTools Network → Slow 3G); game must not enter WAITING state until both config files are confirmed loaded |
| Config schema validation missing (Pitfall 6) | CFG-01 | Inject `"budMs": "bad_value"` into flower_config.json; confirm error is thrown at load time with a descriptive message, not at runtime as NaN |
| Sprite/Graphics component conflict (Pitfall 7) | ART-01 | After adding first sprite frame, verify cell renders sprite (not color rectangle) in BLOOMING state; verify empty cell renders correctly |
| Sprite atlas memory management (Pitfall 8) | ART-01 (pre-implementation) | In Cocos build output, verify a single atlas texture file exists rather than 25+ individual PNGs |
| HUD combo label shows tapCount not multiplier (Pitfall 9) | HUD-03 fix | On session start, comboLabel must show "x1.0"; after first correct tap, "x1.5"; after wrong tap, "x1.0" again |
| Time freeze doesn't freeze session clock (Pitfall 10) | SPECIAL-03 | During active freeze, session countdown must read the same value for the full freeze duration; resume shows correct remaining time minus pre-freeze elapsed only |

---

## Sources

- Direct code inspection: `BloomTap/assets/scripts/logic/FlowerFSM.ts` — timestamp-based `_spawnTimestamp` pattern confirmed
- Direct code inspection: `BloomTap/assets/scripts/logic/GameState.ts` — `sessionStartMs = performance.now()` pattern confirmed
- Direct code inspection: `BloomTap/assets/scripts/GameController.ts` — `performance.now()` called directly in `update()`, `_nextSpawnMs` anchor confirmed, Cocos `schedule()` blink pattern confirmed
- Direct code inspection: `BloomTap/assets/scripts/GridRenderer.ts` — `Graphics` component on pooled cell nodes confirmed; no `Sprite` components present
- Direct code inspection: `BloomTap/assets/scripts/logic/SpawnManager.ts` — `PHASE_CONFIGS` hardcoded in TypeScript confirmed (target for CFG-02)
- Direct code inspection: `BloomTap/assets/scripts/logic/ComboSystem.ts` — no timestamp usage confirmed; safe from pause offset requirement
- Cocos Creator 3.x documentation (training knowledge): `resources.load()` async behavior, `schedule()`/`unschedule()` lifecycle, Auto Atlas — MEDIUM confidence; verify against official docs at https://docs.cocos.com/creator/3.8/manual/en/
- Pattern: timestamp-offset pause strategy — well-established in game development for real-time state machines (HIGH confidence; this is the standard approach for any FSM using absolute timestamps)

---

*Pitfalls research for: Bloom Tap v1.1 — config-driven gameplay, power-ups, pause system, sprite art refresh on Cocos Creator 3.8.8 TypeScript*
*Researched: 2026-03-17*
