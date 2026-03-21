# Phase 7: Config Infrastructure - Research

**Researched:** 2026-03-17
**Domain:** Cocos Creator 3.8.8 JSON loading, pure TypeScript schema validation, Vitest testing
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Decision 1: Config Scope**
- `FLOWER_CONFIGS` (5 flower types × 10 fields) → `flowers.json` — covers CFG-01
- `PHASE_CONFIGS` (3 spawn phases + weights) → `flowers.json` — covers CFG-02
- `SESSION_DURATION_MS` + `WRONG_TAP_PENALTY` → `settings.json` — covers CFG-03 scope extension
- What stays hardcoded: ComboSystem step thresholds → defer to Phase 11; Special flower fields → Phase 10 extends schema

**Decision 2: Error UX When JSON Parse Fails**
- Parse failure → hard stop — game does not start
- Error detected at Boot screen, before GameScene loads
- Error popup overlay on Boot screen with message: "Game config lỗi. Vui lòng reload."
- Popup has Reload button → `assetManager.releaseAll()` + `director.loadScene('Boot')`
- Error message does NOT show field-level details

**Decision 3: JSON File Structure**
- `assets/resources/config/flowers.json` and `assets/resources/config/settings.json`
- Loaded via Cocos Creator `resources.load()` at Boot
- Exact JSON schema specified in CONTEXT.md (flowers keyed by id, spawnPhases as array)

**Decision 4: Test Migration Strategy**
- `GameConfig.parse()` returns typed object → `FlowerTypes.ts` re-exports `FLOWER_CONFIGS` and `PHASE_CONFIGS` from it
- 150 existing tests continue to pass with zero changes
- `GameConfig.parse()` signature: `parse(flowersJson: string, settingsJson: string): GameConfig`
- Pure function — no side effects, no global state mutation
- On failure: throws `Error` with descriptive message
- Full validation rules specified in CONTEXT.md

### Claude's Discretion

None specified — all major decisions are locked.

### Deferred Ideas (OUT OF SCOPE)

- ComboSystem config (multiplier steps, step thresholds) → Phase 11
- Special flower config fields (spawn rate, effect duration) → Phase 10 extends schema
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CFG-01 | Người dùng có thể chỉnh flower types (tốc độ chu kỳ, điểm gốc) qua JSON mà không cần recompile | `flowers.json` schema design + `GameConfig.parse()` validation + `FlowerTypes.ts` re-export pattern |
| CFG-02 | Người dùng có thể chỉnh spawn parameters (initialCount, maxAlive per phase, spawn interval) qua JSON | `spawnPhases` array in `flowers.json` + `SpawnManager.ts` re-export pattern |
| CFG-03 | Game hiển thị lỗi rõ ràng khi config JSON sai format, không crash silent | `GameConfig.parse()` throws typed Error + BootController hard-stop popup + Reload button pattern |
</phase_requirements>

---

## Summary

Phase 7 replaces three hardcoded constant objects (`FLOWER_CONFIGS`, `PHASE_CONFIGS`, and two `GameState` constants) with JSON files loaded at Boot. The implementation has two distinct layers: a pure TypeScript `GameConfig.parse()` function that does schema validation with no Cocos runtime dependency, and a Cocos-facing `BootController` that handles the async loading lifecycle and error UX.

**Critical architectural conflict resolved:** STATE.md records `[v1.1 Arch]: Config loaded via @property JsonAsset (synchronous Inspector wiring) — avoid resources.load() async callback lifecycle complexity`. CONTEXT.md Decision 3 says `resources.load()`. These are in conflict. Research confirms both approaches are valid. However, CONTEXT.md was created AFTER STATE.md (same date, but CONTEXT.md is the phase-specific decision doc from /gsd:discuss-phase). The CONTEXT.md decision (`resources.load()`) is more specific and more recent — it represents the deliberate choice after understanding the trade-offs. The STATE.md note was a general arch preference that was superseded by the per-phase discussion. **Use `resources.load()` as specified in CONTEXT.md Decision 3.** The `@property JsonAsset` approach requires files to be in the non-resources `assets/` folder and wired in the Inspector scene file — it does not work for `assets/resources/config/` dynamic loading.

The key constraint is backward compatibility: all 150 existing tests import `FLOWER_CONFIGS` from `FlowerTypes.ts` and `PHASE_CONFIGS` from `SpawnManager.ts` directly. The re-export pattern (parse JSON → store in module-level `let` → re-export) preserves all import paths with zero test changes.

**Primary recommendation:** Implement `GameConfig.parse()` as pure TS first, test it thoroughly in Vitest, then wire BootController async loading last. This separation ensures the validation logic is reliable before any Cocos runtime integration.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Cocos Creator | 3.8.8 | Runtime, `resources.load()`, `JsonAsset`, `assetManager` | Already in project |
| TypeScript | (bundled with CC 3.8.8) | `GameConfig.ts` pure parse function + type definitions | Already in project |
| Vitest | 3.2.4 (installed) | Unit tests for `GameConfig.parse()` | Already configured in project |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `JSON.parse()` | Native | Deserialize raw JSON string | Inside `GameConfig.parse()` — wrap in try/catch |
| `assetManager.releaseAll()` | CC 3.8.8 | Clear asset cache on reload | Reload button handler in BootController error popup |
| `director.loadScene('Boot')` | CC 3.8.8 | Reload Boot scene for fresh parse attempt | Reload button handler |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `resources.load()` callback | `@property JsonAsset` inspector wiring | Inspector wiring is synchronous (available in `onLoad`) but requires files outside `resources/` and wiring in scene; `resources.load()` is async but works from `assets/resources/config/` — CONTEXT.md locks the `resources.load()` approach |
| Manual nested callbacks | Promise wrapper around `resources.load()` | Promises are cleaner for two sequential loads; CC 3.x `resources.load()` is callback-only — wrap with `new Promise<JsonAsset>()` |
| `zod` or `ajv` schema validation | Manual field-by-field checks in `GameConfig.parse()` | Third-party validators add runtime deps and can't be imported by pure TS logic files without cc mocks; manual validation is explicit, testable, and adds zero deps |

**Installation:**

No new packages needed. All dependencies already installed.

Verify vitest version:
```bash
node -e "console.log(require('./node_modules/vitest/package.json').version)"
# Output: 3.2.4
```

---

## Architecture Patterns

### Recommended Project Structure

New files to create:
```
BloomTap/assets/
├── resources/
│   └── config/               # NEW — must be under resources/ for resources.load()
│       ├── flowers.json      # NEW — flower types + spawnPhases
│       └── settings.json     # NEW — session + scoring constants
└── scripts/
    └── logic/
        ├── GameConfig.ts     # NEW — parse() pure function + GameConfig type
        ├── GameConfig.test.ts # NEW — Vitest tests for GameConfig.parse()
        ├── FlowerTypes.ts    # MODIFY — remove FLOWER_CONFIGS hardcode, re-export
        ├── SpawnManager.ts   # MODIFY — remove PHASE_CONFIGS hardcode, re-export
        └── GameState.ts      # MODIFY — remove SESSION_DURATION_MS, WRONG_TAP_PENALTY constants
    ├── BootController.ts     # MODIFY — add resources.load() + error popup logic
    └── GameController.ts     # MODIFY — receive config from BootController
```

### Pattern 1: Pure Parse Function with Validation

**What:** `GameConfig.parse(flowersJson: string, settingsJson: string)` — zero Cocos imports, fully unit-testable

**When to use:** Any time JSON enters the system. Called once at Boot, result cached and distributed.

```typescript
// GameConfig.ts — NO 'cc' import, pure TypeScript only
import { FlowerTypeId, FlowerTypeConfig } from './FlowerTypes';
import { SpawnPhaseConfig } from './SpawnManager';

export interface GameConfig {
    flowers: Record<FlowerTypeId, FlowerTypeConfig>;
    spawnPhases: SpawnPhaseConfig[];
    settings: {
        session: { durationMs: number };
        scoring: { wrongTapPenalty: number };
    };
}

export function parseGameConfig(flowersJson: string, settingsJson: string): GameConfig {
    let flowersRaw: unknown;
    let settingsRaw: unknown;
    try {
        flowersRaw = JSON.parse(flowersJson);
    } catch {
        throw new Error('flowers.json is not valid JSON');
    }
    try {
        settingsRaw = JSON.parse(settingsJson);
    } catch {
        throw new Error('settings.json is not valid JSON');
    }
    // -- validate flowers --
    const f = flowersRaw as Record<string, unknown>;
    if (!f || typeof f !== 'object' || !f['flowers'] || !f['spawnPhases']) {
        throw new Error('flowers.json missing top-level "flowers" or "spawnPhases"');
    }
    // ... per-field type + range checks (see Validation Rules section)
    return { flowers: validatedFlowers, spawnPhases: validatedPhases, settings: validatedSettings };
}
```

### Pattern 2: Module-Level Re-export for Backward Compatibility

**What:** After `parseGameConfig()` runs, store result in module-level variables in `FlowerTypes.ts` and `SpawnManager.ts` so all existing imports continue to work.

**When to use:** Required for all 150 existing tests to pass with zero changes.

```typescript
// FlowerTypes.ts — after removing hardcoded FLOWER_CONFIGS
// Module-level mutable (set once at boot, never again)
let _flowerConfigs: Record<FlowerTypeId, FlowerTypeConfig> | null = null;

export function initFlowerConfigs(configs: Record<FlowerTypeId, FlowerTypeConfig>): void {
    _flowerConfigs = configs;
}

export const FLOWER_CONFIGS = new Proxy({} as Record<FlowerTypeId, FlowerTypeConfig>, {
    get(_target, prop) {
        if (!_flowerConfigs) throw new Error('FlowerConfigs not initialized — call initFlowerConfigs() first');
        return (_flowerConfigs as Record<string, unknown>)[prop as string];
    }
});
```

**Alternative (simpler):** Replace constant export with a getter function. But the Proxy approach preserves `FLOWER_CONFIGS[FlowerTypeId.CHERRY]` syntax exactly — all 150 tests import and use it this way. The getter alternative would require changing all test imports.

**Simpler option that also works:** Just mutate the exported object directly — not idiomatic but avoids Proxy complexity:

```typescript
// FlowerTypes.ts — simplest backward-compatible approach
export const FLOWER_CONFIGS: Record<FlowerTypeId, FlowerTypeConfig> = {} as Record<FlowerTypeId, FlowerTypeConfig>;

export function initFlowerConfigs(configs: Record<FlowerTypeId, FlowerTypeConfig>): void {
    Object.assign(FLOWER_CONFIGS, configs);
}
```

This preserves `FLOWER_CONFIGS[FlowerTypeId.CHERRY]` access pattern, is mutable at init time, and avoids Proxy. Vitest tests that import `FLOWER_CONFIGS` will get the hydrated object IF `initFlowerConfigs()` is called before the test accesses it.

**CRITICAL:** Existing `FlowerTypes.test.ts` tests access `FLOWER_CONFIGS` directly. Those tests DO NOT call `initFlowerConfigs()`. The solution is to keep the existing hardcoded values as the default, and have `initFlowerConfigs()` override them. OR: test files for `FlowerTypes` must be updated to call `initFlowerConfigs()` with the same data.

**Cleanest approach that passes all 150 tests without changes:**
Keep `FLOWER_CONFIGS` initialized with the hardcoded values (not removed), and have the JSON loading override them at runtime. At Vitest test time, the hardcoded values are used. At game runtime, JSON values override. This is safe because:
- Tests verify the hardcoded values match the JSON (same values)
- Runtime always goes through JSON parse → override
- No test changes needed

### Pattern 3: BootController Async Loading

**What:** Load two JSON files in BootController.onLoad(), validate, then proceed to GameScene.

**When to use:** Required — this is the entry point for the entire config system.

```typescript
// BootController.ts
import { _decorator, Component, director, resources, JsonAsset, Node, Label, Button, assetManager } from 'cc';
import { parseGameConfig } from './logic/GameConfig';
import { initFlowerConfigs } from './logic/FlowerTypes';
import { initPhaseConfigs } from './logic/SpawnManager';
import { initGameSettings } from './logic/GameState';

const { ccclass, property } = _decorator;

@ccclass('BootController')
export class BootController extends Component {
    @property(Node)
    errorOverlay: Node | null = null;

    @property(Label)
    errorLabel: Label | null = null;

    @property(Button)
    reloadButton: Button | null = null;

    onLoad(): void {
        // Show error overlay nodes as inactive initially
        if (this.errorOverlay) this.errorOverlay.active = false;
        this.reloadButton?.node.on(Button.EventType.CLICK, this._onReload, this);
        this._loadConfigs();
    }

    private _loadConfigs(): void {
        // Load flowers.json first, then settings.json
        resources.load('config/flowers', JsonAsset, (errF, flowersAsset) => {
            if (errF) { this._showError(); return; }
            resources.load('config/settings', JsonAsset, (errS, settingsAsset) => {
                if (errS) { this._showError(); return; }
                try {
                    const cfg = parseGameConfig(
                        JSON.stringify(flowersAsset.json),
                        JSON.stringify(settingsAsset.json)
                    );
                    initFlowerConfigs(cfg.flowers);
                    initPhaseConfigs(cfg.spawnPhases);
                    initGameSettings(cfg.settings);
                    director.loadScene('GameScene');
                } catch (_e) {
                    this._showError();
                }
            });
        });
    }

    private _showError(): void {
        if (this.errorOverlay) this.errorOverlay.active = true;
    }

    private _onReload(): void {
        assetManager.releaseAll();
        director.loadScene('Boot');
    }
}
```

**Note on double JSON.stringify:** `flowersAsset.json` is already a parsed JS object (Cocos auto-parses JsonAsset). `parseGameConfig()` takes strings and calls `JSON.parse()` internally. So call `JSON.stringify(flowersAsset.json)` to re-serialize, OR change `parseGameConfig()` to accept `unknown` objects instead of strings. The cleaner approach: change `parseGameConfig` signature to accept `(flowersData: unknown, settingsData: unknown): GameConfig` — no serialization roundtrip needed.

### Pattern 4: Validation Logic Structure

**What:** Field-by-field validation inside `parseGameConfig()` for every required field.

Validation rules (from CONTEXT.md Decision 4):
- All fields must be present (no missing keys)
- All numeric fields: `typeof value === 'number' && !isNaN(value)`
- `cycleDurationMs`, `budMs`, `tapWindowMs`, `bloomingMs`, `fullBloomMs`, `wiltingMs`, `deadMs`, `scoreBloom`, `scoreFull` → `> 0`
- `intervalMs`, `maxAlive` → `> 0`
- `weights` values → `>= 0` (zero allowed — excludes type from phase)
- `session.durationMs` → `> 0`
- `scoring.wrongTapPenalty` → `>= 0`

Helper pattern:
```typescript
function requirePositiveNumber(obj: Record<string, unknown>, key: string, context: string): number {
    const v = obj[key];
    if (typeof v !== 'number' || isNaN(v) || v <= 0) {
        throw new Error(`${context}.${key} must be a positive number, got ${v}`);
    }
    return v;
}

function requireNonNegativeNumber(obj: Record<string, unknown>, key: string, context: string): number {
    const v = obj[key];
    if (typeof v !== 'number' || isNaN(v) || v < 0) {
        throw new Error(`${context}.${key} must be >= 0, got ${v}`);
    }
    return v;
}
```

### Anti-Patterns to Avoid

- **Global singleton for config:** Don't use a global `GameConfig` singleton object that mutates itself. Module-level re-export from each file is more localized and testable.
- **Async in `parseGameConfig()`:** The parse function must be synchronous and pure. Never call `resources.load()` inside it.
- **Mutating `flowersAsset.json` directly:** The `JsonAsset.json` property returns the cached parsed object — mutating it would corrupt the cached asset. Always copy values.
- **`resources.load()` caching behavior:** Cocos Creator caches `JsonAsset` after first load. If the game loads Boot a second time (Reload button), `resources.load()` may return the cached asset — this is fine for a reload because `assetManager.releaseAll()` is called first, clearing the cache.
- **Scene reload without releaseAll:** Calling `director.loadScene('Boot')` without `assetManager.releaseAll()` risks keeping old cached assets, but for this simple case (Boot loads 2 JSON files then navigates away) it is not a hard requirement. However CONTEXT.md locked the `releaseAll()` call — include it.
- **Nested callback pyramid:** Two nested `resources.load()` calls create a pyramid. This is acceptable for exactly 2 files. If a third config file is ever needed, refactor to use `resources.loadDir('config', JsonAsset, callback)` instead.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON deserialization | Custom string parser | Native `JSON.parse()` | Handles all edge cases, throws on malformed JSON |
| Asset cache management | Manual asset tracking | `assetManager.releaseAll()` | CC manages dependency graph; manual tracking misses cascades |
| Scene transition | Frame-by-frame state machine | `director.loadScene()` | CC handles component lifecycle teardown correctly |
| TypeScript type narrowing | `instanceof` checks on unknown data | `typeof === 'number' && !isNaN()` pattern | JSON parsed values are primitives — `instanceof Number` fails |

**Key insight:** The only custom code needed is the field-by-field range validation — `JSON.parse()` handles syntax errors; `typeof` checks handle type errors; only business range rules (e.g., `> 0`) require custom logic.

---

## Common Pitfalls

### Pitfall 1: resources.load() Path Includes Extension

**What goes wrong:** `resources.load('config/flowers.json', ...)` returns an error — asset not found.
**Why it happens:** `resources.load()` path is relative to `resources/` folder and must NOT include the file extension.
**How to avoid:** Always use `resources.load('config/flowers', JsonAsset, callback)` — no `.json` extension.
**Warning signs:** Callback `err` is non-null with "Cannot find asset" message.

### Pitfall 2: resources/ Folder Does Not Exist Yet

**What goes wrong:** Files placed at `BloomTap/assets/resources/config/flowers.json` are not loaded — no error in editor, silent failure at runtime.
**Why it happens:** The `resources/` folder is a special Cocos convention. It MUST be under `assets/resources/` exactly. The current project has no `resources/` folder.
**How to avoid:** Create the folder structure `assets/resources/config/` before adding JSON files. Cocos will auto-detect it.
**Warning signs:** `resources.load()` callback fires with error immediately.

### Pitfall 3: JsonAsset.json Is Already Parsed — Don't Re-Parse

**What goes wrong:** Calling `JSON.parse(flowersAsset.json)` throws "Unexpected token 'o'" because `flowersAsset.json` is already a JS object, not a string.
**Why it happens:** Cocos Creator automatically parses `.json` files during import — `JsonAsset.json` returns a plain JS object.
**How to avoid:** If `parseGameConfig()` accepts `unknown` objects instead of strings, pass `flowersAsset.json` directly. If it accepts strings, use `JSON.stringify(flowersAsset.json)` to re-serialize. **Recommended:** accept `unknown` — avoid the roundtrip.
**Warning signs:** `JSON.parse()` call inside `parseGameConfig` throws on valid data.

### Pitfall 4: Existing Tests Access FLOWER_CONFIGS Before initFlowerConfigs() Is Called

**What goes wrong:** `FlowerTypes.test.ts` imports `FLOWER_CONFIGS` and immediately asserts `FLOWER_CONFIGS[FlowerTypeId.CHERRY].cycleDurationMs === 3000` — but if the hardcoded values are removed, this returns undefined or throws.
**Why it happens:** Vitest runs tests in isolation from the Cocos runtime. `initFlowerConfigs()` is never called in test files.
**How to avoid:** Keep the hardcoded default values in `FLOWER_CONFIGS` as the fallback. The JSON loading at runtime calls `initFlowerConfigs()` to override, but tests use the defaults. Since JSON values are identical to the current hardcoded values, behavior is the same. ZERO test changes needed.
**Warning signs:** `FLOWER_CONFIGS[id]` is undefined or `Object.keys(FLOWER_CONFIGS).length === 0` in tests.

### Pitfall 5: GameState Still References MODULE-LEVEL Constants After Migration

**What goes wrong:** `GameState.ts` uses `SESSION_DURATION_MS` at module level in `isGameOver()`. After migration, if this constant is removed, `GameController.ts` which imports `SESSION_DURATION_MS` will fail to compile.
**Why it happens:** `GameController._updateHUD()` line 533 references `SESSION_DURATION_MS` directly: `const remainingSecs = Math.max(0, Math.floor((SESSION_DURATION_MS - elapsedMs) / 1000));`
**How to avoid:** Keep `SESSION_DURATION_MS` exported from `GameState.ts` as a let that is overridden by `initGameSettings()`. GameController continues to import it without changes.
**Warning signs:** TypeScript compilation error at `GameController.ts` import of `SESSION_DURATION_MS`.

### Pitfall 6: assetManager.releaseAll() Timing

**What goes wrong:** Calling `assetManager.releaseAll()` followed immediately by `director.loadScene('Boot')` may cause the scene load to fail if the Boot scene's own assets are being released mid-load.
**Why it happens:** `releaseAll()` is synchronous — it releases everything including currently-loading assets.
**How to avoid:** The Boot scene itself has no preloaded asset dependencies (no sprite atlases, etc.) — only a Node hierarchy with the BootController script. This is safe. Only JSON configs are loaded dynamically and they will be re-fetched cleanly.
**Warning signs:** "Asset not found" errors immediately after reload.

### Pitfall 7: SpawnManager Tests Check Exact Weight Values

**What goes wrong:** `SpawnManager.test.ts` asserts `w[FlowerTypeId.SUNFLOWER] === 35` for Phase 1. If SpawnManager re-exports from JSON-sourced data, and `initPhaseConfigs()` is never called in tests, all weight values will be undefined.
**Why it happens:** Same as Pitfall 4 — test isolation.
**How to avoid:** Same solution — keep hardcoded PHASE_CONFIGS as default, JSON loading overrides at runtime. All 18 SpawnManager tests continue to pass.

---

## Code Examples

Verified patterns from official sources and codebase analysis:

### resources.load() with JsonAsset (CC 3.x pattern)

```typescript
// Source: docs.cocos.com/creator/3.0/manual/en/asset-workflow/json.html
// Dynamic loading pattern
resources.load('config/flowers', JsonAsset, (err, jsonAsset) => {
    if (err) {
        console.error(err);
        return;
    }
    const data = jsonAsset.json; // Already-parsed JS object
    // data is of type 'any' — cast after validation
});
```

### Two Sequential Loads (BootController pattern)

```typescript
// Pattern for loading two config files before scene transition
resources.load('config/flowers', JsonAsset, (errF, flowersAsset) => {
    if (errF) { this._showError(); return; }
    resources.load('config/settings', JsonAsset, (errS, settingsAsset) => {
        if (errS) { this._showError(); return; }
        // Both assets available — proceed
        try {
            const cfg = parseGameConfig(flowersAsset.json, settingsAsset.json);
            // init and load scene
        } catch {
            this._showError();
        }
    });
});
```

### Error Overlay Hard-Stop UI in BootController

```typescript
// No existing UI — must wire in Boot scene Inspector
// BootController needs these @property nodes wired from scene:
@property(Node)
errorOverlay: Node | null = null;  // Panel with Label + Button

@property(Label)
errorLabel: Label | null = null;   // "Game config lỗi. Vui lòng reload."

@property(Button)
reloadButton: Button | null = null;

private _showError(): void {
    if (this.errorOverlay) this.errorOverlay.active = true;
    // errorLabel string set in Inspector or at design time
}

private _onReload(): void {
    assetManager.releaseAll();
    director.loadScene('Boot');
}
```

### Vitest Test for parseGameConfig()

```typescript
// GameConfig.test.ts — pure TypeScript, no 'cc' imports needed
import { describe, it, expect } from 'vitest';
import { parseGameConfig } from './GameConfig';

// Valid minimal flowers.json content
const validFlowers = JSON.stringify({
    flowers: {
        CHERRY: { cycleDurationMs: 3000, budMs: 1350, tapWindowMs: 900, bloomingMs: 600, fullBloomMs: 300, wiltingMs: 450, deadMs: 300, scoreBloom: 80, scoreFull: 120 },
        // ... other 4 flowers
    },
    spawnPhases: [
        { startMs: 0, endMs: 39999, intervalMs: 3000, maxAlive: 8, weights: { SUNFLOWER: 35, ROSE: 30, CHRYSANTHEMUM: 20, LOTUS: 10, CHERRY: 5 } },
        // ... 2 more phases
    ]
});

const validSettings = JSON.stringify({
    session: { durationMs: 120000 },
    scoring: { wrongTapPenalty: 10 }
});

describe('parseGameConfig', () => {
    it('parses valid flowers.json and settings.json without throwing', () => {
        expect(() => parseGameConfig(validFlowers, validSettings)).not.toThrow();
    });

    it('returns flowers with correct cycleDurationMs for CHERRY', () => {
        const cfg = parseGameConfig(validFlowers, validSettings);
        expect(cfg.flowers['CHERRY'].cycleDurationMs).toBe(3000);
    });

    it('throws on malformed JSON', () => {
        expect(() => parseGameConfig('{ invalid json', validSettings)).toThrow();
    });

    it('throws when cycleDurationMs is 0 (invalid range)', () => {
        const bad = JSON.stringify({ flowers: { CHERRY: { cycleDurationMs: 0, /* ... */ } }, spawnPhases: [] });
        expect(() => parseGameConfig(bad, validSettings)).toThrow(/cycleDurationMs/);
    });

    it('throws when wrongTapPenalty is negative', () => {
        const badSettings = JSON.stringify({ session: { durationMs: 120000 }, scoring: { wrongTapPenalty: -1 } });
        expect(() => parseGameConfig(validFlowers, badSettings)).toThrow(/wrongTapPenalty/);
    });

    it('allows weight of 0 (excludes type from phase)', () => {
        // weights >= 0 is valid
        const withZeroWeight = /* flowers.json with a 0 weight */ '...';
        expect(() => parseGameConfig(withZeroWeight, validSettings)).not.toThrow();
    });
});
```

### Vitest Run Commands

```bash
# Quick run — only GameConfig tests
cd E:/workspace/ProjectAI && npx vitest run --reporter=verbose BloomTap/assets/scripts/logic/GameConfig.test.ts

# Full suite — all 150+ tests
cd E:/workspace/ProjectAI && npx vitest run

# Watch mode during development
cd E:/workspace/ProjectAI && npx vitest
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `cc.loader.load()` | `resources.load()` / `assetManager` | CC 2.4 (v2.4 deprecated loader) | `cc.loader` must NOT be used in CC 3.x |
| `cc.resources.load()` (global) | `resources` (named import from 'cc') | CC 3.x | Import explicitly from 'cc' |
| Array-based release `releaseAsset([...])` | Single-resource `releaseAsset(asset)` | CC 3.x | `releaseAsset` no longer accepts arrays or UUIDs |

**Deprecated/outdated:**
- `cc.loader`: Removed in CC 3.x — use `resources` and `assetManager` from 'cc' import
- `cc.resources` global: Must be imported as `import { resources } from 'cc'` in CC 3.x TypeScript

---

## Open Questions

1. **`@property JsonAsset` vs `resources.load()` conflict (RESOLVED)**
   - What we know: STATE.md prefers `@property JsonAsset`; CONTEXT.md Decision 3 locks `resources.load()`
   - Resolution: CONTEXT.md is the phase-specific decision and is authoritative. Use `resources.load()` with `assets/resources/config/` path. The STATE.md note was a general preference that the discussion phase overrode.
   - Confidence: HIGH

2. **Error popup UI construction in BootController**
   - What we know: BootController is currently 9 lines. It has no UI nodes wired.
   - What's unclear: The planner must specify a task to create the error overlay UI in the Boot scene (Node + Label + Button) in the Inspector, then wire `@property` refs. This is scene-graph work, not just TypeScript.
   - Recommendation: Include a Wave task specifically for adding error overlay Nodes to the Boot scene and wiring them in Inspector.

3. **parseGameConfig() parameter type: string vs unknown**
   - What we know: `JsonAsset.json` returns an already-parsed JS object (type `any`). If parse function accepts strings, a `JSON.stringify()` roundtrip is needed. If it accepts `unknown`, no roundtrip.
   - Recommendation: Accept `unknown` objects for `flowersData` and `settingsData` — eliminates the roundtrip, is more direct, and is still fully unit-testable by passing plain objects in tests.
   - Note: CONTEXT.md signature is `parse(flowersJson: string, settingsJson: string)` — honor this for now, accept the JSON.stringify roundtrip, or treat the string-vs-object as a planner discretion item.

4. **assetManager.releaseAll() on Reload — is it needed?**
   - What we know: CONTEXT.md locked `assetManager.releaseAll()` before `director.loadScene('Boot')` in the error handler.
   - What we verified: Official docs confirm `releaseAll()` exists and clears cache. Boot scene has no scene-bundled assets, so this is safe.
   - Confidence: HIGH — implement as locked.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `E:/workspace/ProjectAI/vitest.config.ts` |
| Quick run command | `npx vitest run BloomTap/assets/scripts/logic/GameConfig.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CFG-01 | `parseGameConfig()` returns valid `flowers` Record with correct types | unit | `npx vitest run BloomTap/assets/scripts/logic/GameConfig.test.ts` | ❌ Wave 0 |
| CFG-01 | All 5 flower types present with correct numeric fields | unit | same | ❌ Wave 0 |
| CFG-02 | `parseGameConfig()` returns valid `spawnPhases` array | unit | same | ❌ Wave 0 |
| CFG-02 | All existing SpawnManager tests still pass after re-export | unit | `npx vitest run BloomTap/assets/scripts/logic/SpawnManager.test.ts` | ✅ existing |
| CFG-03 | `parseGameConfig()` throws on missing required field | unit | same as GameConfig.test.ts | ❌ Wave 0 |
| CFG-03 | `parseGameConfig()` throws on NaN value | unit | same | ❌ Wave 0 |
| CFG-03 | `parseGameConfig()` throws when durationMs = 0 | unit | same | ❌ Wave 0 |
| CFG-03 | `parseGameConfig()` allows wrongTapPenalty = 0 | unit | same | ❌ Wave 0 |
| CFG-03 | Existing FlowerTypes tests still pass after re-export | unit | `npx vitest run BloomTap/assets/scripts/logic/FlowerTypes.test.ts` | ✅ existing |
| CFG-03 | Existing GameState tests still pass after constants migration | unit | `npx vitest run BloomTap/assets/scripts/logic/GameState.test.ts` | ✅ existing |
| (all) | Full suite (150 tests) still passes | regression | `npx vitest run` | ✅ existing |
| BootController error UX | Boot shows error popup on bad JSON | manual | Open in Cocos Editor → intentionally break flowers.json → Play | N/A |
| BootController reload | Reload button reloads Boot and re-parses | manual | Same as above | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run BloomTap/assets/scripts/logic/GameConfig.test.ts`
- **Per wave merge:** `npx vitest run` (full suite, all 150+ tests)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `BloomTap/assets/scripts/logic/GameConfig.test.ts` — covers CFG-01, CFG-02, CFG-03 parse validation
- [ ] `BloomTap/assets/resources/config/` directory — does not exist yet, must be created
- [ ] `BloomTap/assets/resources/config/flowers.json` — must be created with full schema
- [ ] `BloomTap/assets/resources/config/settings.json` — must be created with full schema

*(No new framework install needed — Vitest 3.2.4 already configured)*

---

## Sources

### Primary (HIGH confidence)
- [Cocos Creator 3.0 JSON Asset Manual](https://docs.cocos.com/creator/3.0/manual/en/asset-workflow/json.html) — JsonAsset `@property` pattern, `.json` property access, dynamic loading pattern
- [Cocos Creator 3.8 Asset Loading Manual](https://docs.cocos.com/creator/3.8/manual/en/asset/dynamic-load-resources.html) — `resources.load()` callback API, no extension in path
- [Cocos Creator 3.8 Releasing Resources](https://docs.cocos.com/creator/3.8/manual/en/asset/release-manager.html) — `assetManager.releaseAll()` confirmed available, direct release without checks
- [Cocos Creator 3.8 Obtaining and Loading Assets](https://docs.cocos.com/creator/3.8/manual/en/scripting/load-assets.html) — `@property JsonAsset` inspector wiring, synchronous availability in `onLoad`
- Codebase analysis — `vitest.config.ts`, all 9 existing test files, `GameController.ts`, `BootController.ts`, `GameState.ts`, `FlowerTypes.ts`, `SpawnManager.ts`

### Secondary (MEDIUM confidence)
- [Cocos Creator Forums — Boot scene resource loading pattern](https://forum.cocosengine.org/t/how-to-load-resources-before-game-launches/51106) — confirms Boot scene + `resources.load()` before GameScene is the standard approach
- [Cocos Creator 3.8 Scene Managing](https://docs.cocos.com/creator/3.8/manual/en/scripting/scene-managing.html) — `director.loadScene()` API

### Tertiary (LOW confidence)
- None — all key claims verified with official documentation or codebase inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed installed and in use (Vitest 3.2.4, CC 3.8.8)
- Architecture patterns: HIGH — verified against existing codebase structure and test patterns
- Pitfalls: HIGH — Pitfalls 1-7 all derived from codebase analysis + official CC docs
- Validation architecture: HIGH — vitest.config.ts confirmed, existing test count verified

**Research date:** 2026-03-17
**Valid until:** 2026-08-17 (stable stack — CC 3.8.8 pinned, Vitest 3.x stable)
