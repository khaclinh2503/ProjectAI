# Phase 14: Lobby & Leaderboard UI - Research

**Researched:** 2026-03-28
**Domain:** Cocos Creator 3.x UI — Scene authoring, Component scripting, tween animations, EditBox
**Confidence:** HIGH

## Summary

Phase 14 is a pure UI layer phase on top of the already-complete LeaderboardService logic tier. It introduces two new Cocos scenes (LobbyScene, LeaderboardScene) and two TypeScript controller classes that follow the established `@ccclass` / `@property` / `onLoad` pattern already used by BootController and GameController. No new libraries or npm packages are required — all needed primitives (Label, Button, EditBox, UIOpacity, tween, director.loadScene) exist in the Cocos Creator 3.x SDK.

The entire implementation concern is scene graph authoring in the Cocos Editor and wiring controllers in TypeScript code. The architecture is explicitly NOT testing-covered at the Vitest tier because controller classes import from `cc` and cannot run in jsdom. All five success criteria are verifiable only through human play-testing or Cocos Preview.

**Primary recommendation:** Follow the exact node tree specified in `14-UI-SPEC.md`, use `Tween.stopAllByTarget()` before any restart to prevent tween accumulation, and read `LeaderboardService.getPlayerName()` in `onLoad` (not `start`) to avoid a one-frame flicker where the overlay activates too late.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Modal overlay node embedded in LobbyScene (not a separate scene). On LobbyScene load, check `LeaderboardService.getPlayerName()` — if null, activate overlay node.
**D-02:** Overlay contains: a title label, Cocos EditBox (max 12 chars), and a "Bắt Đầu" button.
**D-03:** "Bắt Đầu" button is disabled (interactable=false, grayed) until EditBox has at least 1 character. Enable reactively via EditBox change callback.
**D-04:** On confirm: call `LeaderboardService.setPlayerName(name)`, fade overlay out (UIOpacity tween 255→0 over ~0.3s), then set node.active=false. Lobby content becomes fully interactive after fade.
**D-05:** Lobby content behind the overlay is visible but dimmed (semi-transparent overlay background), not hidden.
**D-06:** BXH button calls `director.loadScene('LeaderboardScene')` — a full separate scene, not an overlay panel.
**D-07:** LeaderboardScene has a Back button (top-left) → `director.loadScene('LobbyScene')`.
**D-08:** Display: rank (#1–#10), player name, score — 3 columns per row, up to 10 rows.
**D-09:** Empty state (no entries): centered label "Chưa có ai lên bảng. Hãy chơi ngay!" — no animation, no placeholder rows.
**D-10:** Vertical stack layout: title "BLOOM TAP" at top, then "Xin chào, [name] 🌸" greeting label, then 5 buttons stacked vertically.
**D-11:** Solid background color (consistent with existing scenes — no sprite background). Title and greeting as Label nodes.
**D-12:** Player name in greeting updated after overlay closes (reads from `LeaderboardService.getPlayerName()`).
**D-13:** Vườn Hoa, Túi Đồ, Setting buttons each trigger a toast — a shared Label node that fades in, holds ~1.5s, fades out. Text: "Sắp ra mắt!".
**D-14:** Toast does NOT block UI (no modal behavior). Player can tap other buttons while toast is visible.
**D-15:** One shared toast node on LobbyScene handles all 3 buttons — previous toast interrupted if another button is tapped quickly (tween restart).

**Phase Boundary:** UI layer only. BootController still routes to GameScene — scene routing is Phase 15. LeaderboardController must re-read entries on `onLoad` so data is always fresh.

### Claude's Discretion

- Exact button sizing, font sizes, and color palette — match existing GameScene aesthetic (specs provided in UI-SPEC.md).
- Toast animation specifics (fade duration, hold duration) — match juice style already in game (~0.2s fade).
- Whether to use ScrollView for LeaderboardScene rows or pre-allocated fixed Label nodes (10 rows max → fixed nodes are fine).
- LobbyController vs inline script naming conventions — follow existing @ccclass pattern.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LOBBY-01 | Lobby screen with 5 buttons; Vườn Hoa/Túi Đồ/Setting show "Sắp ra mắt" | LobbyScene + LobbyController with toast animation pattern |
| PLAYER-01 (UI side) | First run name-input prompt (max 12 chars); name persists and shows on lobby | NameInputOverlay node on LobbyScene; EditBox + UIOpacity tween; LeaderboardService.setPlayerName/getPlayerName |
| LB-01 (display side) | BXH button → LeaderboardScene showing rank/name/score for top 10; empty state | LeaderboardScene + LeaderboardController reading getEntries() on onLoad |
</phase_requirements>

---

## Standard Stack

### Core (all already in project — no npm installs required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Cocos Creator | 3.8.8 (project's current) | Scene runtime, UI components | Project is already a CC3 project |
| `cc` module | (built-in) | Label, Button, EditBox, Node, UIOpacity, UITransform, tween, Tween, director | All required UI primitives |
| `LeaderboardService` | (Phase 13 — already implemented) | getPlayerName, setPlayerName, getEntries | Pure logic, no cc imports, directly importable |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `Tween.stopAllByTarget()` | CC3 built-in | Cancels all running tweens on a target | Before starting any new tween on same node/component to prevent accumulation |
| `UIOpacity` component | CC3 built-in | Per-node opacity independent of Color.a | Used for all fade animations (overlay, toast) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Fixed 10-row Label nodes | ScrollView + dynamic items | ScrollView adds complexity with no benefit at 10 max entries |
| Embedded overlay on LobbyScene | Separate NameInputScene | Separate scene adds load time; overlay is simpler and decided (D-01) |
| `tween()` for toast | `scheduleOnce` + `node.active` toggle | tween gives smooth fade; already used throughout codebase |

**Installation:** No new packages needed. Vitest already installed at root for logic tests.

---

## Architecture Patterns

### Recommended Project Structure

```
BloomTap/assets/
├── scene/
│   ├── BootScene.scene          (existing — unchanged)
│   ├── GameScene.scene          (existing — unchanged)
│   ├── LobbyScene.scene         (NEW — Phase 14)
│   └── LeaderboardScene.scene   (NEW — Phase 14)
└── scripts/
    ├── LobbyController.ts       (NEW — Phase 14)
    ├── LeaderboardController.ts (NEW — Phase 14)
    ├── BootController.ts        (existing — unchanged in this phase)
    └── logic/
        └── LeaderboardService.ts (existing — read-only in this phase)
```

### Pattern 1: Scene Controller Class

All scene controllers in this project follow the same structure: `@ccclass` + `@property` + `Component` subclass + `onLoad()` as entry point. Wire @property bindings in the Inspector for every scene node reference.

```typescript
// Pattern from BootController.ts (the simplest reference — follow this shape)
import { _decorator, Component, director, Label, Button, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('LobbyController')
export class LobbyController extends Component {
    @property(Label)
    titleLabel: Label | null = null;

    @property(Node)
    nameInputOverlay: Node | null = null;

    onLoad(): void {
        // Check name BEFORE first frame renders — avoid overlay flicker
        const name = LeaderboardService.getPlayerName();
        if (this.nameInputOverlay) {
            this.nameInputOverlay.active = (name === null);
        }
        // Wire button click handlers here
    }
}
```

### Pattern 2: Overlay Fade with UIOpacity tween

This pattern is already used in GameController for flash overlays and milestone celebrations.

```typescript
// Source: GameController.ts _playMilestoneCelebration (lines 442–469)
// Fade out and deactivate overlay on confirm:
import { tween, Tween, UIOpacity } from 'cc';

private _confirmName(): void {
    const name = this.nameEditBox?.string?.trim() ?? '';
    if (!name) return;
    LeaderboardService.setPlayerName(name);
    if (this.greetingLabel) {
        this.greetingLabel.string = `Xin chào, ${name} 🌸`;
    }
    const overlay = this.nameInputOverlay;
    if (!overlay) return;
    const uiOp = overlay.getComponent(UIOpacity);
    if (!uiOp) return;
    Tween.stopAllByTarget(uiOp);
    tween(uiOp)
        .to(0.3, { opacity: 0 })
        .call(() => {
            if (overlay) overlay.active = false;
            if (uiOp) uiOp.opacity = 255; // reset for next time (if ever re-shown)
        })
        .start();
}
```

### Pattern 3: Toast Animation (non-blocking, interruptible)

```typescript
// Source: CONTEXT.md D-13–15; matches existing GameController juice patterns
private _showToast(): void {
    const toast = this.toastLabel;
    if (!toast) return;
    const uiOp = toast.node.getComponent(UIOpacity);
    if (!uiOp) return;
    // Stop any previous toast tween (D-15: interrupt on re-tap)
    Tween.stopAllByTarget(uiOp);
    toast.node.active = true;
    uiOp.opacity = 0;
    tween(uiOp)
        .to(0.2, { opacity: 255 })          // fade in 0.2s
        .delay(1.5)                          // hold 1.5s
        .to(0.2, { opacity: 0 })            // fade out 0.2s
        .call(() => { if (toast.node) toast.node.active = false; })
        .start();
}
```

### Pattern 4: EditBox Reactive Button Enable/Disable

```typescript
// Source: CONTEXT.md D-03; EditBox.EventType documented in Cocos CC3 API
import { EditBox, Button } from 'cc';

// In onLoad():
this.nameEditBox?.node.on(EditBox.EventType.TEXT_CHANGED, this._onNameChanged, this);

private _onNameChanged(): void {
    const hasText = (this.nameEditBox?.string?.length ?? 0) >= 1;
    if (this.btnBatDau) {
        this.btnBatDau.interactable = hasText;
        // Also update visual color via node.getComponent(UIOpacity) or Label color
    }
}
```

### Pattern 5: LeaderboardController Row Rendering

```typescript
// Pre-allocated 10 row nodes; show/hide based on entry count
onLoad(): void {
    const entries = LeaderboardService.getEntries();
    const hasEntries = entries.length > 0;
    if (this.emptyStateLabel) this.emptyStateLabel.node.active = !hasEntries;
    for (let i = 0; i < 10; i++) {
        const row = this.rows[i]; // @property(Node) rows: Node[] = []
        if (!row) continue;
        if (i < entries.length) {
            row.active = true;
            // Set RankLabel, NameLabel, ScoreLabel children
            const rankLabel = row.getChildByName('RankLabel')?.getComponent(Label);
            const nameLabel = row.getChildByName('NameLabel')?.getComponent(Label);
            const scoreLabel = row.getChildByName('ScoreLabel')?.getComponent(Label);
            if (rankLabel) rankLabel.string = `#${i + 1}`;
            if (nameLabel) nameLabel.string = entries[i].name;
            if (scoreLabel) scoreLabel.string = String(entries[i].score);
        } else {
            row.active = false;
        }
    }
}
```

### Anti-Patterns to Avoid

- **Tween accumulation:** Never start a new tween on a node/UIOpacity without first calling `Tween.stopAllByTarget(target)`. Stacking tweens causes opacity to jump unpredictably. GameController uses this pattern on every juice animation.
- **Wrong entry point for overlay check:** Do NOT check `getPlayerName()` in `start()` or `update()`. Use `onLoad()` to prevent a one-frame flash where the overlay is inactive before being activated.
- **Mutating UIOpacity.opacity in the same frame as tween start:** Set the initial opacity value, then call `.start()` — Cocos tween reads the starting state at `.start()` time. Setting opacity after `.start()` is called produces undefined initial state.
- **Using `node.getComponent(Label)` on the wrong child level:** The Label component is on the node itself, not its parent. Verify node hierarchy in the Inspector.
- **Forgetting to reset UIOpacity after fade-out:** If the overlay could theoretically be re-shown, reset `uiOp.opacity = 255` in the tween's `.call()` callback after setting `active = false`.
- **Wiring row nodes as individual @property fields:** Use `@property([Node]) rows: Node[] = []` to declare a node array — the Inspector supports array bindings in CC3 without scripting all 10 as separate properties.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Player name persistence | Custom localStorage key | `LeaderboardService.setPlayerName()` / `getPlayerName()` | Already implemented, tested, handles truncation and StorageService prefix |
| Leaderboard data | Any local data fetching | `LeaderboardService.getEntries()` | Returns pre-sorted array, handles empty/corrupt storage |
| Fade animations | setTimeout + setInterval | Cocos `tween()` + UIOpacity | CC3 tween integrates with scene lifecycle; won't fire after node destroy |
| Text input | Native HTML input | Cocos `EditBox` component | Platform-native (mobile keyboard on Android/iOS); standard CC3 pattern |
| Scene navigation | Any custom router | `director.loadScene('SceneName')` | Already used by BootController; CC3 standard |

**Key insight:** The logic tier (storage, sorting, rank calculation, name truncation) was fully implemented in Phase 13. Phase 14 is wiring — do not re-implement any data concern.

---

## Common Pitfalls

### Pitfall 1: EditBox.EventType.TEXT_CHANGED fires on programmatic set
**What goes wrong:** If code programmatically sets `editBox.string = ''` to clear the field, `TEXT_CHANGED` fires and `_onNameChanged` runs before the next user interaction.
**Why it happens:** Cocos EditBox TEXT_CHANGED fires on all string mutations, not just user input.
**How to avoid:** Only clear the EditBox on `onLoad` initialization (which runs before listeners are attached), not at runtime. If runtime clearing is needed, detach the listener first.
**Warning signs:** Button incorrectly enables/disables after a programmatic clear.

### Pitfall 2: `director.loadScene()` destroys all tweens on the current scene
**What goes wrong:** If the toast tween is running when `BXH` is tapped (which also calls `director.loadScene`), Cocos destroys the scene mid-tween with no crash but the toast tween's `.call()` callback may fire after the node is invalid.
**Why it happens:** Scene destruction invalidates all nodes; the tween may fire its callback on an already-destroyed node.
**How to avoid:** Always null-check inside `.call()` callbacks: `if (toast.node && toast.node.isValid) toast.node.active = false`. Existing GameController uses this pattern (`if (this.redFlashOverlay) ...`).
**Warning signs:** Console errors about accessing properties on destroyed nodes.

### Pitfall 3: Row node @property array index mismatch
**What goes wrong:** Inspector-assigned row nodes do not match the index `i` in the render loop, causing wrong rank/name/score to appear in wrong rows.
**Why it happens:** Inspector array order can get shuffled when nodes are reordered in the hierarchy.
**How to avoid:** Name row nodes `Row0`, `Row1`, ..., `Row9` and sort by name in `onLoad` before rendering, OR verify Inspector array order matches hierarchy order at time of final scene save.
**Warning signs:** Leaderboard entries appear out of order despite `getEntries()` returning sorted data.

### Pitfall 4: UIOpacity component missing on node
**What goes wrong:** `node.getComponent(UIOpacity)` returns null; tween has no target; no animation plays; no error thrown.
**Why it happens:** UIOpacity must be explicitly added to a node in the Inspector — it is not present by default.
**How to avoid:** For every node that will be faded (NameInputOverlay, ToastLabel node), verify UIOpacity is in the component list in the Cocos Editor before scripting the animation.
**Warning signs:** Overlay appears/disappears instantly instead of fading.

### Pitfall 5: EditBox max-length not enforced at display level
**What goes wrong:** User types more than 12 characters; `LeaderboardService.setPlayerName` truncates to 12 but the EditBox shows the full string until save.
**Why it happens:** `editBox.maxLength` must be set in the Inspector (or via code in `onLoad`) — it is not set automatically.
**How to avoid:** In `onLoad`, set `if (this.nameEditBox) this.nameEditBox.maxLength = 12;`. This aligns with the Inspector-level control and is the explicit contract from D-02.
**Warning signs:** EditBox accepts more than 12 characters before confirm.

---

## Code Examples

### Button click wiring (from BootController.ts, lines 21)
```typescript
// Source: BootController.ts onLoad()
this.reloadButton?.node.on(Button.EventType.CLICK, this._onReload, this);
```

### Tween with stop-all guard (from GameController.ts, lines 326–334)
```typescript
// Source: GameController.ts _playRedFlash()
Tween.stopAllByTarget(uiOp);
tween(uiOp)
    .to(0.05, { opacity: 51 })
    .to(0.10, { opacity: 0 })
    .call(() => {
        if (this.redFlashOverlay) this.redFlashOverlay.active = false;
    })
    .start();
```

### director.loadScene (from BootController.ts, line 38)
```typescript
// Source: BootController.ts _loadConfigs()
director.loadScene('GameScene');
```

### Overlay active toggle (from GameController.ts)
```typescript
// Source: GameController.ts onLoad() lines 136–139
if (this.pauseButton) this.pauseButton.active = false;
if (this.pauseOverlay) this.pauseOverlay.active = false;
```

### @property node array declaration (Cocos CC3 pattern — HIGH confidence from official docs)
```typescript
@property([Node])
rows: Node[] = [];
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `cc.director.loadScene` (CC2 style) | `director.loadScene` (named import from 'cc') | CC3.0 | All scene loads use named import; no `cc.` prefix |
| `cc.tween` / `cc.find` prefixed | `tween`, `Tween` from 'cc' | CC3.0 | Same pattern already used throughout codebase |
| ScrollView for leaderboard | Fixed 10 pre-allocated row nodes | Phase 14 discretion | Simpler at 10 max entries; no dynamic layout needed |

**Deprecated/outdated:**
- `cc.director` (global prefix): Not used in CC3 — import `director` directly from `'cc'`.
- `cc.EditBox.EventType.INPUT_CHANGED`: In CC3 this is `EditBox.EventType.TEXT_CHANGED` — verify via the imported enum.

---

## Environment Availability

This phase is purely code/config changes within the Cocos Editor and TypeScript. No external CLI tools, databases, or services are required beyond the already-installed Cocos Creator 3.8.8.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Cocos Creator 3.x | Scene authoring | Assumed present (project opens) | 3.8.8 (from BloomTap/package.json) | — |
| Node.js + Vitest | Logic unit tests | Confirmed (root package.json) | vitest ^3.2.4 | — |

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

Vitest validation is enabled (`nyquist_validation: true` in `.planning/config.json`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `E:/workspace/ProjectAI/vitest.config.ts` |
| Quick run command | `npm run test:run -- --reporter=verbose` (from project root) |
| Full suite command | `npm run test:run` (from project root) |

**Important constraint:** `vitest.config.ts` includes only `BloomTap/assets/scripts/logic/**/*.test.ts`. Controller classes (LobbyController, LeaderboardController) import from `cc` and cannot run in this Vitest environment. There are NO automated tests to write for Phase 14 — all validation is human play-test via Cocos Preview.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LOBBY-01 | 5 buttons present; toast shows for 3 buttons | manual-only | — | N/A |
| PLAYER-01 (UI) | Name overlay shows on first run; persists across reload | manual-only | — | N/A |
| LB-01 (display) | LeaderboardScene shows entries; empty state correct | manual-only | — | N/A |

**Why manual-only:** LobbyController and LeaderboardController must import from `'cc'` (Button, EditBox, Label, director, tween) which is not available in jsdom/node. The Vitest config explicitly scopes to `logic/` only — this is the established project pattern.

**Existing tests that remain valid (no changes to logic tier):**
- `LeaderboardService.test.ts` — 24 tests covering getPlayerName, setPlayerName, getEntries, saveEntry, getRank. These will continue passing unchanged.

### Sampling Rate

- **Per task commit:** `npm run test:run` (ensures no logic regressions from any incidental imports)
- **Per wave merge:** `npm run test:run`
- **Phase gate:** Full suite green + human play-test checklist completed before `/gsd:verify-work`

### Wave 0 Gaps

None — no new Vitest test files are needed for this phase. LobbyController and LeaderboardController are Cocos Component classes that cannot be tested with the current Vitest setup. The existing `LeaderboardService.test.ts` already covers the logic this phase depends on.

---

## Open Questions

1. **EditBox.EventType name in CC3.8.8**
   - What we know: CC3 uses `EditBox.EventType.TEXT_CHANGED` (not `INPUT_CHANGED`)
   - What's unclear: Whether CC3.8.8 specifically uses `TEXT_CHANGED` or `EDITING_DID_CHANGE` — API docs vary by source
   - Recommendation: Verify by checking the imported `EditBox.EventType` enum in the Cocos Editor TypeScript autocompletion when wiring the listener. Both `TEXT_CHANGED` and `EDITING_DID_CHANGE` should be visible. If `TEXT_CHANGED` is not found, fall back to `EDITING_DID_CHANGE`.

2. **@property([Node]) array binding in CC3 Inspector**
   - What we know: CC3 supports array @property bindings with `@property([Node]) rows: Node[] = []`
   - What's unclear: Whether the Inspector correctly serializes the array after reordering hierarchy nodes
   - Recommendation: After wiring all 10 row nodes in the Inspector, do a final save and reopen the scene file to verify the binding is stable. Use `console.log(this.rows.map(n => n?.name))` in `onLoad` to confirm order at runtime.

---

## Sources

### Primary (HIGH confidence)
- Existing codebase — BootController.ts, GameController.ts: All patterns (tween, UIOpacity, Button.EventType, director.loadScene, @ccclass/@property, Tween.stopAllByTarget) extracted verbatim from production code already running in this project.
- `LeaderboardService.ts` + test file: Confirmed API surface (getPlayerName, setPlayerName, getEntries, getRank, saveEntry).
- `vitest.config.ts` + root `package.json`: Confirmed test framework, include glob, and `test:run` command.
- `14-CONTEXT.md` + `14-UI-SPEC.md`: All locked decisions, node tree, color values, animation specs.

### Secondary (MEDIUM confidence)
- `BloomTap/package.json` creator.version "3.8.8": Cocos Creator version confirmed from project metadata.

### Tertiary (LOW confidence)
- `EditBox.EventType.TEXT_CHANGED` exact enum key: Named from knowledge of CC3 API; not verified against live CC3.8.8 TypeScript definitions. Verify at implementation time.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already in the project and in active use
- Architecture patterns: HIGH — extracted verbatim from existing production code
- Pitfalls: HIGH — identified from the existing code's own comments and established patterns
- Test coverage: HIGH — vitest.config.ts confirms logic-only scope; CC component tests are confirmed impossible

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (Cocos 3.x stable; no fast-moving dependencies)
