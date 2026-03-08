# Phase 2: Save & Timing Infrastructure - Research

**Researched:** 2026-03-08
**Domain:** Cocos Creator 3.8 TypeScript — wall-clock timing system, platform-abstracted save/load (localStorage + FBInstant.player.setDataAsync), retry logic, unit testing infrastructure
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- All bloom window boundaries use wall-clock milliseconds (`Date.now()`) — never frame counts or dt accumulation (locked from project init)
- Timing system exposes an API for gameplay code to query bloom state
- Save data scope: high score, level/campaign progress, unlocked flower list, per-flower upgrade level, player settings
- Per-flower upgrade schema: `{ rose: 3, tulip: 1, ... }`
- No mid-session state saved — crash mid-level restarts from start of that level
- Data loss on app uninstall (iOS/Android) is acceptable — no cloud save for v1
- Save triggers: (1) after level end, (2) after flower upgrade or unlock
- No save on app background
- Save is non-blocking (async, does not block UI)
- FBInstant.setDataAsync fail: silent fail + 1 retry after a few seconds
- After retry still fails: log to console in dev build, silent in production
- Load fail or no data at startup: boot with default state, no error shown to user
- All SDK calls (localStorage, FBInstant) go through platform adapter class — no direct SDK import in gameplay code (locked from project init)
- One shared SaveSystem interface for both backends — swapping backend requires zero gameplay script changes

### Claude's Discretion

- Specific structure of SaveData type/interface
- Retry delay duration (a few seconds)
- Specific class and method names of SaveSystem

### Deferred Ideas (OUT OF SCOPE)

- Cloud save / cross-device sync — out of scope for v1
- Save on app background — may add later if needed
- Analytics tracking for save failures — v2
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TECH-03 | Timing logic uses wall-clock milliseconds (not frame-rate dependent) | `Date.now()` returns an integer millisecond Unix timestamp; it is the locked choice. Research clarifies its precision characteristics (typically 1 ms, may be rounded to 2 ms in Firefox) and how to expose it as a clean service class that gameplay can query. |
| TECH-05 | Save/load game state with platform abstraction (FB Instant vs localStorage) | `sys.localStorage` (Cocos Creator 3.8) wraps Web Storage on browser and SQLite on native; `FBInstant.player.setDataAsync / getDataAsync` (SDK 7.1) provides async cloud storage with 1 MB limit. Both paths are confirmed. The adapter pattern established in Phase 1 is extended to cover save operations. |
</phase_requirements>

---

## Summary

Phase 2 delivers two pure-infrastructure services: a `TimingService` that exposes wall-clock millisecond timestamps and bloom-window query helpers, and a `SaveSystem` that persists game state through either `sys.localStorage` (native) or `FBInstant.player.setDataAsync` (FB Instant). Neither service contains gameplay logic; both are consumed by phases 3–8.

The architecture extends the platform adapter pattern established in Phase 1. The save backend is a new adapter slot: `ISaveBackend` with two concrete implementations (`LocalStorageSaveBackend`, `FBInstantSaveBackend`). The `SaveSystem` owns retry logic, default-state fallback, and the serialized `SaveData` type. Gameplay code calls `SaveSystem.save()` and `SaveSystem.load()` — it never references a backend directly.

The key technical risk is the FBInstant async save path. `setDataAsync` schedules persistence but does not guarantee it has been committed when the promise resolves; `flushDataAsync` is available for immediate persistence but is documented as expensive. Research confirms the correct pattern: use `setDataAsync` with one silent retry, never block UI, never call `flushDataAsync` on every save. The 1 MB per-player storage cap is well within reach for the defined `SaveData` schema (all primitives + small maps), so data size is not a concern for v1.

Testing infrastructure is a key Phase 2 deliverable flagged in Phase 1 research. Because `TimingService` and `SaveSystem` are pure TypeScript classes with no `cc` imports, they can be tested with Jest (using `ts-jest`) without a Cocos Creator engine mock. Test files must be placed OUTSIDE the `assets/` directory to avoid Cocos Creator build errors.

**Primary recommendation:** Implement `TimingService` and `SaveSystem` as plain TypeScript classes (no `@ccclass`, no `cc` imports) so they are trivially testable with Jest and fully decoupled from the engine lifecycle. Wire them into the persistent manager node in `Boot.ts` as the sole integration point.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Cocos Creator (TypeScript) | 3.8.8 (LTS) | Engine runtime — provides `sys.localStorage` and the FBInstant global | Established in Phase 1; no change |
| `sys.localStorage` (Cocos built-in) | Built into Creator 3.8 | Cross-platform key/value store (Web Storage on browser, SQLite on native) | Official Cocos API; identical call surface on all platforms; no extra install |
| `FBInstant.player` (FB SDK 7.1) | Auto-injected by Creator's fb-instant-games build | Async cloud save for FB Instant builds | Only official save mechanism for FB Instant Games player data |
| Jest | ^29.x | Unit test runner for pure TypeScript classes | Most widely supported runner for TypeScript outside browser; works without a Cocos engine mock when cc imports are absent |
| ts-jest | ^29.x | TypeScript preprocessor for Jest | Enables `import`/`export` and TypeScript types in test files without a separate compile step |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@types/jest` | ^29.x | TypeScript types for Jest globals (describe, it, expect) | Required for TypeScript test files to compile |
| `@types/facebook-instant-games` | Latest (DefinitelyTyped) | TypeScript type declarations for `FBInstant.*` API | Used in `FBInstantSaveBackend.ts` to get type-checked calls to `FBInstant.player.setDataAsync / getDataAsync` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Date.now()` | `performance.now()` | `performance.now()` is monotonic and sub-millisecond precision; however the CONTEXT.md locks `Date.now()` as the timing source. For this use case (bloom windows of hundreds of milliseconds) 1–2 ms resolution is sufficient. Not a tradeoff to revisit. |
| `sys.localStorage` | Direct `window.localStorage` | `window.localStorage` is undefined in native builds; `sys.localStorage` is the official cross-platform wrapper and is identical on web. Always use `sys.localStorage`. |
| `setDataAsync` | `flushDataAsync` | `flushDataAsync` guarantees immediate persistence but is documented as expensive; use only for critical one-off saves (account linking, etc.). Not appropriate for routine game saves. |
| Jest + ts-jest | Vitest | Vitest integration with Cocos Creator has unresolved issues (forum-confirmed); spec files in the assets directory cause build errors. Jest with ts-jest is the established community path for pure TypeScript class testing. |

**Installation (test tooling only):**
```bash
# Run from project root (not inside assets/)
npm install --save-dev jest ts-jest @types/jest @types/facebook-instant-games
npx ts-jest config:init
```

---

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)

```
assets/
├── core/
│   └── scripts/
│       ├── adapters/              # (from Phase 1)
│       │   ├── IPlatformAdapter.ts
│       │   ├── FBInstantAdapter.ts
│       │   └── NullPlatformAdapter.ts
│       ├── save/                  # NEW in Phase 2
│       │   ├── SaveData.ts        # Type definitions only — no runtime logic
│       │   ├── ISaveBackend.ts    # Interface: save(data) / load() — two methods
│       │   ├── LocalStorageSaveBackend.ts   # Wraps sys.localStorage
│       │   ├── FBInstantSaveBackend.ts      # Wraps FBInstant.player.*
│       │   └── SaveSystem.ts      # Orchestrates backend, retry, default state
│       └── timing/               # NEW in Phase 2
│           └── TimingService.ts   # Date.now() wrapper + bloom query helpers
├── boot/
│   └── scripts/
│       └── Boot.ts               # Wires SaveSystem + TimingService into Boot lifecycle
tests/                            # NEW in Phase 2 — OUTSIDE assets/
├── jest.config.ts
├── save/
│   ├── SaveSystem.test.ts
│   └── LocalStorageSaveBackend.test.ts
└── timing/
    └── TimingService.test.ts
```

**Critical rule:** `tests/` directory lives at the project root alongside `assets/`, never inside `assets/`. Cocos Creator's build system will error on any `*.test.ts` file it encounters inside `assets/`.

### Pattern 1: SaveData Type

**What:** A plain TypeScript interface holding all persisted game state. No methods. No class instances — only JSON-serializable primitives and objects.
**When to use:** The single source of truth for what is saved. Changing this type means migrating save data.

```typescript
// Source: CONTEXT.md decisions + standard TypeScript serialization patterns
// assets/core/scripts/save/SaveData.ts

export interface FlowerUpgrades {
    [flowerId: string]: number;  // e.g. { rose: 3, tulip: 1 }
}

export interface SaveData {
    version: number;                    // schema version for future migration
    highScore: number;
    lastCompletedLevel: number;         // 0 = never completed
    unlockedFlowers: string[];          // flower IDs
    flowerUpgrades: FlowerUpgrades;
    tutorialCompleted: boolean;
    settings: {
        sfxVolume: number;              // 0.0–1.0
        bgmVolume: number;              // 0.0–1.0
    };
}

export const DEFAULT_SAVE_DATA: SaveData = {
    version: 1,
    highScore: 0,
    lastCompletedLevel: 0,
    unlockedFlowers: ['rose'],          // first flower unlocked by default
    flowerUpgrades: { rose: 1 },
    tutorialCompleted: false,
    settings: { sfxVolume: 1.0, bgmVolume: 1.0 },
};
```

### Pattern 2: ISaveBackend Interface

**What:** The two-method contract all save backends implement. Gameplay code never references this interface directly — only `SaveSystem` does.
**When to use:** Any new save backend (cloud, etc.) implements this contract and plugs in through `SaveSystem`.

```typescript
// assets/core/scripts/save/ISaveBackend.ts
import { SaveData } from './SaveData';

export interface ISaveBackend {
    /** Persist the full save data object. Non-blocking — fire and forget from caller's perspective. */
    save(data: SaveData): Promise<void>;
    /** Load save data. Returns null if no data exists or load fails. */
    load(): Promise<SaveData | null>;
}
```

### Pattern 3: LocalStorageSaveBackend

**What:** Wraps `sys.localStorage` for native builds.
**When to use:** When running on iOS, Android, or non-FB web builds.

```typescript
// Source: Cocos Creator 3.8 official docs — https://docs.cocos.com/creator/3.8/manual/en/advanced-topics/data-storage.html
// assets/core/scripts/save/LocalStorageSaveBackend.ts
import { sys } from 'cc';
import { ISaveBackend } from './ISaveBackend';
import { SaveData } from './SaveData';

const SAVE_KEY = 'bloom_harvest_save_v1';

export class LocalStorageSaveBackend implements ISaveBackend {
    async save(data: SaveData): Promise<void> {
        sys.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        // localStorage.setItem is synchronous; wrap in Promise to satisfy interface
    }

    async load(): Promise<SaveData | null> {
        const raw = sys.localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        try {
            return JSON.parse(raw) as SaveData;
        } catch {
            return null;  // corrupt data — treat as missing
        }
    }
}
```

### Pattern 4: FBInstantSaveBackend

**What:** Wraps `FBInstant.player.setDataAsync` and `getDataAsync` for FB Instant builds.
**When to use:** When running inside Facebook Instant Games environment.

```typescript
// Source: FB Instant Games SDK 7.1 docs — https://developers.facebook.com/docs/games/instant-games/sdk/fbinstant7.1/
// assets/core/scripts/save/FBInstantSaveBackend.ts
import { ISaveBackend } from './ISaveBackend';
import { SaveData } from './SaveData';

// FBInstant global is auto-injected by Cocos Creator's fb-instant-games build template.
// Declare here so TypeScript compiles; @types/facebook-instant-games provides full types.
declare const FBInstant: any;

const SAVE_KEY = 'saveData';

export class FBInstantSaveBackend implements ISaveBackend {
    async save(data: SaveData): Promise<void> {
        // setDataAsync accepts only serializable values.
        // Wrapping the full SaveData under one key keeps the structure clean
        // and makes future key additions atomic.
        await FBInstant.player.setDataAsync({ [SAVE_KEY]: data });
        // Note: promise resolving means the data is SCHEDULED, not necessarily committed.
        // flushDataAsync would force immediate commit but is documented as expensive.
        // Non-critical game saves should NOT use flushDataAsync.
    }

    async load(): Promise<SaveData | null> {
        const result = await FBInstant.player.getDataAsync([SAVE_KEY]);
        const data = result[SAVE_KEY] as SaveData | undefined;
        return data ?? null;
    }
}
```

### Pattern 5: SaveSystem — Retry + Default State Orchestration

**What:** Single entry point for all save/load operations. Handles async retry, silent failure, and default-state fallback. No `cc` imports — pure TypeScript class.
**When to use:** All gameplay code calls `SaveSystem.instance.save()` and `SaveSystem.instance.load()`. Never calls a backend directly.

```typescript
// assets/core/scripts/save/SaveSystem.ts
import { ISaveBackend } from './ISaveBackend';
import { SaveData, DEFAULT_SAVE_DATA } from './SaveData';

const RETRY_DELAY_MS = 3000;     // Claude's discretion: 3 seconds

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export class SaveSystem {
    private static _instance: SaveSystem;
    static get instance(): SaveSystem {
        if (!SaveSystem._instance) throw new Error('SaveSystem not initialized');
        return SaveSystem._instance;
    }

    private backend: ISaveBackend;
    private currentData: SaveData;
    private isDev: boolean;

    constructor(backend: ISaveBackend, isDev: boolean = false) {
        this.backend = backend;
        this.isDev = isDev;
        this.currentData = { ...DEFAULT_SAVE_DATA };
        SaveSystem._instance = this;
    }

    /** Load on startup. Always resolves — returns DEFAULT_SAVE_DATA on any failure. */
    async initialize(): Promise<void> {
        try {
            const loaded = await this.backend.load();
            if (loaded) {
                this.currentData = this.migrate(loaded);
            }
            // If null: first run — default state is already set
        } catch {
            // Load failure: silent fallback to default state (per CONTEXT.md decision)
        }
    }

    /** Non-blocking save. Caller does NOT await this. */
    save(): void {
        this.doSave();  // intentionally not awaited
    }

    private async doSave(): Promise<void> {
        try {
            await this.backend.save(this.currentData);
        } catch {
            // First attempt failed — retry once after delay (per CONTEXT.md decision)
            await sleep(RETRY_DELAY_MS);
            try {
                await this.backend.save(this.currentData);
            } catch (e) {
                // Retry also failed: log in dev, silent in production
                if (this.isDev) {
                    console.warn('[SaveSystem] Save failed after retry:', e);
                }
            }
        }
    }

    /** Read current in-memory state. Gameplay reads from here, not from storage. */
    getData(): Readonly<SaveData> {
        return this.currentData;
    }

    /** Update in-memory state and trigger a save. Call after level end or upgrade. */
    update(patch: Partial<SaveData>): void {
        this.currentData = { ...this.currentData, ...patch };
        this.save();
    }

    /** Future-proofing: handle schema version differences. Extend as versions increment. */
    private migrate(data: SaveData): SaveData {
        if (data.version === DEFAULT_SAVE_DATA.version) return data;
        // v1 → v2 migration would go here
        return { ...DEFAULT_SAVE_DATA, ...data, version: DEFAULT_SAVE_DATA.version };
    }
}
```

### Pattern 6: TimingService

**What:** Thin wrapper over `Date.now()` providing named bloom-window query helpers. No `cc` imports — pure TypeScript class. All downstream code queries this service rather than calling `Date.now()` directly.
**When to use:** Any system that must know if a specific flower is in bloom state. Phase 3 (flower lifecycle) and Phase 5 (tap detection) both consume this.

```typescript
// assets/core/scripts/timing/TimingService.ts

export interface BloomWindow {
    bloomStartMs: number;   // absolute wall-clock timestamp when bloom begins
    bloomEndMs: number;     // absolute wall-clock timestamp when bloom ends
}

export class TimingService {
    private static _instance: TimingService;
    static get instance(): TimingService {
        if (!TimingService._instance) TimingService._instance = new TimingService();
        return TimingService._instance;
    }

    /** Current wall-clock time in milliseconds. Always use this — never call Date.now() directly in gameplay code. */
    now(): number {
        return Date.now();
    }

    /** True if the current wall-clock time falls inside the bloom window (inclusive). */
    isInBloom(window: BloomWindow): boolean {
        const t = this.now();
        return t >= window.bloomStartMs && t <= window.bloomEndMs;
    }

    /** Milliseconds remaining in bloom window. Negative if window has passed. */
    msRemainingInBloom(window: BloomWindow): number {
        return window.bloomEndMs - this.now();
    }

    /** Build a bloom window starting `delayMs` from now, lasting `durationMs`. */
    createBloomWindow(delayMs: number, durationMs: number): BloomWindow {
        const now = this.now();
        return {
            bloomStartMs: now + delayMs,
            bloomEndMs: now + delayMs + durationMs,
        };
    }
}
```

### Pattern 7: Backend Selection (extending Phase 1 PlatformDetector)

**What:** Select the correct save backend at boot time using the same FBInstant detection established in Phase 1.
**When to use:** Called once during Boot initialization, after the platform adapter is created.

```typescript
// Extension of PlatformDetector.ts pattern from Phase 1
// assets/core/scripts/save/createSaveBackend.ts
import { sys } from 'cc';
import { ISaveBackend } from './ISaveBackend';
import { LocalStorageSaveBackend } from './LocalStorageSaveBackend';
import { FBInstantSaveBackend } from './FBInstantSaveBackend';

export function createSaveBackend(): ISaveBackend {
    const isFBInstant = sys.isBrowser && typeof (globalThis as any).FBInstant !== 'undefined';
    return isFBInstant ? new FBInstantSaveBackend() : new LocalStorageSaveBackend();
}
```

### Pattern 8: Boot Wiring

**What:** Initialize both services once in the persistent Boot node, before any scene loads.
**When to use:** Boot.ts `onLoad()`.

```typescript
// Boot.ts addition (extends Phase 1 Boot.ts)
import { SaveSystem } from '../core/scripts/save/SaveSystem';
import { TimingService } from '../core/scripts/timing/TimingService';
import { createSaveBackend } from '../core/scripts/save/createSaveBackend';

// Inside Boot.onLoad(), after platform adapter init:
const backend = createSaveBackend();
const isDev = !CC_RELEASE;   // CC_RELEASE is a Cocos Creator build-time constant
const saveSystem = new SaveSystem(backend, isDev);
await saveSystem.initialize();  // loads saved data or defaults; never throws
// TimingService is stateless — no initialization required; accessed via TimingService.instance
```

### Anti-Patterns to Avoid

- **Calling `sys.localStorage` directly in gameplay scripts:** Violates the adapter rule from Phase 1. All storage calls go through `SaveSystem`.
- **`await saveSystem.save()` in gameplay code:** `save()` is intentionally non-blocking. Never await it. Awaiting it would block the UI during the retry cycle (up to 6+ seconds on double-failure).
- **Calling `Date.now()` directly in gameplay scripts:** Defeats the purpose of `TimingService`. All timing queries go through `TimingService.instance.now()` or the bloom query helpers.
- **Storing non-serializable types in `SaveData`:** Functions, class instances, `Map`, `Set`, `Date` objects will silently produce `{}` or corrupt data when JSON-serialized. Use only primitives, plain objects, and arrays.
- **Placing test files in `assets/`:** Cocos Creator's build pipeline will try to compile `*.test.ts` as game scripts and fail. Tests live in `tests/` at the project root.
- **Using `flushDataAsync` on every save:** Documented as expensive. Use `setDataAsync` for all routine saves.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-platform key/value store | Custom file I/O or wrapper around `window.localStorage` | `sys.localStorage` (Cocos Creator built-in) | `sys.localStorage` is already the cross-platform wrapper; direct `window.localStorage` is undefined in native builds |
| JSON serialization | Custom binary encoder | `JSON.stringify` / `JSON.parse` | 1 MB limit is generous; JSON is human-readable for debugging; no compression needed for v1 data schema |
| Retry logic with delay | Complex state machine | Simple `async/await` + `sleep()` helper + `try/catch` | One retry with a fixed delay is sufficient per CONTEXT.md; no exponential backoff needed at this complexity level |
| FBInstant type declarations | Manual `.d.ts` file for every API | `@types/facebook-instant-games` from DefinitelyTyped | Community-maintained, covers the full SDK 7.1 surface; install in 30 seconds |
| Schema versioning / migration | Full ORM or migration framework | `version` field in `SaveData` + simple `migrate()` method | v1 schema is simple; heavy migration libraries add unnecessary complexity |

**Key insight:** Both `sys.localStorage` and `FBInstant.player.*` are officially supported APIs with well-defined contracts. The only hand-rolled code needed is the orchestration layer (`SaveSystem`) and the bloom-query convenience methods (`TimingService`).

---

## Common Pitfalls

### Pitfall 1: `setDataAsync` Schedules, Not Commits

**What goes wrong:** Code calls `await FBInstant.player.setDataAsync(data)` and assumes the data is durably persisted when the promise resolves. The player immediately closes the app. Data is lost.
**Why it happens:** The FB SDK documentation states clearly that the promise resolving means the data is "scheduled to be saved", not committed. This is not a bug — it is a performance design.
**How to avoid:** Accept this behavior for all routine saves (per CONTEXT.md: silent fail is acceptable). If a specific operation MUST be committed before the player can leave (e.g., purchase confirmation), call `flushDataAsync()` — but this is not in scope for Phase 2.
**Warning signs:** Players report losing progress after closing the app immediately after a save trigger.

### Pitfall 2: `sys.localStorage` on FB Instant Is Not Persistent

**What goes wrong:** Developer uses `sys.localStorage` in an FB Instant Games build expecting data to persist across sessions. On some FB environments, the browser storage is cleared between sessions or when the app is loaded in a fresh iframe.
**Why it happens:** FB Instant Games runs inside a sandboxed iframe. Browser localStorage may or may not persist depending on browser version and platform (mobile Messenger vs. desktop).
**How to avoid:** The `FBInstantSaveBackend` exclusively uses `FBInstant.player.setDataAsync` for persistence. The `LocalStorageSaveBackend` is used only in native builds. The backend selection in `createSaveBackend()` must check `typeof FBInstant !== 'undefined'` before deciding which backend to use.
**Warning signs:** FB builds appear to save/load correctly in local testing but lose data in the production Facebook environment.

### Pitfall 3: `Date.now()` Precision Reduced in Firefox

**What goes wrong:** Bloom windows behave inconsistently on Firefox when `privacy.resistFingerprinting` is enabled. `Date.now()` is rounded to 2 ms intervals by default and to 100 ms when fingerprinting protection is active.
**Why it happens:** MDN documentation explicitly documents this rounding behavior as a security measure.
**How to avoid:** Bloom windows are measured in hundreds of milliseconds (CORE-04: "not too short"). A 2 ms rounding error is imperceptible in a casual game. The 100 ms case (fingerprinting protection) is an edge case affecting a small fraction of players. Acceptable for v1. The `TimingService` wrapper makes it easy to switch to `performance.now()` in a later patch if precision becomes a problem.
**Warning signs:** QA on Firefox with privacy hardening reports bloom windows feeling shorter than on Chrome.

### Pitfall 4: Save Fires Before FBInstant Is Initialized

**What goes wrong:** `SaveSystem.save()` is called before `FBInstant.initializeAsync()` completes. `FBInstant.player.setDataAsync()` throws because the player context is not yet available.
**Why it happens:** If a save trigger fires early in the boot sequence (e.g., a manager auto-saves on creation), it may race with FB initialization.
**How to avoid:** `SaveSystem.initialize()` is called in `Boot.onLoad()` AFTER `platformAdapter.initialize()` (which wraps `FBInstant.initializeAsync()`). The only save triggers in gameplay are post-level-end and post-upgrade — both occur long after boot completes.
**Warning signs:** FB build crashes on startup with `FBInstant.player.setDataAsync called before initializeAsync`.

### Pitfall 5: Test Files Inside the `assets/` Directory

**What goes wrong:** Developer creates `assets/core/scripts/save/SaveSystem.test.ts`. Cocos Creator's build pipeline attempts to compile it as a game script. Build fails with a module resolution error (`Cannot find module 'jest'`).
**Why it happens:** Cocos Creator scans the entire `assets/` tree for TypeScript files to compile. Jest and `@types/jest` globals are not part of the engine module system.
**How to avoid:** All test files go in `tests/` at the project root. `jest.config.ts` points Jest's `roots` to `tests/`. `tsconfig.json` for tests is separate from the main project `tsconfig.json`.
**Warning signs:** Build errors mentioning `describe`, `it`, or `expect` as undefined.

### Pitfall 6: Awaiting `SaveSystem.save()` Blocks UI

**What goes wrong:** Gameplay code writes `await saveSystem.save()` after a level ends. On a poor connection, FBInstant's first save attempt times out (several seconds), then the retry fires (after 3 seconds delay), then fails. Player sees a frozen screen for 6+ seconds.
**Why it happens:** Awaiting a non-blocking operation that was designed to be fire-and-forget.
**How to avoid:** `SaveSystem.save()` returns `void` (not `Promise<void>`). Callers cannot `await` it. The internal `doSave()` method is the async implementation. This is enforced by the type signature.

---

## Code Examples

### Jest Test Setup for Pure TypeScript Services

```typescript
// tests/jest.config.ts
// Source: ts-jest official docs — https://kulshekhar.github.io/ts-jest/docs/getting-started/installation
import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    // Exclude anything inside assets/ (Cocos Creator manages those)
    testPathIgnorePatterns: ['/node_modules/', '/assets/'],
    moduleNameMapper: {
        // If SaveSystem ever imports 'cc', mock it here
        '^cc$': '<rootDir>/tests/__mocks__/cc.ts',
    },
};

export default config;
```

```typescript
// tests/__mocks__/cc.ts
// Minimal mock of cc module — only needed if any tested class imports from 'cc'
// Phase 2 classes (SaveSystem, TimingService, LocalStorageSaveBackend) should NOT
// import from 'cc' — if they do, that is a design error to fix first.
export const sys = {
    localStorage: {
        setItem: jest.fn(),
        getItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
    },
    isBrowser: false,
};
```

```typescript
// tests/save/SaveSystem.test.ts
import { SaveSystem } from '../../assets/core/scripts/save/SaveSystem';
import { ISaveBackend } from '../../assets/core/scripts/save/ISaveBackend';
import { SaveData, DEFAULT_SAVE_DATA } from '../../assets/core/scripts/save/SaveData';

// Mock backend for testing
function makeMockBackend(loadResult: SaveData | null = null, saveShouldFail = false): ISaveBackend {
    return {
        save: jest.fn().mockImplementation(async () => {
            if (saveShouldFail) throw new Error('Save failed');
        }),
        load: jest.fn().mockResolvedValue(loadResult),
    };
}

describe('SaveSystem', () => {
    beforeEach(() => {
        // Reset singleton between tests
        (SaveSystem as any)._instance = undefined;
    });

    it('loads default state when backend returns null', async () => {
        const backend = makeMockBackend(null);
        const sys = new SaveSystem(backend, false);
        await sys.initialize();
        expect(sys.getData().highScore).toBe(0);
        expect(sys.getData().version).toBe(DEFAULT_SAVE_DATA.version);
    });

    it('loads persisted state when backend returns data', async () => {
        const saved: SaveData = { ...DEFAULT_SAVE_DATA, highScore: 9999 };
        const backend = makeMockBackend(saved);
        const sys = new SaveSystem(backend, false);
        await sys.initialize();
        expect(sys.getData().highScore).toBe(9999);
    });

    it('update() merges patch and triggers save', async () => {
        const backend = makeMockBackend(null);
        const sys = new SaveSystem(backend, false);
        await sys.initialize();
        sys.update({ highScore: 500 });
        expect(sys.getData().highScore).toBe(500);
        // Wait a tick for async save to fire
        await Promise.resolve();
        expect(backend.save).toHaveBeenCalled();
    });
});
```

```typescript
// tests/timing/TimingService.test.ts
import { TimingService } from '../../assets/core/scripts/timing/TimingService';

describe('TimingService', () => {
    let service: TimingService;

    beforeEach(() => {
        // Reset singleton
        (TimingService as any)._instance = undefined;
        service = TimingService.instance;
    });

    it('now() returns a number close to Date.now()', () => {
        const before = Date.now();
        const t = service.now();
        const after = Date.now();
        expect(t).toBeGreaterThanOrEqual(before);
        expect(t).toBeLessThanOrEqual(after);
    });

    it('isInBloom returns true when current time is inside window', () => {
        const now = Date.now();
        const window = { bloomStartMs: now - 100, bloomEndMs: now + 100 };
        expect(service.isInBloom(window)).toBe(true);
    });

    it('isInBloom returns false when window has passed', () => {
        const now = Date.now();
        const window = { bloomStartMs: now - 500, bloomEndMs: now - 100 };
        expect(service.isInBloom(window)).toBe(false);
    });

    it('createBloomWindow produces a window in the future', () => {
        const window = service.createBloomWindow(100, 400);
        const now = Date.now();
        expect(window.bloomStartMs).toBeGreaterThan(now - 10);
        expect(window.bloomEndMs - window.bloomStartMs).toBe(400);
    });
});
```

### FBInstant Type Declaration File (if @types/facebook-instant-games is not used)

```typescript
// assets/fbinstant.d.ts — already created in Phase 1 (extend if needed)
// This is the minimal extension for save operations:
declare namespace FBInstant {
    namespace player {
        function setDataAsync(data: Record<string, unknown>): Promise<void>;
        function getDataAsync(keys: string[]): Promise<Record<string, unknown>>;
        function flushDataAsync(): Promise<void>;
    }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cocos Creator 2.x `cc.sys.localStorage` (with `cc.` prefix) | Cocos Creator 3.x `sys.localStorage` (module import: `import { sys } from 'cc'`) | Creator 3.0 | Global `cc` namespace removed; must import `sys` as a named export |
| FBInstant SDK 6.x (`player.setDataAsync`) | FBInstant SDK 7.1 (same API surface, added `flushDataAsync`) | SDK 7.0 | `flushDataAsync` is available but should not be used for routine saves |
| Manual `declare const FBInstant: any` | `@types/facebook-instant-games` (DefinitelyTyped) | 2019–present, actively maintained | Full type safety for FBInstant calls; install via npm |

**Deprecated/outdated:**
- `cc.sys.localStorage` (with `cc.` prefix): Removed in Creator 3.x. Use `import { sys } from 'cc'; sys.localStorage`.
- FBInstant SDK versions below 6.1: Deprecated by Facebook. Creator auto-injects 7.x.

---

## Open Questions

1. **`Date.now()` precision on low-end Android devices with clock skew**
   - What we know: `Date.now()` can go backward if the system clock is adjusted (NTP sync, user manually sets time). This could cause a negative `msRemainingInBloom` value even while in a bloom window.
   - What's unclear: Whether this is a real risk on mobile devices during a typical game session.
   - Recommendation: Add a guard in `isInBloom()` that clamps to `>= 0`. Bloom windows are hundreds of ms; a few ms of clock skew during an active session is unlikely to cause player-visible problems. If it becomes an issue, switch `TimingService.now()` to `performance.now()` — the TimingService wrapper makes this a one-line change.

2. **`SaveData` version migration strategy when schema changes in Phase 3+**
   - What we know: `SaveData.version` is included. The `migrate()` stub exists.
   - What's unclear: Exactly how many fields will change in later phases (e.g., Phase 4 adds 4 more flower species, which means adding entries to `unlockedFlowers` defaults).
   - Recommendation: Keep `migrate()` trivial in Phase 2 (version 1 only). Document that any Phase that adds a SaveData field must increment `version` and add a migration case.

3. **FBInstant SDK version injected by Cocos Creator 3.8.8**
   - What we know: Phase 1 research confirmed SDK 7.1 is auto-injected. The SDK surface for `player.setDataAsync / getDataAsync` is stable.
   - What's unclear: Whether Cocos Creator 3.8.8 injects 7.1 specifically or a newer patch version.
   - Recommendation: No action needed — the save API surface has not changed between SDK 6.x and 7.x. This is LOW risk.

---

## Validation Architecture

`nyquist_validation` is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 29.x with ts-jest |
| Config file | `tests/jest.config.ts` (created in Wave 0) |
| Quick run command | `npx jest --testPathPattern="tests/"` |
| Full suite command | `npx jest --coverage` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TECH-03 | `TimingService.now()` returns wall-clock ms; `isInBloom()` returns correct boolean; `createBloomWindow()` produces correct timestamps | unit | `npx jest tests/timing/TimingService.test.ts` | ❌ Wave 0 |
| TECH-03 | Bloom window boundaries are never based on frame counts or dt — verified by code review + static grep | static analysis | `grep -r "dt\b\|deltaTime\|frame" assets/core/scripts/timing/ --include="*.ts"` must return 0 matches | ❌ Wave 0 (add to validate.sh) |
| TECH-05 | `SaveSystem.initialize()` returns default state when backend returns null | unit | `npx jest tests/save/SaveSystem.test.ts` | ❌ Wave 0 |
| TECH-05 | `SaveSystem.initialize()` returns persisted state when backend returns data | unit | `npx jest tests/save/SaveSystem.test.ts` | ❌ Wave 0 |
| TECH-05 | `SaveSystem.update()` merges patch and calls `backend.save()` | unit | `npx jest tests/save/SaveSystem.test.ts` | ❌ Wave 0 |
| TECH-05 | `LocalStorageSaveBackend.save()` calls `sys.localStorage.setItem` | unit | `npx jest tests/save/LocalStorageSaveBackend.test.ts` | ❌ Wave 0 |
| TECH-05 | `LocalStorageSaveBackend.load()` returns null on missing key | unit | `npx jest tests/save/LocalStorageSaveBackend.test.ts` | ❌ Wave 0 |
| TECH-05 | Native build persists across restarts | smoke (manual) | Build native, kill app, reopen, verify high score persists | Manual — device required |
| TECH-05 | FB Instant build persists across sessions | smoke (manual) | Upload to FB sandbox, play, close, reopen, verify state | Manual — FB environment required |
| TECH-05 | Swapping backend requires zero gameplay script changes | structural | Code review: `grep -r "localStorage\|FBInstant" assets/ --include="*.ts" | grep -v "adapters/\|save/"` must return 0 matches | ❌ Wave 0 (add to validate.sh) |

### Sampling Rate

- **Per task commit:** `npx jest tests/`
- **Per wave merge:** `npx jest --coverage` + manual smoke test on native or FB simulator
- **Phase gate:** All unit tests green + both manual smoke tests verified before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/jest.config.ts` — Jest configuration file
- [ ] `tests/__mocks__/cc.ts` — Minimal mock of `cc` module (guards against accidental cc imports in tested classes)
- [ ] `tests/timing/TimingService.test.ts` — covers TECH-03
- [ ] `tests/save/SaveSystem.test.ts` — covers TECH-05 (load default, load persisted, update + save trigger)
- [ ] `tests/save/LocalStorageSaveBackend.test.ts` — covers TECH-05 (localStorage interactions)
- [ ] `package.json` at project root — add `"test": "jest"` script and devDependencies for `jest`, `ts-jest`, `@types/jest`
- [ ] `tests/tsconfig.json` — separate TypeScript config for test files (does not extend Cocos Creator's restricted tsconfig)
- [ ] Extend `.planning/phases/01-project-foundation/validate.sh` with Phase 2 static analysis checks OR create `validate.sh` in this phase directory

---

## Sources

### Primary (HIGH confidence)

- [Cocos Creator 3.8 User Data Storage](https://docs.cocos.com/creator/3.8/manual/en/advanced-topics/data-storage.html) — `sys.localStorage` API, exact method signatures, platform behavior (Web Storage on browser, SQLite on native)
- [Facebook Instant Games SDK 7.1 Reference](https://developers.facebook.com/docs/games/instant-games/sdk/fbinstant7.1/) — `setDataAsync`, `getDataAsync`, `flushDataAsync` signatures, 1 MB storage limit, promise resolution semantics
- [Cocos Creator 3.8 Publish to Facebook Instant Games](https://docs.cocos.com/creator/3.8/manual/en/editor/publish/publish-fb-instant-games.html) — SDK auto-injection, `FBInstant` global availability, `sys.isBrowser` detection pattern
- [MDN: Date.now()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now) — precision characteristics (1 ms typical; 2 ms Firefox; 100 ms with `resistFingerprinting`)
- Phase 1 RESEARCH.md (this project) — established patterns for platform detection, adapter architecture, Boot wiring

### Secondary (MEDIUM confidence)

- [Cocos Creator Forum: Jest unit tests with Creator 3.8](https://forum.cocosengine.org/t/how-to-run-jest-unit-tests-with-cocos-creator-version-3-8/59632) — confirms `Cannot find module 'cc'` problem when test files import cc; solution is to avoid cc imports in tested classes
- [Cocos Creator Forum: Vitest with Creator](https://forum.cocosengine.org/t/unit-tests-vitest/61990) — confirms spec files in assets/ directory cause build errors; tests must be outside assets/
- [DefinitelyTyped: @types/facebook-instant-games](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/facebook-instant-games/index.d.ts) — community-maintained TypeScript types for FBInstant SDK

### Tertiary (LOW confidence — flag for validation)

- WebSearch results on async retry patterns — the retry pattern used (`try/catch` + `sleep` + second `try/catch`) is standard; no Cocos-specific source needed
- `performance.now()` precision characteristics — not directly relevant (locked to `Date.now()`), but documented as context for the timing precision open question

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `sys.localStorage` and `FBInstant.player.*` are official, documented, stable APIs; versions confirmed
- Architecture (SaveSystem/TimingService design): HIGH — pure TypeScript class pattern, no engine-specific dependencies, directly testable
- FBInstant async save semantics: HIGH — explicitly documented in SDK 7.1 reference (promise resolves = scheduled, not committed)
- Test infrastructure: MEDIUM — Jest + ts-jest for pure TypeScript classes is established; Cocos Creator specific test tooling has known friction (cc module mocking) but Phase 2 classes deliberately avoid cc imports, sidestepping the problem
- Pitfalls: HIGH for FBInstant semantics and test file placement; MEDIUM for Date.now() precision edge cases

**Research date:** 2026-03-08
**Valid until:** 2026-09-08 (6 months — FB Instant SDK and Cocos Creator 3.8 LTS are stable; Jest/ts-jest APIs are stable)
