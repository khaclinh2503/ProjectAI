# Project Research Summary

**Project:** Bloom Tap v1.1
**Domain:** Cocos Creator 3.8.8 casual tap game — config-driven gameplay, power-up flowers, pause system, sprite art refresh
**Researched:** 2026-03-17
**Confidence:** HIGH

## Executive Summary

Bloom Tap v1.1 adds four categories of work to an already-shipped v1.0 core: config-driven parameters (CFG-01, CFG-02), a special power-up flower system (SPECIAL-01 through SPECIAL-04), a pause/resume system (PAUSE-01), and a sprite art refresh (ART-01 through ART-03). The codebase uses a strict two-tier architecture — a pure logic tier (no `cc` imports, Vitest-testable) sitting below a Cocos renderer tier. Every v1.1 feature fits cleanly within this existing pattern. No new npm packages or engine upgrades are required; all capabilities are built into Cocos Creator 3.8.8.

The single highest-risk area across all four feature categories is timestamp management. `FlowerFSM`, `GameState`, and the spawn scheduler all use absolute `performance.now()` timestamps as anchors. Pause, freeze-time power-up, and slow-growth power-up must all participate in a unified timestamp-offset strategy or they will corrupt each other. The solution is a centralized `_applyPauseOffset(ms)` method in `GameController` that shifts every time-anchored value (session clock, spawn scheduler, live flower FSMs, power-up expiry) in a single pass. This is not optional — implementing any one of these features without the others in mind will require a partial rewrite later.

The recommended build order is: config infrastructure first (pure tier, zero risk, unlocks balance tuning), then immediate spawn fix (low risk), then pause system (establishes the offset pattern that everything else depends on), then power-up system (consumes the pause offset pattern), then bug fixes and refactors, then art refresh last (renderer-only, no logic impact). This ordering respects the dependency graph and ensures each phase builds on verified foundations.

---

## Key Findings

### Recommended Stack

The v1.0 stack (Cocos Creator 3.8.8, TypeScript strict, Vitest 3.2.4, Web Mobile export) is locked and needs no changes. V1.1 adds only engine-native capabilities: `JsonAsset` for config loading via synchronous `@property` Inspector wiring (no async callbacks required), `Sprite` + `SpriteFrame` components to replace `Graphics`-drawn placeholder colors, and Cocos Creator's built-in Auto Atlas for sprite atlasing (zero cost, no external tools). Two new pure-logic modules are required: `ConfigLoader.ts` / `GameConfig.ts` (JSON parse + validation) and `PowerUpManager.ts` / `PowerUpState.ts` (timestamp-based active effects tracking). Both are Vitest-testable without any Cocos dependency.

**Core technologies (additions only — v1.0 stack unchanged):**
- `JsonAsset` (`@property` wired, CC built-in): Config loading — synchronous, matches existing Inspector wiring pattern for all other assets; avoids async callback lifecycle complexity
- `Sprite` + `SpriteFrame` (CC built-in): Sprite rendering — replaces `Graphics` color-coded cells; `UITransform` stays unchanged on the same node
- CC Auto Atlas (CC built-in): Texture atlasing — packs 25+ flower frames at build time; avoids 25 separate GPU texture uploads on mobile WebGL
- `GameConfig.ts` (new pure module): JSON parse + schema validation — pure tier, Vitest-testable, no cc imports; mirrors existing `StorageService` pattern
- `PowerUpState.ts` (new pure module): Active effect tracking — timestamp-based (not duration countdown), immune to pause drift

**What NOT to use:**
- `director.pause()`: Confirmed CC engine bug #11144 — breaks UI scale/tween animations; closed as intentional with no fix
- `game.pause()`: Blocks entire event manager including touch input; Resume button becomes non-functional
- `resources.load()` for game config: Async callback adds lifecycle complexity; `@property` JsonAsset is synchronous and simpler for a once-at-startup load
- TexturePacker 3.x: Generates `.plist` format incompatible with CC 3.8 importer; use 4.x if ever adopting TexturePacker

### Expected Features

**Must have (P1 — define the v1.1 milestone):**
- CFG-01 + CFG-02: Flower and spawn configs from JSON — designer can tune balance without code changes
- SPAWN-01: Immediate flower spawn at game start — 3-second dead opening feels broken to players
- SPECIAL-01 through SPECIAL-04: Special power-up flower with all three effect types (score multiplier, freeze timer, slow growth)
- PAUSE-01: Pause button + clean resume — any mobile game without pause is unshippable
- HUD-03 fix: Combo label shows `multiplier.toFixed(1)` from session start, not raw `tapCount`
- ART-01: Sprite flowers replace placeholder colored rectangles

**Should have (P2 — include if time allows):**
- ART-02 + ART-03: Background/board visual and UI element sprites
- JuiceHelpers refactor: GameController calls JuiceHelpers exports instead of duplicating logic inline
- JUICE-01: Screen shake on wrong tap

**Defer to post-v1.1 validation:**
- Audio effects for power-up activation (requires audio system first)
- Pity mechanic: guarantee 1 special flower per 30s if none has appeared (validate first whether players actually notice)

**Defer to v2+:**
- Meta-progression, power-up upgrades, power-up inventory/choice — confirmed out of v1 scope
- Multiple special flower types with different rarity tiers
- Hot-reload JSON config (requires file watcher or WebSocket, unavailable in HTML5 export runtime)

**Anti-features (explicitly excluded):**
- Multiple simultaneous power-up effects stacking: Exponential score explosion breaks leaderboard; replacement semantics only (one active effect at a time, new tap replaces old)
- Sprite animation frames per flower cell: 64 simultaneously animated cells spikes render cost on mobile; static sprite-per-state (swap on state change) is the correct approach

### Architecture Approach

The existing two-tier architecture requires only additive changes. All new pure-logic modules (`GameConfig.ts`, `SpecialFlowerDef.ts`, `PowerUpState.ts`, `PauseState.ts`) stay below the cc-import boundary and are fully Vitest-testable. The renderer tier changes are confined to `GameController.ts` (pause/resume handlers, power-up routing, config injection) and `GridRenderer.ts` (sprite render path alongside existing Graphics fallback, `_useSprites` toggle flag). `FlowerFSM.ts` receives one additive field (`_pauseOffset: number = 0`) and one additive method (`addPauseOffset(ms)`); all 150 existing tests continue to pass because offset defaults to 0.

**Major components and their v1.1 roles:**
1. `GameConfig.ts` (NEW, pure): JSON parse + validation; outputs typed `FlowerTypeConfig[]` and `SpawnPhaseConfig[]`; Vitest-testable; no cc imports
2. `PowerUpState.ts` (NEW, pure): Active effect data record with `isActive(nowMs)` and `applyOffset(ms)`; session-scoped, separate from FlowerFSM
3. `PauseState.ts` (NEW, pure): Data record only — `isPaused`, `pauseStartMs`, `totalPausedMs`; no methods needed
4. `FlowerFSM.ts` (MODIFIED, pure): Add `_pauseOffset` + `addPauseOffset(ms)`; elapsed becomes `(nowMs - spawnTimestamp) - pauseOffset`
5. `Grid.ts` (MODIFIED, pure): Add `_specialTypes: Map<number, SpecialFlowerType>` + three new methods; fully additive, no existing test impact
6. `SpawnManager.ts` (MODIFIED, pure): Constructor injection for phases array; add `pickSpecialSpawn()` and `specialSpawnChance` config field
7. `GameController.ts` (MODIFIED, renderer): Pause/resume handlers, power-up activation routing, config injection, initial burst spawn, HUD-03 fix, JuiceHelpers wiring
8. `GridRenderer.ts` (MODIFIED, renderer): Sprite render path with `_useSprites` flag; Graphics fallback preserved; `playScreenShake()` added; `setCellTypeId()` gains optional `specialType` param

**Key architectural constraints that must not be violated:**
- `GameConfig.parse()` is pure and synchronous; Cocos asset loading lives in `GameController.onLoad()` (renderer tier) only — never add cc imports to the parse function
- SLOW_GROWTH is applied via spawn-time config copy (newly spawned flowers get modified `cycleDurationMs`), NOT by mutating live FlowerFSM timestamps
- Power-up state lives in `GameController._powerUpState`, NOT inside `FlowerFSM` — session-scoped effects do not belong in a flower-scoped FSM

### Critical Pitfalls

1. **Timestamp pause offset not applied to ALL anchors** — A boolean `_isPaused` flag alone causes all live flowers to skip forward in their lifecycle the moment the game resumes (e.g., a 2-second pause causes flowers 800ms into a 900ms BUD phase to die instantly). Must apply `pauseDurationMs` to `gameState.sessionStartMs`, all live `FlowerFSM` instances via `addPauseOffset()`, `_nextSpawnMs`, and all power-up `expiresAtMs` in a single centralized `_applyPauseOffset()` call. Never scatter these adjustments across call sites.

2. **Config JSON async load race condition** — `resources.load()` is async. Reading config values on the line immediately after the call returns `undefined` because the callback has not fired yet. Works on localhost (fast disk), fails silently on physical device (network latency). Must gate all game startup — including enabling the Start button — on the config load callback completing.

3. **Config schema validation absent** — TypeScript interfaces are compile-time only; `JSON.parse()` performs no type checking. A `"budMs": "string"` value propagates NaN into FlowerFSM score math, producing "Infinity" in the score label and corrupting localStorage. Validator must run at load time with descriptive errors, not silently at runtime.

4. **Sprite + Graphics on same node render conflict** — Adding a `Sprite` component alongside an existing `Graphics` component on the same cell node produces undefined draw order; one silently overdraw the other. Must choose either replace strategy (remove Graphics, add Sprite on same node) or layer strategy (keep Graphics on parent, add child node with Sprite) before starting ART-01.

5. **Power-up expiry drains during pause** — If power-up `expiresAtMs` is not included in `_applyPauseOffset()`, the effect timer continues counting down during pause. Players who pause immediately after tapping a rare power-up return to find it already expired. Power-up expiry must be part of the same offset adjustment pass as session clock and flower FSMs.

6. **TIME_FREEZE must freeze the session clock, not just stop spawns** — A naive implementation stops the spawn scheduler but leaves `gameState.sessionStartMs` advancing normally. The countdown visibly continues during "freeze" — the player paid for a power-up that does not freeze the game timer. The correct mechanism advances `sessionStartMs` by `dt` each frame during the freeze effect — a continuous rolling offset identical to pause offset but applied incrementally per frame.

---

## Implications for Roadmap

Based on the dependency graph in FEATURES.md and the build order confirmed in ARCHITECTURE.md, the following 6-phase structure is recommended.

### Phase 1: Config Infrastructure
**Rationale:** Config is the foundation for all balance tuning and is a prerequisite for power-up spawn chance to be configurable. It is pure-tier work with zero risk to existing gameplay behavior — the game runs identically to v1.0 after this phase because hardcoded constants are replaced with JSON-loaded equivalents. Establishing `GameConfig.parse()` and schema validation here before any feature code touches config prevents the async race condition and silent NaN corruption pitfalls from ever appearing in subsequent phases.
**Delivers:** JSON-driven flower types and spawn phases; schema validation at load time with descriptive errors; Vitest test coverage for `GameConfig.parse()`; `SpawnManager` constructor injection; `FlowerTypes.ts` constant removed
**Addresses:** CFG-01, CFG-02 (P1)
**Avoids:** Pitfall 5 (async load race), Pitfall 6 (schema validation missing) — both solved here before any downstream consumer exists

### Phase 2: Spawn Fix
**Rationale:** Trivially low risk, high first-impression impact. The 3-second dead opening at game start is fixed by setting `_nextSpawnMs = performance.now()` and running an initial burst in `_beginSession()`. Done immediately after config is in place so `initialCount` is read from JSON rather than hardcoded.
**Delivers:** Flowers spawn immediately at game start; initial burst count configurable in spawn config JSON
**Addresses:** SPAWN-01 (P1)
**Avoids:** No pitfalls — pure additive change to session startup path; zero regression risk

### Phase 3: Pause System
**Rationale:** Pause establishes the `_applyPauseOffset()` pattern that power-up expiry (SPECIAL-03 freeze timer, all SPECIAL effects) must reuse. Implementing pause after power-ups would require retrofitting the offset mechanism across already-written feature code. Pause first means the pattern is tested and proven in isolation before power-ups add complexity. Also unblocks Cocos `schedule()`/`unschedule()` behavior verification for urgency blink — a MEDIUM-confidence gap that must be resolved before power-up implementation.
**Delivers:** Pause button, dim overlay (Resume + Restart buttons), timestamp offset propagated to all live FSMs and session clock on resume, urgency blink explicitly unscheduled on pause, `PAUSED` added to `SessionPhase` enum
**Addresses:** PAUSE-01 (P1)
**Avoids:** Pitfall 1 (timestamp offset missing — establishes the centralized offset API), Pitfall 2 (Cocos schedule continues during pause — `unschedule()` verified here), Pitfall 3 (power-up expiry drains during pause — `_applyPauseOffset()` designed to accept new anchors when power-ups are added)

### Phase 4: Power-Up Flower System
**Rationale:** Depends on Phase 1 (spawn chance in config) and Phase 3 (pause offset API already in place and tested). All four SPECIAL tasks are grouped because SPECIAL-01 (spawn + visual) is a hard prerequisite for SPECIAL-02/03/04 (effects), and all three effect types share the same `PowerUpState` infrastructure and HUD countdown indicator — building them together avoids duplicate HUD work and ensures the one-active-effect-at-a-time replacement policy is designed from the start, not bolted on after two conflicting effects are already implemented.
**Delivers:** Special flower spawn with distinct visual (gold/glow overlay); all three effect types (score multiplier x2–x5 / 6s, freeze timer / 5s, slow growth / 8s); power-up HUD indicator with countdown bar; replacement-not-stacking semantics; TIME_FREEZE per-frame rolling offset mechanism
**Addresses:** SPECIAL-01 through SPECIAL-04 (all P1)
**Avoids:** Pitfall 3 (power-up expiry offset — slots into `_applyPauseOffset()` from Phase 3), Pitfall 4 (stacking edge cases — Map-based model designed from the start, not single-variable), Pitfall 10 (freeze must freeze session clock — per-frame rolling offset implemented here)

### Phase 5: Bug Fixes and Refactors
**Rationale:** HUD-03 fix (combo label) is placed before art refresh because the combo label display area is also where power-up score multiplier feedback is visible. Confirming the label is correct before adding visual noise from the art refresh makes debugging easier. JuiceHelpers refactor and screen shake are low-risk cleanup with no feature dependencies.
**Delivers:** Combo label shows `multiplier.toFixed(1)` from session start (not blank for first 9 taps); JuiceHelpers decoupled from GameController inline duplicates; screen shake on wrong tap via `GridRenderer.playScreenShake()`
**Addresses:** HUD-03 fix (P1), JuiceHelpers refactor (P2), JUICE-01 screen shake (P2)
**Avoids:** Pitfall 9 (combo label display policy must be defined before writing the fix — define "show x1.0 from session start, never hide" and update tests first)

### Phase 6: Art Refresh
**Rationale:** Renderer-only work with zero impact on pure logic tier. Placed last because all game logic has been verified against the Graphics color fallback. If sprite assets are not ready at milestone start, the fallback continues working and this phase can be deferred without blocking any other work. The layer-vs-replace architectural decision (Pitfall 7) must be made at the start of this phase before any sprites are assigned.
**Delivers:** Sprite textures for 5 flower types x 5 states (25 sprites); special flower visual variant; background/board texture; UI element sprites; CC Auto Atlas configured per texture folder
**Addresses:** ART-01 (P1), ART-02, ART-03 (P2)
**Avoids:** Pitfall 7 (Graphics + Sprite conflict — layer vs replace decision made before first sprite assigned), Pitfall 8 (25 separate GPU textures — Auto Atlas configured before any SpriteFrames are wired to cell nodes)

### Phase Ordering Rationale

- **Config before everything:** `SpawnManager` constructor injection and `FlowerTypes.ts` constant removal affect every subsequent phase that touches spawning or flower config; doing this first means no other phase needs to clean up hardcoded constants
- **Pause before power-ups:** `_applyPauseOffset()` is shared infrastructure; power-up `expiresAtMs` must participate in it from day one — implementing power-ups first would require adding the API later and auditing all existing offset call sites
- **Power-ups before art:** Logic correctness is easier to verify with Graphics fallback active; sprite-level debugging adds noise to effect timing verification
- **Art last:** No logic dependencies whatsoever; Graphics fallback is safe; deferring art until logic is verified is the lowest-risk ordering

### Research Flags

Phases that may benefit from targeted research or proof-of-concept during planning:

- **Phase 3 (Pause):** Exact behavior of Cocos `schedule()`/`unschedule()` when `_isPaused` flag is set vs. node deactivation has MEDIUM confidence. Verify during Phase 3 planning that `this.unschedule(blinkCallback)` is sufficient to stop the urgency blink without deactivating the entire game node.
- **Phase 4 (Power-ups, SPECIAL-03):** TIME_FREEZE per-frame rolling offset (advancing `sessionStartMs` by `dt` each frame) is the hardest implementation in v1.1. Recommend a quick proof-of-concept — advance `sessionStartMs` in a test scene and verify `GameState.isGameOver()` reads correctly — before writing the full freeze implementation.

Phases with well-documented patterns (skip `/gsd:research-phase`):

- **Phase 1 (Config):** `JsonAsset` + `@property` pattern fully documented in CC 3.8 official docs (WebFetch verified); `GameConfig.parse()` is pure TypeScript with no unknowns
- **Phase 2 (Spawn Fix):** One-line change to `_beginSession()`; no new patterns
- **Phase 5 (Bug Fixes):** All three tasks are in-codebase refactors with defined correct behavior
- **Phase 6 (Art Refresh):** CC Sprite/SpriteFrame/Auto Atlas are well-documented; Pitfall 7 (layer vs replace decision) is the only decision point before executing

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | CC 3.8 official docs verified via WebFetch for all new APIs (JsonAsset, Sprite, SpriteFrame, SpriteAtlas, Auto Atlas); engine already in production on this project; CC bug #11144 confirmed |
| Features | HIGH | Feature list derives directly from PROJECT.md (ground truth); power-up design rationale sourced from game design community; priority order well-reasoned |
| Architecture | HIGH | Based on full source read of all existing files; all v1.1 changes derived from actual code structure; integration points are direct API calls, not speculation |
| Pitfalls | HIGH | 6 of 10 pitfalls sourced from direct code inspection of live source files; timestamp offset strategy is a well-established game dev pattern; sprite/Graphics conflict is empirically documented |

**Overall confidence: HIGH**

### Gaps to Address

- **`schedule()`/`unschedule()` behavior during pause:** MEDIUM confidence on whether `this.unschedule(blinkCallback)` alone is sufficient or whether node deactivation is required. Verify empirically during Phase 3 — the urgency blink is the specific risk point.
- **TIME_FREEZE per-frame rolling offset validation:** The mechanism is architecturally sound but novel in this codebase. Validate that advancing `sessionStartMs += dt` each frame during freeze produces correct `isGameOver()` and HUD timer behavior before implementing the full SPECIAL-03 feature.
- **Auto Atlas frame naming convention:** Research recommends `getSpriteFrame('cherry_bud')` filename-based lookup. Confirm that CC Auto Atlas preserves the original PNG filename (without path or extension) as the frame name before wiring all 25 SpriteFrame assignments.
- **`GameState.sessionStartMs` access modifier:** Currently `private readonly`. Pause requires it to be mutable. Decide whether to make it `public`, expose a `shiftSessionStart(ms)` method, or change `readonly` to `private` — this affects FlowerFSM pause offset design in Phase 3.

---

## Sources

### Primary (HIGH confidence)
- Cocos Creator 3.8 Asset Loading docs (WebFetch verified): https://docs.cocos.com/creator/3.8/manual/en/asset/dynamic-load-resources.html
- Cocos Creator 3.8 Sprite Frame docs (WebFetch verified): https://docs.cocos.com/creator/3.8/manual/en/asset/sprite-frame.html
- Cocos Creator 3.8 Atlas docs (WebFetch verified): https://docs.cocos.com/creator/3.8/manual/en/asset/atlas.html
- Cocos Creator 3.8 Sprite Component docs (WebFetch verified): https://docs.cocos.com/creator/3.8/manual/en/ui-system/components/editor/sprite.html
- Cocos Creator 3.8 Obtaining and Loading Assets (WebFetch verified): https://docs.cocos.com/creator/3.8/manual/en/scripting/load-assets.html
- CC engine issue #11144 — `director.pause()` breaks UI scale transitions (WebFetch verified, closed April 2024): https://github.com/cocos/cocos-engine/issues/11144
- Existing codebase source read: `FlowerFSM.ts`, `GameController.ts`, `GridRenderer.ts`, `GameState.ts`, `SpawnManager.ts`, `ComboSystem.ts`, `Grid.ts`, `JuiceHelpers.ts`, `FlowerTypes.ts`, `StorageService.ts` — ground truth for all architecture and pitfall findings
- `.planning/PROJECT.md` — v1.1 feature scope and constraints (primary source)

### Secondary (MEDIUM confidence)
- Cocos Creator forums — pause pattern analysis: https://forum.cocosengine.org/t/properly-pause-the-game-in-cocos-creator/40191
- Cocos Creator forums — pause with UI interaction: https://forum.cocosengine.org/t/how-to-properly-pause-the-game-for-pause-menu-in-cocos-creator/41901
- Game Developer — status effect stacking algorithm: https://www.gamedeveloper.com/design/a-status-effect-stacking-algorithm
- `game.pause()` vs `director.pause()` behavior: multiple corroborating community sources; consistent finding that `game.pause()` blocks input

### Tertiary (LOW confidence — design reference only)
- Medium — power-up duration design: https://medium.com/@pat.x.guillen/power-ups-f60af6cbc217 — design opinion; used only for duration range recommendations (5–10s)
- TV Tropes — timed power-up patterns: https://tvtropes.org/pmwiki/pmwiki.php/Main/TimedPowerUp — pattern reference only

---
*Research completed: 2026-03-17*
*Ready for roadmap: yes*
