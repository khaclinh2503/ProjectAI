# Phase 14: Lobby & Leaderboard UI - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

UI layer only — Cocos renderer components, new scenes, @property bindings. Delivers:
1. `LobbyScene` — title + player name display + 5 buttons (Chơi Ngay, Vườn Hoa, Túi Đồ, BXH, Setting)
2. Name-input modal overlay on LobbyScene — fires on first run (no stored name), EditBox + Confirm button
3. `LeaderboardScene` — top-10 display (rank, name, score), Back button returns to Lobby
4. "Sắp ra mắt" toast feedback for Vườn Hoa, Túi Đồ, Setting buttons
5. `LobbyController.ts` and `LeaderboardController.ts` as Cocos Component classes (cc imports OK here)

Does NOT cover: Boot→Lobby routing, Game→Results→Lobby navigation (Phase 15). BootController still loads GameScene in this phase — scene wiring is Phase 15 scope.

</domain>

<decisions>
## Implementation Decisions

### Name Input Prompt
- **D-01:** Modal overlay node embedded in LobbyScene (not a separate scene). On LobbyScene load, check `LeaderboardService.getPlayerName()` — if null, activate overlay node.
- **D-02:** Overlay contains: a title label, Cocos EditBox (max 12 chars), and a "Bắt Đầu" button.
- **D-03:** "Bắt Đầu" button is disabled (interactable=false, grayed) until EditBox has at least 1 character. Enable reactively via EditBox change callback.
- **D-04:** On confirm: call `LeaderboardService.setPlayerName(name)`, fade overlay out (UIOpacity tween 255→0 over ~0.3s), then set node.active=false. Lobby content becomes fully interactive after fade.
- **D-05:** Lobby content behind the overlay is visible but dimmed (semi-transparent overlay background), not hidden.

### Leaderboard Display
- **D-06:** BXH button calls `director.loadScene('LeaderboardScene')` — a full separate scene, not an overlay panel.
- **D-07:** LeaderboardScene has a Back button (top-left) → `director.loadScene('LobbyScene')`.
- **D-08:** Display: rank (#1–#10), player name, score — 3 columns per row, up to 10 rows.
- **D-09:** Empty state (no entries): centered label "Chưa có ai lên bảng. Hãy chơi ngay!" — no animation, no placeholder rows.

### Lobby Layout
- **D-10:** Vertical stack layout: title "BLOOM TAP" at top, then "Xin chào, [name]" greeting label, then 5 buttons stacked vertically (Chơi Ngay → Vườn Hoa → Túi Đồ → BXH → Setting).
- **D-11:** Solid background color (consistent with existing scenes — no sprite background). Title and greeting as Label nodes.
- **D-12:** Player name in greeting updated after overlay closes (reads from `LeaderboardService.getPlayerName()`).

### "Sắp Ra Mắt" Toast
- **D-13:** Vườn Hoa, Túi Đồ, Setting buttons each trigger a toast — a shared Label node that fades in, holds ~1.5s, fades out. Text: "Sắp ra mắt!".
- **D-14:** Toast does NOT block UI (no modal behavior). Player can tap other buttons while toast is visible.
- **D-15:** One shared toast node on LobbyScene handles all 3 buttons — previous toast interrupted if another button is tapped quickly (tween restart).

### Claude's Discretion
- Exact button sizing, font sizes, and color palette — match existing GameScene aesthetic.
- Toast animation specifics (fade duration, hold duration) — match juice style already in game (~0.2s fade).
- Whether to use `ScrollView` for LeaderboardScene rows or pre-allocated fixed Label nodes (10 rows max → fixed nodes are fine).
- LobbyController vs inline script naming conventions — follow existing @ccclass pattern.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Lobby (LOBBY-01), §Player Identity (PLAYER-01), §Leaderboard (LB-01) — acceptance criteria for this phase
- `.planning/ROADMAP.md` §Phase 14 — success criteria SC-1 through SC-5

### Architecture & Existing Logic
- `BloomTap/assets/scripts/logic/LeaderboardService.ts` — `getPlayerName()`, `setPlayerName()`, `getEntries()`, `getRank()` — all available for UI components to call
- `BloomTap/assets/scripts/logic/StorageService.ts` — underlying storage; no direct use needed (via LeaderboardService)
- `BloomTap/assets/scripts/BootController.ts` — existing scene controller pattern to follow (@ccclass, @property, Component subclass)
- `.planning/phases/13-leaderboardservice/13-CONTEXT.md` — data model decisions (entry shape, getRank null=10+)

### Existing Scenes (for consistency)
- `BloomTap/assets/scene/BootScene.scene` — pattern for simple scene with controller
- `BloomTap/assets/scene/GameScene.scene` — pattern for scene with overlays (startOverlay, countdownOverlay, resultsScreen)

### No external design specs
No ADRs beyond the above — decisions fully captured above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `LeaderboardService` (pure logic) — call directly from LobbyController and LeaderboardController. `getPlayerName()` returns null on first run → triggers overlay. `getEntries()` returns sorted array for display.
- UIOpacity + tween pattern — already used in GameController for score floats and overlay transitions. Follow same pattern for overlay fade and toast animation.
- `director.loadScene()` — already used in BootController (`'GameScene'`) and reload (`'Boot'`). Same pattern for `'LobbyScene'` and `'LeaderboardScene'`.

### Established Patterns
- `@ccclass` + `@property` Component subclass — all scene controllers follow this (BootController, GameController).
- Overlay nodes with `node.active` toggle — startOverlay, countdownOverlay, resultsScreen in GameScene all use this pattern.
- Button event: `button.node.on(Button.EventType.CLICK, handler, this)` — existing pattern in BootController.
- EditBox: Cocos `EditBox` component, max-length set in Inspector or via `editBox.maxLength`.

### Integration Points
- Phase 15 will wire `BootController` to route to LobbyScene instead of GameScene directly.
- Phase 15 will wire GameScene end-game flow to return to LobbyScene.
- `LeaderboardController` must expose `refresh()` or re-read entries on `onLoad` so data is always fresh when scene is loaded.

</code_context>

<specifics>
## Specific Ideas

- Greeting label format: "Xin chào, [name] 🌸" — the flower emoji was shown in mockup and user accepted it.
- Lobby title: "BLOOM TAP" as text label (no sprite logo needed for v1.2).
- LeaderboardScene rows: "#1  [name]  [score]" — 3 columns, simple Label-based layout (not a ListView/ScrollView).
- Name overlay: lobby content visible but dimmed behind overlay — semi-transparent dark background on overlay node.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 14-lobby-leaderboard-ui*
*Context gathered: 2026-03-28*
