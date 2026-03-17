# Feature Research

**Domain:** Casual tapping game — Bloom Tap v1.1 milestone (power-ups, config, pause, art refresh)
**Researched:** 2026-03-17
**Confidence:** HIGH (verified against Cocos Creator 3.8 official docs + community forums; web search corroborated)

---

> This document supersedes the v1.0 FEATURES.md (2026-03-13) for the v1.1 milestone scope.
> v1.0 features (grid, FSM, combo, score, juice layer, results) are already shipped and excluded here.
> Focus: the four new feature categories in v1.1 plus bug fixes.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features expected in any polished casual game of this type. Missing = feels unfinished.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Pause button during gameplay | Any mobile game without pause feels disrespectful of player's time | LOW | Single button; overlay with Resume + Restart options; no settings needed for v1.1 |
| Pause resumes cleanly to same game state | Players pause to answer a message; must return to exact state | MEDIUM | `performance.now()` continues running during pause — game logic must offset `sessionStartMs` by pause duration, not rely on `director.pause()` which freezes input |
| Flowers on screen immediately at game start | Waiting 3s for first flower after countdown ends feels broken | LOW | `_nextSpawnMs = performance.now()` at session start; spawn initial batch before first update tick |
| Combo HUD shows multiplier value | Displaying `tapCount` instead of `multiplier` is a reading bug players notice immediately | LOW | `multiplier.toFixed(1)` not `tapCount`; this is bug fix HUD-03 |
| Power-up visual is obviously distinct | Special flower must be unmissable — players need to know something rare is present | LOW | Distinct color (gold/rainbow), particle aura, or glow shader; different from 5 standard types |

### Differentiators (v1.1 Competitive Advantage)

Features that lift the experience beyond a basic tapper. These are the v1.1 headline features.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Special power-up flowers with timed effects | Creates high-value moments and decision spikes — tap it now or keep comboing? | MEDIUM | Three effect types (score multiplier, freeze timer, slow growth); duration 5–10s per effect; see detailed section below |
| Score multiplier power-up (x2–x5) | Transforms a good combo run into an exceptional score burst; feels like a jackpot moment | MEDIUM | Apply multiplier on top of existing combo multiplier; cap stacking at 1 simultaneous effect (replace, not stack) |
| Freeze timer power-up | Stops the countdown for N seconds; creates relief and urgency simultaneously | MEDIUM | Track `frozenMs` accumulated duration; adjust `sessionStartMs` offset at resume to prevent time loss |
| Slow growth power-up (bloom extension) | Widens tap windows temporarily; rewards tap timing skill by making the window more forgiving | MEDIUM | Apply a `growthRateMultiplier` to `cycleDurationMs` during effect; requires FlowerFSM to accept a rate override |
| Config-driven flower + spawn parameters | Designer can tune balance without code changes; enables rapid balancing iteration | MEDIUM | Load JSON once at startup (not hot-reload for v1.1); validate schema at load time; fail with descriptive error |
| Screen shake on wrong tap | Makes wrong taps feel punishing at a gut level; already in scope (JUICE-01) | LOW | Oscillate entire game canvas node `+/- 4px` on X axis, 3 cycles, 250ms total; stop all tweens on new wrong tap |
| JuiceHelpers refactor (coupling fix) | Removes duplication between GameController and JuiceHelpers; reduces maintenance risk | LOW | Extract `getUrgencyStage(remainingSecs)` and `getMilestoneLabel(count)` to JuiceHelpers; GameController calls them |

### Anti-Features (Deliberately Excluded from v1.1)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Multiple simultaneous power-up effects stacking | "More is more" — stacking multipliers sounds exciting | Exponential score explosion with 3 active effects breaks leaderboard balance and makes score unpredictable; very hard to tune | Allow only 1 active power-up effect at a time; new tap of a different effect replaces the active one — simpler, predictable, still impactful |
| Permanent power-up upgrades (persist between sessions) | Progression depth | Meta-progression system is v2+ scope; requires save state, balance curve, unlock UI — multiplies scope significantly | Scope boundary: v1.1 power-ups are temporary in-session effects only |
| Power-up inventory / choice | Player agency over which power-up to activate | Requires UI overlay mid-game, tap target changes, inventory state — breaks the simplicity model | Spawn is automatic and random; tap to collect is the only decision |
| Hot-reload JSON config during gameplay | Designer iteration speed without restarting | Web browser cannot watch file changes; requires a dev server and WebSocket; overkill for v1.1 single-developer project | Load-once at scene start (onLoad); restart game to pick up config changes — sufficient for balancing workflow |
| Dedicated settings screen for pause menu | Feature-complete pause experience | Bloom Tap has no audio engine yet; settings screen would only have volume controls for non-existent audio — empty screen | Pause overlay contains Resume + Restart only; settings deferred until audio is added |
| Sprite animation frames (walking/idle cycles) | Polished look | Complex animation state machine per flower cell; 64 simultaneous animated cells would spike render cost on mobile | Static sprite per growth state (5 sprites per flower type); state change = sprite swap — simple and performant |

---

## Detailed Feature Analysis

### Power-Up Flower System

#### Spawn Behavior

Standard approach in casual games: weighted probability pool, separate from the main flower weights. Recommended: 5–8% chance per spawn tick that a regular flower is replaced by a special flower. This keeps special flowers rare but not so rare they feel invisible.

**Implementation approach:** In `SpawnManager.pickFlowerType()`, after selecting the normal flower type, apply a second roll: if `Math.random() < specialFlowerSpawnChance`, override the type with `SPECIAL`. The `SPECIAL` type is not in `FLOWER_CONFIGS`; the renderer handles it as a distinct visual.

**Spawn probability:** 5–8% per spawn event (MEDIUM confidence — industry standard for power-up rarity; similar to 1/20 to 1/12 odds, confirmed by genre patterns). Do NOT add special flowers to phase weights tables — they are a cross-phase overlay.

#### Effect Duration

Industry standard for casual game power-ups: 5–10 seconds. Too short = players feel cheated if they miss activation. Too long = trivializes game balance.

- Score multiplier: **6 seconds** — long enough to collect 3–5 flowers at Phase 3 spawn rate; short enough that it does not trivialize the full round
- Freeze timer: **5 seconds** — meaningful relief without breaking the 120s structure
- Slow growth: **8 seconds** — longer because the effect is subtler (wider window, not a score boost)

Visual countdown: a shrinking radial arc or a horizontal bar below the power-up indicator in the HUD. Required — players need to know how long remains to plan their taps.

#### Stacking Decision: Replace, Not Stack

**Recommendation: replacement semantics only — one active power-up effect at a time.**

Rationale from research: status effect stacking creates exponential value in games where the compounding is intentional (e.g., RPG ability combos). For a 120s casual tapper, stacking a x5 multiplier with a freeze timer would allow scores 4–6x higher than intended, breaking the leaderboard. The UX is also simpler — a single HUD indicator for the active effect, not a stack of three.

When player taps a special flower while an effect is active: the new effect replaces the old one. Show a "replaced" visual (brief old-effect icon fades out, new one appears). This is deterministic, predictable, and easy for the player to understand.

**Exception:** Score multiplier + combo multiplier DO stack — these are different systems (one is per-flower-collected, one is an active modifier). This is intentional and already exists in the existing architecture. The cap is: no two active power-up effects simultaneously.

#### Power-Up Effect Implementation and FSM Dependency

The existing `FlowerFSM` is timestamp-based and immutable (no mutable state beyond `_collected`). Adding slow-growth effect requires passing a rate multiplier to `getState()` and `getScore()`. Two options:

**Option A (preferred):** `GameController` tracks active effect. When rendering/evaluating a flower, pass `effectiveNowMs = spawnTimestamp + (nowMs - spawnTimestamp) * growthRateMultiplier` as an adjusted timestamp. The FSM requires no changes.

**Option B:** Add `setGrowthMultiplier(m: number)` to FlowerFSM. Breaks the immutable design and creates state.

Option A preserves the pure logic tier contract and requires no changes to FlowerFSM or its 150 passing tests.

#### Freeze Timer Implementation

`performance.now()` continues advancing during pause and during freeze effects — it is not under engine control. The timer freeze effect must be tracked as accumulated frozen duration:

```
frozenMs += (unfreezeTime - freezeStartTime)
effectiveElapsedMs = (nowMs - sessionStartMs) - frozenMs
```

The `GameState.sessionStartMs` offset approach — simply advancing `sessionStartMs` by the frozen duration when the effect ends — is simpler and equivalent. The existing `GameState.isGameOver(nowMs)` check uses `nowMs - sessionStartMs`; shifting `sessionStartMs` forward extends the session correctly.

---

### Config-Driven Parameters

#### Load-Once vs Hot-Reload Decision

**Decision: load-once at scene start (`onLoad`). No hot-reload in v1.1.**

Rationale:
- Hot-reload requires a file watcher (Node.js `fs.watch`) or WebSocket server — not available in Cocos Creator HTML5 export runtime
- The target iteration workflow is: edit JSON → refresh browser tab → play — already fast enough for a single-developer project
- JSON parsing is a GC spike risk if called repeatedly; once at startup is negligible

**Cocos Creator JSON loading pattern:** Place the JSON file in `assets/resources/`. Use `resources.load('config/gameConfig', JsonAsset, callback)` in the scene's `onLoad`. The loaded object is plain JavaScript — no `cc` types, compatible with the pure logic tier.

**Schema validation:** The loader should verify required keys exist and values are within sane ranges (e.g., `cycleDurationMs > 0`, `scoreBloom < scoreFull`). Fail with a clear `console.error` and fall back to hardcoded defaults. This prevents a malformed JSON from silently producing a broken game session.

**What to externalize:**
- `FlowerTypeConfig` fields for all 5 types (currently hardcoded in `FlowerTypes.ts`)
- `SpawnPhaseConfig` fields: `intervalMs`, `maxAlive`, `weights` per phase
- Special flower: `spawnChancePct`, effect durations, multiplier values

**What to keep hardcoded:** Phase boundaries (`startMs`, `endMs`), session duration (120000ms), penalty value (10) — these are structural, not balance parameters.

---

### Pause/Resume System

#### Engine-Level Pause APIs in Cocos Creator 3

Research from official Cocos community forums (MEDIUM-HIGH confidence) reveals:

- `game.pause()` freezes the entire game including rendering, input, and audio. **Input becomes non-functional** — the Resume button cannot be tapped. Not suitable.
- `director.pause()` stops `update()` ticks and scheduler callbacks, but does NOT freeze rendering or event handlers in all versions. However, forum evidence (issue #11144 in cocos/cocos-engine) shows `director.pause()` stops UI tween animations as a side effect in some 3.x versions. Unreliable for keeping a pause overlay interactive.
- **Recommended approach:** Manual pause flag pattern.

#### Manual Pause Pattern (Recommended)

Set `this._paused = true` flag in `GameController`. In `update()`, return early if `_paused`. Record `pauseStartMs = performance.now()` when pausing. On resume, compute `pausedDurationMs = performance.now() - pauseStartMs` and add to `this.gameState.sessionStartMs`. This corrects the session timer without any engine-level API.

This preserves:
- Full rendering (pause overlay is visible)
- Full input (Resume button works)
- Tween animations in the pause overlay
- Audio (call `AudioEngine.pauseAll()` / `resumeAll()` separately if audio is added)

**Note:** The spawn timer `_nextSpawnMs` also needs offsetting by `pausedDurationMs` on resume. Otherwise the first spawn after resume fires immediately (which is fine for most cases) or is skipped (which is not).

#### Pause UI Pattern

Standard mobile casual pattern (confirmed by Game UI Database and UX research):

- Single pause icon button (top-right corner, always visible during PLAYING phase)
- On tap: dim overlay (semi-transparent dark background over grid, keeps grid visible at ~40% opacity), two large buttons: "Resume" and "Restart"
- No blur effect required — Cocos Creator's render pipeline makes blur expensive; dim overlay achieves the same state-distinction goal
- "Back to title" is optional — current architecture has a start screen; adding a third button is low value for v1.1

**Pause button node:** Add as sibling to `hudNode` in the scene hierarchy. Visible only during `SessionPhase.PLAYING`. Hidden during countdown, game over, and waiting states.

---

### Art Refresh (Sprite Approach in Cocos Creator 3.8)

#### Sprite Atlas Strategy

Cocos Creator 3.8 provides two atlas approaches:

**Auto Atlas (built-in, recommended for v1.1):**
- Create an `auto-atlas.pac` file in the sprite assets folder
- All `SpriteFrame` assets in the same folder are automatically packed into one atlas at build time
- Editor still uses individual sprite files during development — no workflow disruption
- No external tools needed; free; tight Cocos Creator integration
- Limitation: only packs sprites in the same folder; oversized sprites are excluded

**TexturePacker (external tool):**
- Export as `.plist` format (Cocos2d-x compatible) — v4.x only; v3.x unsupported
- Must disable Cocos Creator's Trim feature after import (set Trim Type to None) to avoid double-trimming artifacts
- Better control over packing algorithm, max dimensions, compression
- Worth considering only if Auto Atlas produces suboptimal results (e.g., oversized atlas from many sprites)

**Decision for v1.1: Auto Atlas.** The art set is small (5 flower types × 5 states = 25 sprites, plus UI elements). Auto Atlas handles this trivially. Revisit TexturePacker if sprite count grows beyond ~80 sprites.

#### Sprite Organization

Recommended folder structure for Cocos Creator 3.8 Auto Atlas:
```
assets/
  textures/
    flowers/          ← auto-atlas.pac here, 25 flower sprites
      cherry_bud.png
      cherry_blooming.png
      ... (5 states × 5 types)
    special/          ← auto-atlas.pac here, special flower sprites + particle frames
    ui/               ← auto-atlas.pac here, buttons, HUD elements, overlays
    background/       ← single large texture, no atlas needed
```

Each folder gets its own Auto Atlas. Avoid mixing flowers + UI in one atlas — they are loaded in different contexts and separating reduces initial load overhead.

#### `SpriteFrame` Assignment in `GridRenderer`

The existing `GridRenderer` uses a `FlowerTypeId`-keyed record of colors. For the art refresh, change to a `Record<FlowerTypeId, Record<FlowerState, SpriteFrame>>`. The `@property` decorator approach for 5×5 = 25 spriteframe slots in the inspector is verbose but explicit. Alternative: load the atlas via `resources.load` and index by filename convention (e.g., `flowers/cherry_bud`).

The `setCellTypeId()` method in `GridRenderer` currently sets a color on a `Sprite` component's node. For art refresh, it swaps `spriteFrame` on the `Sprite` component — same interface, same node, no pooling changes needed.

---

## Feature Dependencies (v1.1)

```
[Config-Driven JSON (CFG-01, CFG-02)]
    └──enables──> [All balance tuning without code change]
    └──required by──> [Special flower spawn chance in config]

[Special Flower Spawn (SPECIAL-01)]
    └──requires──> [SpawnManager extension — separate spawn roll]
    └──requires──> [GridRenderer special visual]
    └──required by──> [SPECIAL-02, SPECIAL-03, SPECIAL-04]

[Score Multiplier Effect (SPECIAL-02)]
    └──requires──> [SPECIAL-01]
    └──interacts with──> [ComboSystem multiplier (stacks intentionally)]
    └──requires──> [Power-up HUD indicator + countdown bar]
    └──conflicts with──> [SPECIAL-03, SPECIAL-04 (only 1 active at a time)]

[Freeze Timer Effect (SPECIAL-03)]
    └──requires──> [SPECIAL-01]
    └──modifies──> [GameState.sessionStartMs offset pattern]
    └──conflicts with──> [SPECIAL-02, SPECIAL-04]

[Slow Growth Effect (SPECIAL-04)]
    └──requires──> [SPECIAL-01]
    └──interacts with──> [FlowerFSM — adjusted timestamp approach, NO FSM code change]
    └──conflicts with──> [SPECIAL-02, SPECIAL-03]

[Pause/Resume (PAUSE-01)]
    └──requires──> [SessionPhase PLAYING state gate — already exists]
    └──modifies──> [GameState.sessionStartMs offset on resume]
    └──modifies──> [_nextSpawnMs offset on resume]
    └──must coexist with──> [Freeze Timer effect (both adjust time offset)]

[Art Refresh (ART-01, ART-02, ART-03)]
    └──requires──> [Auto Atlas .pac files per texture folder]
    └──modifies──> [GridRenderer: color → SpriteFrame lookup]
    └──requires──> [5 flower types × 5 states = 25 sprite assets]
    └──independent of──> [All game logic — pure rendering layer]

[SPAWN-01 (immediate spawn on game start)]
    └──modifies──> [_beginSession(): _nextSpawnMs = performance.now() not +firstInterval]
    └──requires──> [initial batch spawn count configurable per CFG-02]

[HUD-03 fix (combo display)]
    └──modifies──> [_updateHUD(): multiplier.toFixed(1) not tapCount]
    └──no dependencies on other v1.1 features]

[JuiceHelpers refactor]
    └──modifies──> [GameController: inline urgency/milestone logic → JuiceHelpers calls]
    └──no behavioral change — pure refactor]

[JUICE-01: Screen shake on wrong tap]
    └──requires──> [handleWrongTap() in GameController]
    └──modifies──> [canvas root node position tween]
    └──must stop on pause — add to _stopAllJuiceAnimations()]
```

### Dependency Notes

- **Pause and Freeze Timer both modify `sessionStartMs`:** These must use an additive offset model, not replacement. Track `_totalPausedMs` and `_totalFrozenMs` as separate accumulators. Effective elapsed = `(nowMs - sessionStartMs) - _totalPausedMs - _totalFrozenMs`.
- **SPECIAL-02/03/04 conflict:** Only one power-up effect active at a time. A single `_activePowerUp: { type, expiresAtMs } | null` field in `GameController` is sufficient. On new special flower tap, overwrite the field.
- **FlowerFSM is unchanged:** The slow growth effect (SPECIAL-04) is implemented in the caller (GameController) via adjusted timestamp injection. The FSM's pure logic and all 150 tests remain untouched.
- **Art refresh is independent:** `GridRenderer` is the only file that changes. All pure logic tier files are unaffected.
- **Config load happens in `onLoad`, before `_beginSession()`:** The config must be loaded and validated before the first game session starts. If using async `resources.load`, gate `_onStartTapped()` until config is ready (show loading indicator if needed — unlikely given JSON size).

---

## MVP Definition for v1.1

### Must Ship (v1.1 Launch)

These define the v1.1 milestone. All are in the active task list from PROJECT.md.

- [ ] **CFG-01** — Flower configs from JSON; eliminates hardcoded FlowerTypes.ts values
- [ ] **CFG-02** — Spawn params from JSON; eliminates hardcoded SpawnManager phase configs
- [ ] **SPAWN-01** — Immediate spawn on game start; removes awkward 3s dead opening
- [ ] **SPECIAL-01** — Special flower spawns with distinct visual
- [ ] **SPECIAL-02** — Score multiplier effect (x2–x5, 6s duration, replace-not-stack)
- [ ] **SPECIAL-03** — Freeze timer effect (5s, sessionStartMs offset model)
- [ ] **SPECIAL-04** — Slow growth effect (8s, adjusted timestamp to FlowerFSM)
- [ ] **PAUSE-01** — Pause/resume button (manual flag pattern; sessionStartMs offset)
- [ ] **HUD-03 fix** — Combo display shows multiplier not tapCount
- [ ] **JuiceHelpers refactor** — GameController uses JuiceHelpers exports
- [ ] **JUICE-01** — Screen shake on wrong tap
- [ ] **ART-01** — Sprite flowers replace placeholder colors
- [ ] **ART-02** — Background/board visual
- [ ] **ART-03** — UI elements (buttons, HUD, results screen)

### Add After v1.1 Validation

- [ ] Audio effects for power-up activation, freeze, multiplier expiry — requires audio system first
- [ ] Power-up screen-space particle burst on tap — invest after core loop confirmed fun with art
- [ ] Pity mechanic: guarantee 1 special flower per 30s if none has appeared — useful if playtest shows players rarely see them

### Deferred (v2+)

- [ ] Per-power-up duration configurable in JSON — low demand until balancing is a real problem
- [ ] Power-up unlock/upgrade progression — meta-progression scope, confirmed out of v1 bounds
- [ ] Multiple special flower types with different rarity tiers — adds complexity; validate with 3 effect types first

---

## Feature Prioritization Matrix (v1.1)

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| CFG-01 (flower config JSON) | MEDIUM (designer value) | LOW | P1 |
| CFG-02 (spawn params JSON) | MEDIUM (designer value) | LOW | P1 |
| SPAWN-01 (immediate spawn) | HIGH (first impression) | LOW | P1 |
| SPECIAL-01 (special spawn + visual) | HIGH | MEDIUM | P1 |
| SPECIAL-02 (score multiplier) | HIGH | MEDIUM | P1 |
| SPECIAL-03 (freeze timer) | HIGH | MEDIUM | P1 |
| SPECIAL-04 (slow growth) | MEDIUM | MEDIUM | P1 |
| PAUSE-01 (pause/resume) | HIGH | LOW | P1 |
| HUD-03 fix (combo display) | MEDIUM | LOW | P1 |
| ART-01 (flower sprites) | HIGH | MEDIUM | P1 |
| ART-02 (background/board) | MEDIUM | LOW | P2 |
| ART-03 (UI elements) | MEDIUM | LOW | P2 |
| JuiceHelpers refactor | LOW (internal) | LOW | P2 |
| JUICE-01 (screen shake) | MEDIUM | LOW | P2 |

**Priority key:**
- P1: Must have for v1.1 — defines the milestone
- P2: Should have — include if time allows; degrade gracefully if cut

---

## Sources

- Cocos Creator 3.8 official docs — Auto Atlas: https://docs.cocos.com/creator/3.8/manual/en/asset/auto-atlas.html (HIGH confidence)
- Cocos Creator 3.8 official docs — Scheduler: https://docs.cocos.com/creator/3.8/manual/en/scripting/scheduler.html (HIGH confidence)
- Cocos Creator forums — Pause pattern analysis: https://forum.cocosengine.org/t/properly-pause-the-game-in-cocos-creator/40191 (MEDIUM-HIGH confidence)
- Cocos Creator forums — Pause with UI interaction: https://forum.cocosengine.org/t/how-to-properly-pause-the-game-for-pause-menu-in-cocos-creator/41901 (MEDIUM-HIGH confidence)
- Cocos Engine GitHub issue #11144 — director.pause() side effects on UI tweens (MEDIUM confidence)
- TexturePacker + Cocos Creator workflow: https://www.codeandweb.com/texturepacker/tutorials/how-to-create-and-usesprite-sheets-with-cocoscreator (MEDIUM confidence)
- TV Tropes — Timed Power-Up patterns: https://tvtropes.org/pmwiki/pmwiki.php/Main/TimedPowerUp (LOW confidence — pattern reference only)
- Medium — Power-Ups duration design: https://medium.com/@pat.x.guillen/power-ups-f60af6cbc217 (LOW confidence — design opinion)
- Game Developer — Status Effect Stacking Algorithm: https://www.gamedeveloper.com/design/a-status-effect-stacking-algorithm (MEDIUM confidence — stacking rationale)
- Existing codebase: FlowerTypes.ts, SpawnManager.ts, FlowerFSM.ts, GameController.ts (HIGH confidence — ground truth for dependency analysis)
- PROJECT.md — v1.1 feature scope and constraints (HIGH confidence — primary source)

---

*Feature research for: Bloom Tap v1.1 — Power-ups, Config, Pause, Art Refresh*
*Researched: 2026-03-17*
