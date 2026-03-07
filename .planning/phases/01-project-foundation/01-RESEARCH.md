# Phase 1: Project Foundation - Research

**Researched:** 2026-03-07
**Domain:** Cocos Creator 3.8.x cross-platform project scaffolding, Asset Bundle architecture, platform adapter pattern
**Confidence:** MEDIUM-HIGH

---

## Summary

Phase 1 establishes every structural decision that the remaining seven phases depend on. The core challenge is not complexity — it is discipline: every anti-pattern that is allowed in Phase 1 (direct SDK imports, loose PNGs, frame-count-based timing stubs, missing bundle architecture) compounds exponentially as content is added in later phases. Retrofitting any of these after art production begins is a multi-day rewrite.

Cocos Creator 3.8.8 is the current LTS stable release (December 2025). There is no 3.9.x yet — 3.8.x is explicitly the long-term stable branch. This resolves the STATE.md blocker: use 3.8.x with confidence. The FB Instant Games build target is a first-class Cocos Creator 3.8 feature with an integrated SDK injection pipeline. The Asset Bundle system is mature and the primary tool for controlling the initial payload budget.

The 5 MB initial payload target is a performance target (Facebook's guideline: "aim for ~1 MB initial download, sessions abandon beyond 5 seconds load time"), not a hard API-enforced byte cutoff. The total bundle cap is 200 MB. This means the budget must be enforced by discipline and measurement, not by a CI gate that trips on a platform error. The Phase 1 plan must include a manual payload size measurement step and a documented method to repeat it on every build.

**Primary recommendation:** Scaffold the project with the Asset Bundle folder hierarchy in place before writing any scripts. The bundle topology (main/core, game-assets, audio) is harder to restructure after scenes reference assets. Create null-implementation platform adapters on Day 1 so all subsequent development can proceed without live SDKs.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TECH-01 | Run on Mobile (iOS + Android) via Cocos Creator build | Native build pipeline via Xcode + Android Studio; NDK r21-r23; Cocos Creator 3.8 produces APK/AAB and IPA from the same TypeScript codebase |
| TECH-02 | Run on Facebook Instant Games (HTML5/WebGL) | Cocos Creator 3.8 has first-class `fb-instant-games` build target; SDK auto-injected; produces uploadable .zip; init sequence is `initializeAsync → setLoadingProgress → startGameAsync` |
| TECH-04 | Asset Bundle architecture ensures FB Instant initial payload < 5 MB | Cocos Creator Asset Bundle system splits assets into separately loadable packages; `main` bundle contains only first scene + boot scripts; game-assets bundle lazy-loaded post-boot |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Cocos Creator | 3.8.8 (LTS) | Engine, editor, cross-platform build pipeline | Only engine with first-class iOS + Android + FB Instant in one TypeScript codebase. 3.8.x is the confirmed LTS branch as of Dec 2025; no 3.9 yet. |
| TypeScript | 5.x (bundled with Creator) | Game logic language | Cocos Creator 3.x deprecated JavaScript; TypeScript is the only supported scripting language. Bundled — do not install separately. |
| Cocos Dashboard | Latest | Engine version management, project creation | Required tool to install and manage Creator versions. |

### Build Environment

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| Android Studio | Latest stable (4.1+) | Android APK/AAB compilation | Required for all Android native builds |
| NDK | r21–r23 (r24 for Apple Silicon) | Native code compilation | Set in Cocos Creator Preferences > External SDKs |
| Xcode | Latest stable (11.5+ minimum) | iOS IPA compilation | Required for all iOS native builds |
| Chrome DevTools | Bundled with Chrome | HTML5/FB Instant debugging | Use with `http-server --ssl` for local FB Instant testing |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| FB Instant Games SDK | 7.1 (auto-injected by Creator) | Platform API surface | Available as `FBInstant` global in FB build only; declare via `.d.ts` file |
| VS Code + Cocos Creator extension | Latest | TypeScript editing with Cocos API autocomplete | Primary IDE |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Cocos Creator 3.8.x | Unity | Unity WebGL output is 10–30 MB minimum — fails the FB Instant initial load budget |
| Cocos Creator 3.8.x | Phaser 3 / PixiJS | Cannot produce native iOS/Android binaries without a Capacitor wrapper |
| Null-impl platform adapters | Live SDKs in Phase 1 | Live SDKs require app registrations, certificates, and test devices; null adapters let all other development proceed immediately |

**Installation:**
```bash
# Install Cocos Creator via Cocos Dashboard
# https://www.cocos.com/en/creator-download
# In Dashboard: install Creator 3.8.8 (LTS), create new TypeScript project

# No npm installs needed for Phase 1.
# Firebase, AdMob — deferred to later phases.
# FB SDK is auto-injected by the fb-instant-games build target.
```

---

## Architecture Patterns

### Recommended Project Structure

```
assets/
├── boot/                    # Boot scene + all persistent manager scripts
│   ├── Boot.scene
│   └── scripts/
│       ├── Boot.ts          # Orchestrates platform init + manager creation
│       ├── GameManager.ts   # Root persistent node, round state machine
│       └── EventBus.ts      # Global typed pub/sub (no external deps)
├── core/                    # Shared infrastructure (marked as Asset Bundle: "core")
│   └── scripts/
│       ├── adapters/
│       │   ├── IPlatformAdapter.ts       # Interface — the contract
│       │   ├── FBInstantAdapter.ts       # Wraps FBInstant.* calls
│       │   └── NullPlatformAdapter.ts    # No-ops; used for native + dev
│       ├── FlowerDatabase.ts             # Reads flower JSON config
│       └── PlatformDetector.ts          # Selects adapter at runtime
├── game-assets/             # Marked as Asset Bundle: "game-assets" (lazy-loaded)
│   ├── scenes/
│   │   └── Gameplay.scene
│   ├── sprites/             # Texture atlases go here (NOT in main bundle)
│   └── audio/              # SFX/BGM files
├── resources/               # Dynamic load via cc.resources (avoid for Phase 1)
└── scenes/
    └── MainMenu.scene       # Included in main bundle via Build panel
```

**Key discipline:** Keep the `main` bundle to Boot + MainMenu scene + core/scripts only. All art, audio, and gameplay scenes go into `game-assets` bundle loaded after `startGameAsync()`.

### Pattern 1: Persistent Manager Node

**What:** All Manager classes are `Component`s attached to a root node that survives scene transitions.
**When to use:** Any system that must persist across scene loads (GameManager, EventBus, FlowerDatabase).
**Example:**
```typescript
// Source: Cocos Creator 3.8 official docs — scene management
// Boot.ts
import { _decorator, Component, director, game } from 'cc';
const { ccclass } = _decorator;

@ccclass('Boot')
export class Boot extends Component {
    onLoad() {
        // Make this node persist across all scene transitions
        game.addPersistRootNode(this.node);
        // Initialize managers here before transitioning
    }
}
```

### Pattern 2: Platform Adapter (Null Object Pattern)

**What:** All external SDK calls go through an interface. Game logic never imports platform SDKs directly.
**When to use:** Every call to FBInstant, AdMob, Firebase. No exceptions.
**Example:**
```typescript
// IPlatformAdapter.ts — the contract
export interface IPlatformAdapter {
    initialize(): Promise<void>;
    getPlayerID(): string | null;
    setLoadingProgress(percent: number): void;
    startGame(): Promise<void>;
}

// NullPlatformAdapter.ts — safe no-op for native builds and dev
export class NullPlatformAdapter implements IPlatformAdapter {
    async initialize(): Promise<void> { /* no-op */ }
    getPlayerID(): string | null { return 'dev-player'; }
    setLoadingProgress(_percent: number): void { /* no-op */ }
    async startGame(): Promise<void> { /* no-op */ }
}

// FBInstantAdapter.ts — wraps the real SDK
declare const FBInstant: any;
export class FBInstantAdapter implements IPlatformAdapter {
    async initialize(): Promise<void> {
        await FBInstant.initializeAsync();
    }
    getPlayerID(): string | null {
        return FBInstant.player.getID();
    }
    setLoadingProgress(percent: number): void {
        FBInstant.setLoadingProgress(percent);
    }
    async startGame(): Promise<void> {
        await FBInstant.startGameAsync();
    }
}

// PlatformDetector.ts — selects adapter at runtime, called once in Boot
import { sys } from 'cc';
export function createPlatformAdapter(): IPlatformAdapter {
    const isFBInstant = sys.isBrowser && typeof (globalThis as any).FBInstant !== 'undefined';
    return isFBInstant ? new FBInstantAdapter() : new NullPlatformAdapter();
}
```

### Pattern 3: Asset Bundle Loading Sequence

**What:** Boot loads the `core` bundle synchronously, then after `startGameAsync()`, loads `game-assets` on demand.
**When to use:** Every non-boot asset load.
**Example:**
```typescript
// Source: Cocos Creator 3.8 Asset Bundle docs
import { assetManager, director } from 'cc';

async function bootSequence(): Promise<void> {
    // 1. Platform adapter init (FBInstant.initializeAsync or no-op)
    await platformAdapter.initialize();
    platformAdapter.setLoadingProgress(10);

    // 2. Load the core bundle (already embedded in main payload)
    // No explicit load needed if core scripts are in main bundle.
    // Only explicitly load bundles that are remote/separate.

    // 3. Signal FB that loading is done
    platformAdapter.setLoadingProgress(100);
    await platformAdapter.startGame();

    // 4. Now lazy-load heavy assets
    assetManager.loadBundle('game-assets', (err, bundle) => {
        if (err) { console.error(err); return; }
        director.loadScene('MainMenu');
    });
}
```

### Pattern 4: Asset Bundle Configuration

**What:** Marking folders as bundles via the Cocos Creator Assets panel.
**When to use:** When configuring the project — this is an editor operation, not a code operation.

Steps:
1. Select the `game-assets/` folder in the Assets panel.
2. In the Inspector, check "Is Bundle".
3. Set Bundle Name: `game-assets`.
4. Set Compression Type: `Merge Depend` (default — merges JSON dependencies).
5. Leave "Is Remote Bundle" unchecked for Phase 1 (all assets ship in the zip).
6. Click "Apply".

Built-in bundles created automatically: `main` (scenes from Build panel), `resources`, `internal`. You do NOT mark these manually.

### Pattern 5: FB Instant Games Build + Local Testing

**What:** Build the FB Instant Games target and test locally with HTTPS before uploading.
**When to use:** Verifying SC-2 (runs as FB Instant Games bundle).

Steps:
1. Menu > Project > Build. Platform: "Facebook Instant Game".
2. Build produces `build/fb-instant-games/fb-instant-games.zip`.
3. Measure zip size immediately: `ls -lh build/fb-instant-games/fb-instant-games.zip`.
4. For local HTTPS testing: `npx http-server build/fb-instant-games -S -C cert.pem -K key.pem -p 8443`.
5. Upload zip to Facebook App Dashboard > Instant Games > Web Hosting > Upload Version.

**SDK auto-injection:** Creator's FB build template automatically injects the FB Instant Games SDK script tag into `index.html`. You do NOT manually add the SDK. You CAN customize the injected SDK version by creating `build-templates/fb-instant-games/index.html` in your project root.

### Anti-Patterns to Avoid

- **Direct SDK import in gameplay scripts:** Any `.ts` file outside `adapters/` that contains `FBInstant.`, `firebase.`, or `admob.` is a violation. All SDK calls must be behind the adapter interface.
- **Art assets in the main bundle:** Placing sprites, audio, or scene-specific assets in `boot/` or at the assets root causes them to be included in the main bundle, bloating the initial payload.
- **Nesting Asset Bundle folders:** Do not create a bundle inside another bundle folder. Cocos Creator does not support nested bundles — all bundles must be siblings.
- **Physics engine enabled:** Do not enable Box2D or Bullet in Project Settings. Bloom Harvest has no physics simulation use case; the engine adds bundle size and init overhead.
- **`resources/` for gameplay assets:** The `resources/` folder is always included in the main bundle. Never put flower sprites or audio there.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-scene state | Custom scene param passing | Persistent root node (`game.addPersistRootNode`) | Cocos Creator's built-in mechanism; survives all scene transitions |
| Asset lazy-loading | Custom XHR/fetch loader | `assetManager.loadBundle()` | Handles caching, dependencies, decompression, and error recovery |
| FB SDK initialization | Manual script tag injection | Creator's `fb-instant-games` build template | Template handles SDK injection, loading progress hook, and `index.js` initialization |
| TypeScript compilation | Custom webpack/tsc pipeline | Creator's built-in compiler | Creator's compiler is configured for its module system; bypassing it causes runtime module errors |
| Screen adaptation | Manual canvas resize | Creator's `Design Resolution` + Widget component + `Fit Height` mode | Handles every device size and safe area correctly |

**Key insight:** Cocos Creator 3.8 has a mature built-in solution for every infrastructure concern in Phase 1. The work is configuration and wiring, not custom engineering.

---

## Common Pitfalls

### Pitfall 1: Main Bundle Payload Creep

**What goes wrong:** Sprites, audio, or scene assets get referenced from the Boot or MainMenu scene, causing them to be bundled into the main payload. The zip grows past the 5 MB target before the first art pass.
**Why it happens:** Cocos Creator's build system follows all asset references from included scenes. If a scene references a sprite directly, that sprite enters the main bundle even if you intended to lazy-load it.
**How to avoid:** The Boot and MainMenu scenes reference ONLY script components and UI nodes with no sprite frames assigned in the editor. All art assets are loaded programmatically via `assetManager.loadBundle('game-assets', ...)` after boot. Measure zip size after every build in Phase 1 before any art exists — establish a baseline.
**Warning signs:** Build zip exceeds 2 MB before any art assets are added.

### Pitfall 2: SDK Import in Gameplay Scripts

**What goes wrong:** A developer writes `const id = FBInstant.player.getID()` directly in `FlowerLifecycle.ts`. The native build fails to compile (FBInstant is undefined). The FB build works, but the code is now untestable without a live FB context.
**Why it happens:** It's the path of least resistance. The global `FBInstant` appears to work during FB testing.
**How to avoid:** Enforce the adapter pattern from the first commit. `FBInstantAdapter.ts` is the ONLY file in the project that references `FBInstant`. A grep for `FBInstant` outside the adapters folder is a failing check.
**Warning signs:** `FBInstant` appears in any file outside `assets/core/scripts/adapters/`.

### Pitfall 3: Nested Asset Bundles

**What goes wrong:** Developer marks `game-assets/sprites/` as a bundle, then marks `game-assets/` as a bundle. Cocos Creator silently ignores or mis-builds nested bundles — assets may not load at runtime.
**Why it happens:** It seems intuitive to organize by sub-bundle.
**How to avoid:** All bundle-marked folders are siblings in the `assets/` tree, not children of each other.

### Pitfall 4: Wrong FB Init Sequence Order

**What goes wrong:** Calling `startGameAsync()` before the loading assets are ready, or calling any FB API before `initializeAsync()` completes. FB Instant Games will throw or silently fail.
**Why it happens:** Async/await errors are easy to get wrong.
**How to avoid:** The sequence is strictly: `initializeAsync()` → (load assets) → `setLoadingProgress(100)` → `startGameAsync()`. No FB API call may precede `initializeAsync()`. Use `async/await` with `try/catch`, not callbacks.
**Warning signs:** FB build hangs on the Facebook loading screen indefinitely.

### Pitfall 5: Missing `game.addPersistRootNode` Before Scene Load

**What goes wrong:** Managers are created in Boot, but the Boot scene node is destroyed when `director.loadScene('MainMenu')` runs, taking all manager instances with it.
**Why it happens:** Scene loads destroy all non-persistent nodes by default.
**How to avoid:** Call `game.addPersistRootNode(this.node)` in the `onLoad()` of EVERY manager node before any scene transition is triggered. This must happen before the first `director.loadScene()` call.

### Pitfall 6: TypeScript Module Configuration Mismatch

**What goes wrong:** Developer modifies `compilerOptions.module` in `tsconfig.json` to `commonjs`, enabling `require()` in the IDE. At runtime, Creator's module loader fails because it expects ES modules.
**Why it happens:** Cocos Creator's `tsconfig.json` extends `tmp/tsconfig.cocos.json`. The base config sets `module: es2015`. Overriding it causes a runtime vs. compile-time mismatch.
**How to avoid:** Never override `compilerOptions.target` or `compilerOptions.module` in the project `tsconfig.json`. Only add options that do not conflict with the inherited base (e.g., `noImplicitAny`, `strictNullChecks`).

---

## Code Examples

Verified patterns from Cocos Creator 3.8 official documentation:

### EventBus (No External Dependency)

```typescript
// Source: Standard TypeScript pattern, no Cocos API required
// assets/boot/scripts/EventBus.ts
type Handler<T = any> = (data: T) => void;

export class EventBus {
    private static handlers: Map<string, Handler[]> = new Map();

    static on<T>(event: string, handler: Handler<T>): void {
        if (!this.handlers.has(event)) this.handlers.set(event, []);
        this.handlers.get(event)!.push(handler as Handler);
    }

    static off<T>(event: string, handler: Handler<T>): void {
        const list = this.handlers.get(event);
        if (list) {
            const idx = list.indexOf(handler as Handler);
            if (idx >= 0) list.splice(idx, 1);
        }
    }

    static emit<T>(event: string, data?: T): void {
        const list = this.handlers.get(event);
        if (list) list.forEach(h => h(data));
    }
}

// Usage — emitter does NOT need to know who listens
EventBus.emit('flower:wilted', { flowerID: 'rose-01' });
// Usage — listener does NOT need to know who emits
EventBus.on('flower:wilted', ({ flowerID }) => { /* ... */ });
```

### FlowerDatabase Stub (JSON config pattern)

```typescript
// Source: Cocos Creator 3.8 asset loading docs
// assets/core/scripts/FlowerDatabase.ts
import { JsonAsset, assetManager } from 'cc';

export interface FlowerConfig {
    id: string;
    displayName: string;
    baseBloomDurationMs: number;   // wall-clock ms, never frame counts
    bloomWindowFractionOfDuration: number;  // 0.0–1.0
    basePoints: number;
    animationKey: string;
    atlasKey: string;
}

export class FlowerDatabase {
    private static configs: Map<string, FlowerConfig> = new Map();

    static async load(): Promise<void> {
        return new Promise((resolve, reject) => {
            assetManager.loadBundle('core', (err, bundle) => {
                if (err) { reject(err); return; }
                bundle.load('data/flowers', JsonAsset, (err, asset) => {
                    if (err) { reject(err); return; }
                    const data = asset.json as FlowerConfig[];
                    data.forEach(cfg => FlowerDatabase.configs.set(cfg.id, cfg));
                    resolve();
                });
            });
        });
    }

    static get(id: string): FlowerConfig {
        const cfg = FlowerDatabase.configs.get(id);
        if (!cfg) throw new Error(`Unknown flower ID: ${id}`);
        return cfg;
    }
}
```

### Measuring Initial Payload (Build Verification)

```bash
# After every FB Instant Games build, run:
# On Windows (Git Bash or PowerShell):
ls -lh build/fb-instant-games/fb-instant-games.zip
# Or with exact byte count:
du -b build/fb-instant-games/ --max-depth=1

# Target: zip file < 5 MB
# If over budget, identify which assets grew the bundle:
# Unzip to a temp folder and sort by size:
mkdir /tmp/fb-bundle && cd /tmp/fb-bundle && unzip ~/project/build/fb-instant-games/fb-instant-games.zip
find . -type f | xargs ls -s | sort -n | tail -20
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cocos Creator 2.x (JavaScript) | Cocos Creator 3.8.x (TypeScript, dual-kernel) | Creator 3.0 (2021), LTS in 3.8 | TypeScript is now the only supported language; all new projects use 3.x |
| `cc.loader` (deprecated) | `assetManager.loadBundle()` | Creator 3.0 | Old loading API removed; all asset loading goes through `assetManager` |
| `cc.game.addPersistRootNode` | `game.addPersistRootNode` (module import style) | Creator 3.x | Namespace changed; import `game` from `'cc'`, not `cc.game` |
| Subpackages (Creator 2.x) | Asset Bundles (Creator 3.x) | Creator 3.0 | More powerful; supports remote bundles, priority, compression |
| `sys.localStorage` namespace | `sys.localStorage` (same, but import `sys` from `'cc'`) | Creator 3.x | Module import style required in TypeScript |

**Deprecated/outdated:**
- `cc.loader`: Removed. Use `assetManager`.
- JavaScript scripting: Deprecated in Creator 3.x. TypeScript only.
- Cocos Creator 2.x project structure: `.fire` scene files replaced by `.scene` (YAML-based).

---

## Open Questions

1. **Exact NDK version for the dev machine**
   - What we know: r21–r23 is recommended; r24 for Apple Silicon Macs.
   - What's unclear: Which specific NDK is installed on the team's build machine.
   - Recommendation: Document the exact NDK path in `CLAUDE.md` or project README after initial setup. Store the path in Creator Preferences > External SDKs.

2. **FB Instant Games initial payload: hard limit or soft target?**
   - What we know: Facebook recommends aiming for ~1 MB initial download; total bundle cap is 200 MB; sessions abandon beyond 5-second load; community convention uses 5 MB as a planning target.
   - What's unclear: Whether Facebook enforces a hard byte limit on the initial payload or whether it is purely a performance SLA.
   - Recommendation: Treat 5 MB as a hard self-imposed limit enforced by measurement. If the FB platform ever rejects the upload or degrades the game's loading experience, the root cause is bundle size. Test empirically during SC-3 verification.

3. **Cocos Creator 3.8.8 and Xcode 16 compatibility**
   - What we know: The 3.8.x changelog mentions a fix for "iOS/macOS build errors caused by Xcode 16.3".
   - What's unclear: Whether the fix is in the 3.8.8 release or a later patch.
   - Recommendation: Use the latest 3.8.x patch available at project start. If iOS builds fail with Xcode 16.x, downgrade Xcode or check the Cocos forum for the relevant patch.

---

## Validation Architecture

`nyquist_validation` is enabled. Phase 1 is infrastructure-only — there is no automated test framework appropriate for Cocos Creator project structure validation. The validation strategy is a combination of build pipeline checks, grep-based static analysis, and manual device verification.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | No runtime test framework in Phase 1. Validation is build-based + static analysis + manual device check. |
| Config file | N/A — add a test framework (e.g., Jest for pure TypeScript unit tests) in Phase 2 when logic units exist. |
| Quick run command | `bash .planning/phases/01-project-foundation/validate.sh` (to be created in Wave 0) |
| Full suite command | Same — all Phase 1 checks run in one script. |

### Success Criterion → Validation Map

| SC | Behavior | Test Type | Automated Command | Created |
|----|----------|-----------|-------------------|---------|
| SC-1 | Cocos Creator project builds and deploys a blank scene to iOS or Android without errors | Manual (device required) | Build step: `Build panel > iOS or Android > Build + Compile`; verify 0 errors in build log | Manual — no automation possible without device CI |
| SC-2 | Project builds and runs as Facebook Instant Games HTML5 bundle without errors | Semi-automated | `ls -lh build/fb-instant-games/fb-instant-games.zip` verifies build artifact exists; upload and open in FB Developer sandbox for runtime check | ❌ Wave 0: create `validate.sh` that checks build artifact presence |
| SC-3 | Initial payload bundle measures under 5 MB | Automated (post-build) | `test $(stat -c%s build/fb-instant-games/fb-instant-games.zip) -lt 5242880 && echo PASS || echo FAIL` | ❌ Wave 0: add to `validate.sh` |
| SC-4 | No direct SDK imports outside adapter files | Automated (static analysis) | `grep -r "FBInstant\." assets/ --include="*.ts" | grep -v "adapters/"` (must return 0 matches) | ❌ Wave 0: add to `validate.sh` |

### validate.sh (Wave 0 deliverable)

```bash
#!/usr/bin/env bash
# .planning/phases/01-project-foundation/validate.sh
# Run after every FB Instant Games build to verify Phase 1 success criteria.

set -e
PASS=0; FAIL=0

# SC-3: Check zip size < 5 MB (5,242,880 bytes)
ZIP=build/fb-instant-games/fb-instant-games.zip
if [ -f "$ZIP" ]; then
    SIZE=$(stat -c%s "$ZIP" 2>/dev/null || stat -f%z "$ZIP")
    if [ "$SIZE" -lt 5242880 ]; then
        echo "[PASS] SC-3: Initial payload ${SIZE} bytes < 5 MB"
        PASS=$((PASS+1))
    else
        echo "[FAIL] SC-3: Initial payload ${SIZE} bytes >= 5 MB (budget exceeded)"
        FAIL=$((FAIL+1))
    fi
else
    echo "[SKIP] SC-3: Build artifact not found at $ZIP — run FB Instant Games build first"
fi

# SC-4: No direct SDK imports outside adapters/
VIOLATIONS=$(grep -r "FBInstant\." assets/ --include="*.ts" 2>/dev/null | grep -v "adapters/" || true)
if [ -z "$VIOLATIONS" ]; then
    echo "[PASS] SC-4: No direct FBInstant calls outside adapters/"
    PASS=$((PASS+1))
else
    echo "[FAIL] SC-4: Direct SDK imports found outside adapters/:"
    echo "$VIOLATIONS"
    FAIL=$((FAIL+1))
fi

# SC-2: Build artifact exists
if [ -f "$ZIP" ]; then
    echo "[PASS] SC-2: FB Instant Games build artifact exists"
    PASS=$((PASS+1))
else
    echo "[FAIL] SC-2: FB Instant Games build artifact missing — build not completed"
    FAIL=$((FAIL+1))
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
echo "SC-1 (iOS/Android device deploy): MANUAL — verify by deploying to a device and confirming blank scene loads without errors."
echo "SC-2 (runtime): MANUAL — upload zip to FB Developer sandbox and confirm game starts."
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
```

### Sampling Rate

- **Per task commit:** Run `bash .planning/phases/01-project-foundation/validate.sh` after every build.
- **Per wave merge:** Full script + manual SC-1 device check (at minimum simulator; physical device preferred).
- **Phase gate:** All four SC checks green before `/gsd:verify-work`.

### Wave 0 Gaps

- [ ] `.planning/phases/01-project-foundation/validate.sh` — covers SC-2 (artifact), SC-3 (size), SC-4 (grep)
- [ ] `assets/fbinstant.d.ts` — TypeScript declaration for `FBInstant` global (enables type checking without importing FB SDK)
- [ ] `assets/core/scripts/adapters/IPlatformAdapter.ts` — adapter interface (must exist before any other script references platform)
- [ ] `assets/core/scripts/adapters/NullPlatformAdapter.ts` — no-op implementation
- [ ] `assets/core/scripts/adapters/FBInstantAdapter.ts` — real implementation
- [ ] `assets/data/flowers.json` — stub flower config (even empty array) so FlowerDatabase has a target to load
- [ ] No Jest or other test framework needed in Phase 1 — add in Phase 2 when pure logic units (FlowerLifecycleSystem timing math) exist

*(SC-1 device deploy and SC-2 runtime FB validation are manual-only — no automation can substitute for a real device or FB Instant sandbox.)*

---

## Sources

### Primary (HIGH confidence)
- [Cocos Creator 3.8 Asset Bundle Overview](https://docs.cocos.com/creator/3.8/manual/en/asset/bundle.html) — bundle creation, priority, loading APIs, memory management
- [Cocos Creator 3.8 TypeScript config](https://docs.cocos.com/creator/3.8/manual/en/scripting/tsconfig.html) — tsconfig structure, fixed vs. customizable options
- [Cocos Creator 3.8 Publish to Facebook Instant Games](https://docs.cocos.com/creator/3.8/manual/en/editor/publish/publish-fb-instant-games.html) — build workflow, SDK auto-injection, upload process
- [filehorse.com / WebSearch verified](https://www.filehorse.com/download-cocos-creator/) — confirmed Cocos Creator 3.8.8 as latest stable (Dec 28, 2025); no 3.9 yet
- [Cocos Creator 3.8 Native Development Environment](https://docs.cocos.com/creator/3.8/manual/en/editor/publish/setup-native-development.html) — NDK r21–r23, Android Studio 4.1+, Xcode 11.5+ requirements

### Secondary (MEDIUM confidence)
- [Cocos Creator 3.8 General Build Options](https://docs.cocos.com/creator/3.8/manual/en/editor/publish/build-options.html) — build panel configuration
- WebSearch (multiple results) — FB Instant Games total bundle cap 200 MB, initial load performance target ~1 MB; 5 MB is community-standard planning budget, not a hard API limit
- [GameMaker/YoYo Games FB Instant Games docs](https://gamemaker.zendesk.com/hc/en-us/articles/360001723511-Facebook-Instant-Games-Additional-Features) — corroborates 200 MB total cap and "aim for 1 MB initial download" guidance

### Tertiary (LOW confidence — unverified specifics)
- FB Instant Games SDK current version (7.1 from training data) — verify at https://developers.facebook.com/docs/games/instant-games/sdk before integration
- Xcode 16.3 compatibility fix in Cocos 3.8.x — verify exact patch version in Creator changelog

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Cocos Creator 3.8.8 LTS confirmed current; TypeScript bundled; build targets stable since 3.6
- Architecture: HIGH — Persistent root node pattern, Asset Bundle system, adapter pattern are all first-class Cocos Creator 3.8 features with official documentation
- Pitfalls: HIGH for engineering patterns; MEDIUM for FB payload limit classification (hard vs. soft)
- Validation: HIGH — build-based and grep-based checks are deterministic; device checks are manual by necessity

**Research date:** 2026-03-07
**Valid until:** 2026-09-07 (6 months — Cocos Creator LTS branch is stable; FB Instant Games platform requirements may shift)
