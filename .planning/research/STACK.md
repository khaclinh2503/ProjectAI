# Stack Research

**Domain:** Cocos Creator 3.8.8 casual game — v1.1 feature additions (config-driven gameplay, power-ups, pause, art refresh)
**Researched:** 2026-03-17
**Confidence:** HIGH (Cocos Creator 3.8 official docs verified via WebFetch; engine already in production use on this project)

---

## Context: What Is Already In Place (Do Not Re-Research)

The v1.0 stack is validated and in production:

| Already Shipped | Version | Notes |
|----------------|---------|-------|
| Cocos Creator | 3.8.8 | Engine — locked, do not upgrade mid-milestone |
| TypeScript strict | 5.x (CC bundled) | Pure logic tier (no cc imports) + CC renderer layer |
| Vitest | 3.2.4 | Unit tests — pure logic tier only |
| Web Mobile export | HTML5 | Target platform for v1 |

This document covers ONLY what v1.1 needs that is not already in place.

---

## New Capabilities Required for v1.1

### 1. JSON Config Loading (CFG-01, CFG-02)

**Goal:** Replace hardcoded `FLOWER_CONFIGS` in `FlowerTypes.ts` and `PHASE_CONFIGS` in `SpawnManager.ts` with data read from JSON files.

**Recommended approach: `@property(JsonAsset)` inspector wiring — HIGH confidence**

Cocos Creator imports every `.json` file in `assets/` as a `JsonAsset` automatically. The cleanest integration for a config that loads once at scene start is to expose it as an `@property` on `GameController` and wire it in the Inspector. No `resources/` directory or async loading callback required.

```typescript
import { _decorator, Component, JsonAsset } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GameController')
export class GameController extends Component {
    @property({ type: JsonAsset })
    flowerConfigAsset: JsonAsset | null = null;

    @property({ type: JsonAsset })
    spawnConfigAsset: JsonAsset | null = null;

    onLoad(): void {
        const flowerData = this.flowerConfigAsset?.json;   // plain JS object
        const spawnData  = this.spawnConfigAsset?.json;    // plain JS object
        // pass to pure-logic ConfigLoader (no cc imports)
    }
}
```

**Why `@property` over `resources.load()`:**
- `resources.load()` is async — requires callbacks or Promises, adding lifecycle complexity to `onLoad()`.
- `@property` wiring loads synchronously with the scene — data is available immediately in `onLoad()`.
- Fits the existing pattern: all CC-layer wiring (Labels, Nodes, Buttons) is already done via `@property` in `GameController`.
- The JSON file itself lives anywhere under `assets/` (e.g., `assets/configs/`) — it does not need to be in `assets/resources/`.

**Pure logic tier impact:** The actual config parsing/validation belongs in a new `ConfigLoader.ts` (no `cc` imports) — mirrors the existing `StorageService` pattern. `GameController.onLoad()` reads `jsonAsset.json`, passes the plain object to `ConfigLoader`, which returns typed config structs for `FlowerTypes` and `SpawnManager`. Tests cover `ConfigLoader` directly via Vitest.

**No new npm packages required.** `JsonAsset` is built into Cocos Creator 3.8.

---

### 2. Special Power-Up Flower System (SPECIAL-01 through SPECIAL-04)

**Goal:** A new flower variant that, when tapped, applies a timed effect (score multiplier, freeze time, slow growth).

**Recommended approach: Pure-logic `PowerUpManager.ts` with timestamp-based active effects — HIGH confidence**

This fits the existing pure-logic tier architecture. No Cocos-specific libraries needed.

**Architecture pattern:**

```typescript
// Pure logic — no cc imports
export type PowerUpType = 'SCORE_MULTIPLIER' | 'FREEZE_TIME' | 'SLOW_GROWTH';

export interface ActiveEffect {
    type: PowerUpType;
    endsAtMs: number;       // absolute timestamp from performance.now()
    magnitude: number;      // e.g. 2.0 for 2x score, 0.5 for 50% slow
}

export class PowerUpManager {
    private _effects: ActiveEffect[] = [];

    activateEffect(type: PowerUpType, durationMs: number, magnitude: number, nowMs: number): void {
        // Remove any existing effect of same type (overwrite, no stacking)
        this._effects = this._effects.filter(e => e.type !== type);
        this._effects.push({ type, endsAtMs: nowMs + durationMs, magnitude });
    }

    getActiveEffect(type: PowerUpType, nowMs: number): ActiveEffect | null {
        const e = this._effects.find(f => f.type === type && f.endsAtMs > nowMs);
        return e ?? null;
    }

    isActive(type: PowerUpType, nowMs: number): boolean {
        return this.getActiveEffect(type, nowMs) !== null;
    }
}
```

**Why timestamp-based (not duration countdown):** Consistent with existing `FlowerFSM` design — all time is absolute `performance.now()` timestamps, not decremented counters. This avoids drift when pause is introduced (see section 4 below).

**Integration points in `GameController`:**
- `SCORE_MULTIPLIER`: In `handleCorrectTap()`, multiply `rawScore` by the effect's `magnitude` before calling `gameState.applyCorrectTap()`.
- `FREEZE_TIME`: In `update()`, before checking `gameState.isGameOver(nowMs)`, if freeze is active, advance `gameState.sessionStartMs` forward by `dt` each frame — effectively stopping elapsed time. This is safer than manipulating `performance.now()`.
- `SLOW_GROWTH`: Pass a `growthMultiplier` to `FlowerFSM.getState()` — requires a minor FSM extension to accept a speed modifier. All cycle duration fields scale by the inverse of `magnitude`.

**Visual (special flower appearance):** Handled in `GridRenderer` — special cells get a distinct rendering path. No new library needed; uses existing `Graphics` component with a distinct color/pattern, or optionally a `Sprite` component with a dedicated SpriteFrame (see Art section).

**No new npm packages required.**

---

### 3. Pause / Resume System (PAUSE-01)

**Goal:** A pause button that halts game simulation while keeping the UI responsive.

**Recommended approach: Flag-based manual pause in `GameController` — HIGH confidence**

`director.pause()` and `game.pause()` are NOT recommended for this use case. Investigation findings:

| Method | What It Pauses | Input Events | Problem |
|--------|---------------|--------------|---------|
| `game.pause()` | Everything — rendering, audio, event manager, input | BLOCKED | Cannot receive resume input — confirmed broken |
| `director.pause()` | Game logic updates | Works in theory | Confirmed bug: stops UI scale transitions (issue #11144, closed April 2024 as "intentional") — pause button animation breaks |
| **Flag-based** | Only what you control explicitly | WORKS | No engine bug, no compatibility risk |

The flag-based pattern matches what the codebase already does: `_inputEnabled` in `GridRenderer` is exactly this pattern — a boolean that gates behavior without touching the event system.

**Implementation:**

```typescript
// In GameController:
private _isPaused: boolean = false;
private _pausedAtMs: number = 0;
private _totalPausedMs: number = 0;

pauseGame(): void {
    if (this._isPaused) return;
    this._isPaused = true;
    this._pausedAtMs = performance.now();
    if (this.gridRenderer) this.gridRenderer.setInputEnabled(false);
    // show pause overlay
}

resumeGame(): void {
    if (!this._isPaused) return;
    const pauseDuration = performance.now() - this._pausedAtMs;
    this._totalPausedMs += pauseDuration;
    // Shift sessionStartMs forward so elapsed time is unaffected
    this.gameState.sessionStartMs += pauseDuration;
    // Also shift any active PowerUp effect timestamps
    this._powerUpManager.shiftTimestamps(pauseDuration);
    this._isPaused = false;
    if (this.gridRenderer) this.gridRenderer.setInputEnabled(true);
    // hide pause overlay
}

update(_dt: number): void {
    if (this._phase !== SessionPhase.PLAYING) return;
    if (this._isPaused) return;   // early exit — all simulation frozen
    // ... existing update logic unchanged
}
```

**Key insight: timestamp shifting.** The game uses `performance.now()` for all timing — it cannot be paused. When resume happens, shift `gameState.sessionStartMs` forward by the pause duration. This means `elapsedMs = nowMs - sessionStartMs` remains correct without any accumulated drift. The same shift applies to `_nextSpawnMs` and all PowerUp effect `endsAtMs` values.

`gameState.sessionStartMs` is currently `private readonly` — it needs to be `public` or exposed via a method for pause to shift it. This is a minor change to `GameState.ts`.

**No new npm packages required.**

---

### 4. Art Refresh — Sprites and Textures (ART-01, ART-02, ART-03)

**Goal:** Replace `Graphics`-drawn colored rectangles with actual sprite textures for flowers, background, and UI.

#### 4a. Sprite Component (Cocos Creator built-in — HIGH confidence)

Replace the `Graphics` component on each cell node with a `Sprite` component. Assign `SpriteFrame` assets via TypeScript.

```typescript
import { Sprite, SpriteFrame } from 'cc';

// In GridRenderer._buildCellViews(), replace:
//   const g = cellNode.addComponent(Graphics);
// With:
const sprite = cellNode.addComponent(Sprite);
sprite.type = Sprite.Type.SIMPLE;
// spriteFrame assigned later per flower type/state
```

**SpriteFrame assignment (runtime):**

```typescript
// @property array wired in Inspector — one SpriteFrame per flower state per type
@property({ type: [SpriteFrame] })
cherryFrames: SpriteFrame[] = [];  // index = FlowerState enum value

// In _paintState():
const frame = this.flowerFrames[typeId][stateIndex];
sprite.spriteFrame = frame;
```

**UITransform stays:** `Sprite` and `Graphics` both require `UITransform` for touch hit-testing. The existing `UITransform` setup in `_buildCellViews()` is unchanged.

#### 4b. Texture Atlas (TexturePacker 4.x — MEDIUM confidence, tool cost applies)

For shipping, pack all flower sprites into a single atlas to reduce draw calls via batch rendering.

| Tool | Version | Format | Notes |
|------|---------|--------|-------|
| TexturePacker | 4.x (NOT 3.x or below) | Cocos2d-x `.plist` | Import `.plist` + `.png` together in CC Editor. Generates `SpriteAtlas` asset. TexturePacker 4.x+ is required — earlier versions generate incompatible format. Free version has limits; paid license ~$40. |
| Cocos Creator Auto Atlas | Built-in | CC-native | Editor: right-click folder → Create → Auto Atlas. Free, built-in, generates `AutoAtlas` asset. Less control than TexturePacker but zero cost. Recommended for v1.1. |

**Recommendation for v1.1: Use Cocos Creator's built-in Auto Atlas.** No external tool purchase, no export format risk. TexturePacker is worth evaluating for v2 when art volume increases.

**Loading from atlas (TypeScript):**

```typescript
import { SpriteAtlas } from 'cc';

resources.load('flower_atlas', SpriteAtlas, (err, atlas) => {
    const frame = atlas.getSpriteFrame('cherry_full_bloom');
    sprite.spriteFrame = frame;
});
```

Or more simply, wire `SpriteFrame[]` arrays per flower type via `@property` in the Inspector — avoids runtime loading entirely.

#### 4c. Asset Import Workflow

1. Drop PNG files into `BloomTap/assets/textures/` (create folder).
2. In CC Editor Inspector, set Type to `sprite-frame` for each PNG — CC auto-generates the `SpriteFrame` sub-asset.
3. Wire `SpriteFrame` sub-assets to `@property` fields on `GridRenderer` via drag-and-drop in Inspector.
4. For background/board: same pattern — `Sprite` component on a dedicated background node.
5. For UI elements (buttons, HUD): existing nodes already support Sprite components — add and wire.

**No new npm packages required.** All asset handling is engine-native.

---

## Recommended Stack (Additions Only)

### New Technologies / APIs

| Technology | Source | Purpose | Notes |
|------------|--------|---------|-------|
| `JsonAsset` | Cocos Creator 3.8 built-in | JSON config loading for flower types + spawn params | Wire via `@property(JsonAsset)` — synchronous, no callbacks |
| `Sprite` component | Cocos Creator 3.8 built-in | Replace `Graphics` for textured flower rendering | Cocos Creator built-in; same node as `UITransform` for touch |
| `SpriteFrame` | Cocos Creator 3.8 built-in | Individual frame reference for per-state flower art | Sub-asset auto-generated from PNG import |
| `SpriteAtlas` (optional) | Cocos Creator 3.8 built-in | Batch rendering via texture atlas | Use CC Auto Atlas (built-in); skip TexturePacker for v1.1 |

### New Pure-Logic Modules (No npm packages)

| Module | Purpose | Tier |
|--------|---------|------|
| `ConfigLoader.ts` | Parse + validate JSON config into typed `FlowerTypeConfig[]` and `SpawnPhaseConfig[]` | Pure logic (no cc imports) — testable via Vitest |
| `PowerUpManager.ts` | Track active timed effects; expose getters for score multiplier, freeze, slow-growth | Pure logic (no cc imports) — testable via Vitest |

### No New npm Packages Required

All v1.1 capabilities are built into Cocos Creator 3.8.8. The Vitest 3.2.4 setup covers pure-logic tests without change.

---

## Installation

No new packages to install. All capabilities are engine-native in Cocos Creator 3.8.8.

```bash
# Verify current Vitest version (should be 3.2.4)
cat E:/workspace/ProjectAI/package.json | grep vitest

# No npm install required for v1.1 features
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `@property(JsonAsset)` + Inspector wiring | `resources.load()` async callback | Async adds lifecycle complexity; `@property` is synchronous, matches existing wiring pattern for all other assets |
| Flag-based pause (`_isPaused` boolean + timestamp shift) | `director.pause()` | CC bug #11144: `director.pause()` breaks UI scale transitions — pause button animation would not work. Confirmed intentional by maintainers, not fixed. |
| Flag-based pause | `game.pause()` | `game.pause()` blocks the event manager — UI buttons cannot receive touch events, making resume impossible |
| Timestamp-based `PowerUpManager` (absolute `performance.now()`) | Duration-based countdown (`remainingMs` decremented in `update()`) | Duration counters accumulate drift when game is paused/resumed; timestamp-based is immune — consistent with FlowerFSM design |
| CC built-in Auto Atlas | TexturePacker 4.x | Auto Atlas is free and built-in; TexturePacker adds $40 cost and an external export step; acceptable for v2 when art volume grows |
| `Sprite` component for art | Keep `Graphics` + custom drawing | `Graphics` is appropriate for procedural shapes; `Sprite` is the correct component for texture-mapped art assets |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `director.pause()` | Confirmed CC engine bug: breaks UI scale/button animations even in 3.8; issue #11144 closed as "intentional" with no fix | Flag-based `_isPaused` with `sessionStartMs` shift |
| `game.pause()` | Blocks entire event manager including touch input — UI buttons become unresponsive, resume is impossible | Flag-based `_isPaused` |
| `resources.load()` for game config | Async callback required; loads only from `assets/resources/` folder; no advantage over `@property` for a config loaded once at scene start | `@property(JsonAsset)` wired in Inspector |
| TexturePacker 3.x or below | Generates `.plist` format incompatible with Cocos Creator 3.8 — import will fail silently or produce malformed atlas | TexturePacker 4.x (if using TexturePacker at all) or CC Auto Atlas |
| Stacking power-up effects of the same type | Leads to compounding multipliers that are hard to balance and test; unexpected with simultaneous spawns | Overwrite: activating a power-up of the same type resets its timer (no stacking within same type) |
| Adding `cc` imports to `ConfigLoader.ts` or `PowerUpManager.ts` | Breaks Vitest pure-logic test tier — `cc` module is unavailable in Node.js test environment | Keep pure logic tier cc-free; only `GameController` and `GridRenderer` import from `cc` |

---

## Stack Patterns by Scenario

**If flower sprite art is not ready at milestone start:**
- Keep `Graphics`-based rendering for development
- Implement all logic (config, power-ups, pause) first
- Swap `Graphics` for `Sprite` in a single focused ART phase
- Architecture must not assume either rendering approach — `GridRenderer._paintState()` is the single swap point

**If power-up spawn rate needs tuning without code changes:**
- Include `specialFlowerWeight` and `specialEffectDurationMs` in the spawn JSON config (CFG-02 scope)
- `PowerUpManager` reads these from config, not hardcoded constants
- Enables live tuning without recompile

**If freeze-time power-up conflicts with `FlowerFSM` timestamp math:**
- Freeze is implemented as `sessionStartMs` shift (advancing it forward each frame), NOT as modifying `FlowerFSM` timestamps
- This keeps `FlowerFSM` untouched — flowers continue aging at real-time rate during freeze (time appears stopped for the player but FSM is unaffected)
- Alternative: shift all flower `spawnedAtMs` timestamps by `dt` each frame during freeze — more accurate but touches every live flower each frame

---

## Version Compatibility

| Component | Version | Compatible With | Notes |
|-----------|---------|-----------------|-------|
| Cocos Creator | 3.8.8 | TypeScript strict | Engine locked — do not upgrade during v1.1 milestone |
| `JsonAsset` | CC 3.8 built-in | All CC 3.x versions | `.json` property returns plain JS object — no type guarantees, validate in `ConfigLoader` |
| `Sprite` + `SpriteFrame` | CC 3.8 built-in | UITransform (required on same node) | `SpriteFrame` auto-sizes `UITransform.contentSize` unless `Size Mode = Custom` — set Custom to keep fixed 68px cell size |
| `SpriteAtlas` (Auto Atlas) | CC 3.8 built-in | `SpriteFrame` sub-assets | Auto Atlas bakes at build time; development uses individual PNGs |
| TexturePacker | 4.x only | CC 3.8 `.plist` importer | 3.x format NOT supported by CC 3.8 plist importer |
| Vitest | 3.2.4 | Node.js test environment | `ConfigLoader.ts` and `PowerUpManager.ts` are pure logic — testable without changes to vitest config |

---

## Sources

- Cocos Creator 3.8 Asset Loading docs (WebFetch verified): https://docs.cocos.com/creator/3.8/manual/en/asset/dynamic-load-resources.html — HIGH confidence
- Cocos Creator 3.8 Sprite Frame docs (WebFetch verified): https://docs.cocos.com/creator/3.8/manual/en/asset/sprite-frame.html — HIGH confidence
- Cocos Creator 3.8 Atlas docs (WebFetch verified): https://docs.cocos.com/creator/3.8/manual/en/asset/atlas.html — HIGH confidence
- Cocos Creator 3.8 Sprite Component docs (WebFetch verified): https://docs.cocos.com/creator/3.8/manual/en/ui-system/components/editor/sprite.html — HIGH confidence
- Cocos Creator 3.8 Obtaining and Loading Assets (WebFetch verified): https://docs.cocos.com/creator/3.8/manual/en/scripting/load-assets.html — HIGH confidence
- CC engine issue #11144 — director.pause() breaks UI scale transitions (WebFetch verified, closed April 2024): https://github.com/cocos/cocos-engine/issues/11144 — HIGH confidence
- Community consensus on pause implementation (WebSearch + forum): flag-based manual pause is the standard workaround — MEDIUM confidence
- `game.pause()` vs `director.pause()` behavior (WebSearch, multiple corroborating sources): `game.pause()` blocks input; `director.pause()` breaks UI animations — MEDIUM confidence (no single definitive 3.8 doc page found, but consistent across sources)

---

*Stack research for: Bloom Tap v1.1 — config-driven gameplay, power-ups, pause, art refresh on Cocos Creator 3.8.8*
*Researched: 2026-03-17*
