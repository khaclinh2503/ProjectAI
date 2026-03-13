# Project Research Summary

**Project:** Bloom Tap
**Domain:** HTML5 casual grid-based tapping game — mobile web + Facebook Instant Games
**Researched:** 2026-03-13
**Confidence:** MEDIUM

## Executive Summary

Bloom Tap is a 120-second, time-limited casual tapping game played on an 8x8 grid. Players harvest flowers in specific growth states (Blooming, Full Bloom) to earn points, with a wrong-tap penalty, a combo multiplier system, and a 3-phase difficulty escalation that drives the emotional arc of each session. The established approach for this class of game is Phaser 3 on a Vite + TypeScript scaffold — this combination has the lowest friction, the richest community, and is explicitly supported by Facebook Instant Games. Architecture centers on a fixed-rate game loop driving per-cell Flower FSMs, a decoupled renderer, and a data-driven spawn config that supports difficulty phases without hardcoded logic.

The primary technical risks are performance-related: GC spikes during Phase 3 heavy spawning (prevented by object pooling from the start), flower timer drift over a 120-second session (prevented by timestamp-based state derivation, not delta accumulation), and canvas rendering cost on mid-range Android (prevented by using Phaser's WebGL renderer and avoiding canvas shadowBlur). A secondary structural risk is the dependency chain: the flower growth cycle must exist and be visually readable before any tap-timing or scoring work is valid, and the spawn system must be parameterized from day one to support 3-phase escalation — neither can be retrofitted cheaply.

The recommended build sequence is: foundation (rendering, input, viewport, DPR) → pure game logic (FlowerFSM, Grid, ComboSystem as code with no canvas) → wired gameplay (Renderer + InputHandler connecting logic to screen) → session loop (timer, spawn escalation, scoring pipeline) → results and persistence → juice and polish. Facebook Instant Games integration is explicitly deferred to post-v1 because it requires a different initialization architecture and storage layer, but the codebase must abstract these from day one to avoid a costly retrofit.

---

## Key Findings

### Recommended Stack

The standard stack for a shipped HTML5 casual game in this domain is Phaser 3 (3.87.x) + TypeScript 5.4.x + Vite 5.x. Phaser 3 is the dominant choice because it provides Canvas/WebGL rendering with automatic fallback, a built-in scene system, a pointer event model correctly mapped to `touchstart`, and an official Facebook Instant Games plugin. TypeScript is justified by the complexity of the state machine — catching enum and state transition bugs at compile time rather than runtime saves significant debugging time. Vite provides the fastest dev loop and is the community standard replacement for Webpack in new Phaser projects. The Facebook Instant Games SDK (v7.1) is loaded via CDN script tag, not npm, and must be initialized before any Phaser boot.

Three technologies are explicitly forbidden: React/Vue for any in-game UI (60fps tap feedback is incompatible with DOM reflow), Unity WebGL export (5-50MB bundle violates FB's 200KB initial payload limit), and the `npm install fbinstant` unofficial packages (stale, not maintained by Meta).

**Core technologies:**
- **Phaser 3 (3.87.x):** Game engine — rendering, input, scene management, animations — industry standard for HTML5 casual/Instant Games with official TS types
- **TypeScript (5.4.x):** Type safety and refactor confidence — Phaser ships official definitions; catches state machine bugs at compile time
- **Vite (5.x):** Dev server and production bundler — fastest dev loop for Phaser; community standard since 2023
- **Facebook Instant Games SDK (7.1, CDN):** Platform API for FB distribution — must load before Phaser; never install via npm

### Expected Features

The game's core value lies at the intersection of timing skill (harvest window) and spatial scanning (8x8 grid) — features absent from pure idle tappers and pure reflex games. Every table-stakes feature must be in place before any timing balance work is valid, because missing feedback (visual, score, combo) invalidates player behavior during testing.

**Must have (table stakes — v1 launch):**
- Responsive tap registration on `pointerdown` — any latency breaks timing feel
- Visual feedback on every tap (correct and wrong) — silent taps feel broken
- 5 flower growth states (Bud / Blooming / Full Bloom / Wilting / Dead) with visually distinct rendering — this IS the game
- Real-time score display and countdown timer with urgency escalation
- Wrong-tap point deduction with immediate feedback (screen shake, red flash)
- Combo counter with multiplier (resets on wrong tap) — the accuracy pressure mechanism
- 3-phase round escalation (0-40s / 40-80s / 80-120s) with parameterized spawn rates
- Results screen with local highscore (localStorage) and instant restart
- Essential juice: tap scale pulse, score float pop-up, combo break flash, timer urgency color

**Should have (v1.x after core validation):**
- Phase transition visual/audio cue
- Sound effects (tap, combo break, wrong tap, phase change, game over)
- Flower cycle micro-animations (sprite sheet transitions between states)
- Results screen score count-up animation
- Screen shake on wrong tap

**Defer (v2+):**
- Meta-progression / flower unlocks — requires validated replay loop first
- Online leaderboard — requires backend infra and confirmed audience
- Multiple game modes — dilutes focus before core is proven
- Facebook Instant Games packaging — separate integration architecture

### Architecture Approach

The architecture separates pure game logic (FlowerFSM, Grid, ComboSystem, GameState, SpawnManager — all platform-independent) from rendering (Phaser GameObjects, Renderer, AnimationSystem) and input (InputHandler translating canvas coords to grid coordinates). This separation allows the entire logic tier to be unit-tested without a browser, isolates the rendering layer so switching renderer strategies requires only one folder, and makes FB Instant Games integration a storage/init swap rather than a logic rewrite.

The critical architectural decisions are: (1) fixed-rate game loop with delta-time accumulator to decouple flower timer accuracy from frame rate; (2) per-cell Flower FSMs with timestamp-based state derivation (not delta accumulation) to prevent timer drift; (3) object pools for all frequently created/destroyed objects (flower slots, score pop-up Text objects) to prevent GC spikes in Phase 3; (4) data-driven spawn config with phase tables from day one — hardcoded spawn logic cannot be extended to 3 phases.

**Major components:**
1. **FlowerFSM** — per-cell state machine managing the 5-stage growth lifecycle; all timing derived from `performance.now()` spawn timestamp
2. **Grid** — flat 64-cell array owning FlowerFSM instances; provides random empty cell picker for SpawnManager
3. **SpawnManager** — phase-table-driven spawn rate controller; reads elapsed time to select active phase config
4. **ComboSystem** — streak counter with multiplier lookup; resets on wrong tap or gap timeout
5. **GameState** — session state (score, timer, phase, combo); fresh instance per game start, never global
6. **Renderer** — Phaser GameObjects drawing from current state; never mutates state
7. **InputHandler** — translates `pointerdown` canvas coords to (row, col); calls `onTap` callback; knows nothing about game rules
8. **AnimationSystem** — pooled short-lived effects (tap pulse, score float, combo break flash); runs independently of game state

### Critical Pitfalls

1. **Touch input on `touchend`/`click` instead of `pointerdown`** — introduces 100-300ms latency on mobile; all timing balance collected with wrong event binding is invalid. Use Phaser's `pointerdown` event from the first line of input code. Set `canvas { touch-action: none }` in CSS. This must be correct before any tap-timing balance testing.

2. **Flower timer drift from delta-time accumulation** — floating-point accumulation over 120 seconds causes state transitions to drift ±50ms, making the game feel inconsistent. Use timestamp-based state derivation: store `spawnTimestamp = performance.now()`, compute `state = getStateForElapsed(now - spawnTimestamp)` as a pure function. Must be the architecture from day one — retrofitting is HIGH cost.

3. **GC spikes during Phase 3 from per-spawn object allocation** — creating and destroying Phaser GameObjects in the hot loop causes stop-the-world GC pauses of 30-100ms precisely during the game's most intense moment. Pre-create all 64 flower slots at game init; activate/deactivate instead of create/destroy. Pool score pop-up Text objects (8-10 is sufficient). Must be in place before Phase 3 performance testing.

4. **Canvas not scaled for device pixel ratio** — sprites appear blurry on all Retina and high-DPI Android devices. Set `resolution: window.devicePixelRatio` in Phaser config at game creation. Changing this later requires recalculating all coordinate systems. Must be set during project foundation.

5. **Mobile viewport scroll conflicts** — without `touch-action: none` on canvas and `position: fixed` on body, vertical swipes scroll the page instead of registering taps; Android browser chrome hide/show resizes the canvas. These CSS rules must be in place before any mobile UX testing.

6. **iOS AudioContext silence** — `AudioContext` created before user gesture is suspended on iOS Safari; all sound is silently absent on iPhone. Use a "Tap to Start" splash screen as the first scene to unlock audio before the game loop starts. Must be built alongside the first audio effects.

---

## Implications for Roadmap

Based on the dependency graph across all four research files, the build order is forced by architecture, not preference. The key constraint is that visual readability of flower states is a gameplay prerequisite (players cannot test timing if they cannot read states), and the entire tap-timing pipeline (FSM → input → score → combo) must be wired before any balance work is meaningful.

### Phase 1: Project Foundation

**Rationale:** Three pitfalls (DPR scaling, viewport scroll, touch-action CSS) must be resolved before any mobile testing is possible. Getting them right at foundation cost is LOW; retrofitting them costs MEDIUM-HIGH due to coordinate system and layout cascade. This phase has no game logic — it just makes the environment correct.
**Delivers:** Phaser 3 + TypeScript + Vite scaffold; canvas sized correctly for DPR; viewport locked against browser chrome; touch events non-passive and non-scrolling; FB SDK mock wired for local dev; "Tap to Start" splash for iOS audio unlock.
**Addresses:** Grid rendering surface (prerequisite for all subsequent phases)
**Avoids:** DPR blurriness (Pitfall 4), viewport scroll conflicts (Pitfall 7), iOS audio silence foundation (Pitfall 6), touch latency from wrong event binding (Pitfall 1)

### Phase 2: Core Game Logic (Pure, No Canvas)

**Rationale:** The architecture research explicitly maps a build order with Tier 1-2 components (FlowerFSM, Grid, ComboSystem, GameState, SpawnManager) as platform-independent pure logic. Building and unit-testing these before adding rendering prevents the worst anti-pattern: putting game logic in the renderer. Timer drift (Pitfall 5) must be architected here — timestamp-based derivation cannot be retrofitted.
**Delivers:** FlowerFSM with 5 states and timestamp-based timing; Grid (64 cells, spawn/clear helpers); ComboSystem with multiplier table; GameState (score, timer, phase); SpawnManager with phase config tables; all logic unit-testable without a browser.
**Implements:** FlowerFSM, Grid, ComboSystem, GameState, SpawnManager, flowerTypes data, difficultyPhases data
**Avoids:** Timer drift (Pitfall 5), mutable global state anti-pattern, hardcoded spawn rates that can't support 3 phases

### Phase 3: Renderer and Input Wiring

**Rationale:** Rendering depends on the logic tier being stable. Once FlowerFSM and Grid are correct, the Renderer is a read-only consumer of state — no mutation in the render pass. This phase wires InputHandler (translating canvas coords to grid tap events) and makes the game visually playable for the first time. Object pooling (Pitfall 2) must be implemented here — the pool architecture must exist before Phase 3 load testing.
**Delivers:** Phaser GameObjects for all 64 flower slots (pre-created, pooled); Renderer drawing from game state each frame; InputHandler translating `pointerdown` to `onTap(row, col)`; AnimationSystem with pooled score pop-ups and tap pulse effects; a playable (but un-timed) game loop.
**Uses:** Phaser 3 GameObjects, Phaser ScaleManager (DPR), Phaser Input Manager (pointerdown)
**Avoids:** GC spikes from missing object pool (Pitfall 2), logic-in-renderer anti-pattern, full canvas redraw performance trap (Pitfall 8)

### Phase 4: Session Loop and Scoring Pipeline

**Rationale:** With a stable renderer and input layer, the scoring pipeline (tap → FSM → combo → score → animation trigger) can be wired end-to-end. The 120-second timer, 3-phase escalation, and round lifecycle (start → play → end) are implemented here. This is the first phase where the complete game loop is playable and balance testing begins — which is why touch input correctness (Pitfall 1) must have been verified in Phase 1.
**Delivers:** Complete tap event pipeline (InputHandler → Grid → FlowerFSM.tap() → ComboSystem → GameState.applyScore() → AnimationSystem); 120-second countdown with phase transitions at 40s and 80s marks; parameterized SpawnManager phase switching; real-time score and combo HUD; game-over trigger on timer expiry.
**Implements:** Event-driven score pipeline (Architecture Pattern 3), Phase-based spawn controller (Architecture Pattern 4)
**Avoids:** Incorrect tap event binding (must verify `pointerdown` triggers balance test)

### Phase 5: Results Screen and Persistence

**Rationale:** Results screen and local highscore are a single dependency unit (FEATURES.md explicitly notes: implement both together). The storage layer must be abstracted at this point — `utils/storage.js` wrapping localStorage — to enable a clean FB Instant Games swap later. This phase completes the v1 MVP loop.
**Delivers:** ResultScene with final score, highscore comparison, and restart CTA; localStorage highscore abstracted behind StorageService; score count-up animation on results screen; Phaser scene transition from GameScene to ResultScene.
**Addresses:** Results screen + local highscore (table stakes feature)
**Avoids:** localStorage FB incompatibility (Pitfall — storage abstraction makes FB port low-cost instead of MEDIUM)

### Phase 6: Juice and Polish

**Rationale:** Juice elements are explicitly deferred until the mechanic they annotate is stable (FEATURES.md dependency rule: "never implement juice before the mechanic it annotates"). Phase 6 is the payoff phase — it upgrades a mechanically correct but flat game into something that feels good. Audio is implemented here with the iOS AudioContext unlock already in place from Phase 1's splash screen.
**Delivers:** Phase transition visual/audio cues; sound effects (tap, combo, wrong tap, phase change, game over); flower growth micro-animations (sprite sheet transitions); screen shake on wrong tap; wrong-tap first-play hint text; pause/menu button in HUD.
**Addresses:** All P2 features from FEATURES.md feature prioritization matrix
**Avoids:** iOS audio silence (Pitfall 6) — already mitigated by Phase 1 "Tap to Start" screen; audio implementation here just adds SFX

### Phase 7: Facebook Instant Games Integration (Post-v1)

**Rationale:** FB integration is an architectural swap, not a feature addition. The codebase was designed to support this (storage abstraction, no hardcoded DOM UI, no React layer). The async init order (Pitfall 3) must be implemented first — everything else fails if Phaser boots before `FBInstant.initializeAsync()` resolves. This phase is out of scope for v1 but the roadmap must account for it.
**Delivers:** FB SDK async init gate before Phaser boot; `FBInstant.setLoadingProgress()` wired to Phaser preload; StorageService routing to `FBInstant.player.setDataAsync()` in FB context; FB mock flow verified end-to-end.
**Avoids:** FB init order error (Pitfall 3), localStorage FB incompatibility, external CDN asset loading rejection

### Phase Ordering Rationale

- **Foundation before logic:** Three mobile pitfalls (DPR, viewport, touch-action) affect every subsequent mobile test session — they must be fixed at zero-cost, not retrofitted.
- **Logic before rendering:** The architecture research build order (Tier 1-4) explicitly requires FlowerFSM and Grid to be testable without a browser before the Renderer is added. This prevents logic creeping into rendering.
- **Object pools in Phase 3, not later:** GC spikes from missing pools are worst in Phase 3 (spawn wave) — the pool architecture must exist before any Phase 3 performance testing, which means it must exist before Phase 4 balance work.
- **Juice deferred to Phase 6:** FEATURES.md dependency rule is clear — juice without function is wasted work. Every juice element has a parent mechanic that must be stable first.
- **FB deferred to post-v1:** FB integration requires a different initialization order and storage routing. It's an isolated swap if the codebase is structured correctly from the start.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Renderer and Input):** Phaser 3 object pool patterns (Phaser.GameObjects.Group with `maxSize`, `createFromConfig`) should be researched at planning time — the pooling API is version-specific and getting it wrong requires rewriting all spawn callsites.
- **Phase 7 (FB Instant Games):** FB SDK async init patterns and `setLoadingProgress` integration with Phaser's preload lifecycle need verification against the current SDK version at integration time. Training knowledge is MEDIUM confidence only.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Phaser Scale config, DPR setup, CSS viewport rules are all well-documented stable patterns.
- **Phase 2 (Core Logic):** FlowerFSM, delta-time game loop, combo counter — canonical patterns from Game Programming Patterns (Nystrom) and Glenn Fiedler's "Fix Your Timestep." No research needed.
- **Phase 5 (Results + Persistence):** localStorage abstraction is a trivial wrapper pattern. ResultScene is a standard Phaser scene transition.
- **Phase 6 (Juice):** Audio unlock, Phaser tween API, screen shake are well-documented. If sound effects need authoring, that's an asset task, not a research task.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | All version numbers from training data (cutoff August 2025); no external verification possible during research. Verify Phaser latest stable and FB SDK version before pinning. Core technology choices (Phaser 3 + Vite + TS) are HIGH confidence — they are the community consensus. |
| Features | MEDIUM | Core feature set derived from PROJECT.md (PRIMARY source) + well-established casual game design patterns. Competitor analysis is training knowledge, not current App Store verification. The feature set for v1 is well-reasoned and internally consistent. |
| Architecture | MEDIUM | Architectural patterns (FSM, fixed-rate game loop, event-driven pipeline) are canonical — sourced from "Game Programming Patterns" (Nystrom) and Glenn Fiedler's timestep article. Pattern application to Phaser 3 specifically is training knowledge. No 2026 source verification. |
| Pitfalls | MEDIUM-HIGH | Touch event behavior, iOS AudioContext policy, canvas performance traps, DPR scaling — these are MDN-sourced and verified. FB Instant Games init order and localStorage gotchas are training knowledge (MEDIUM). The pitfalls listed are real and well-documented in the HTML5 game dev community. |

**Overall confidence:** MEDIUM

The core technology and architecture decisions are well-grounded in established patterns. The primary uncertainty is version numbers (Phaser, FB SDK) and FB-specific behavior that could not be verified against live documentation. These gaps are low-risk to address: verify versions before `npm install`, test FB SDK init flow with the mock file before submission.

### Gaps to Address

- **Phaser version:** Confirm latest stable at https://github.com/phaserjs/phaser/releases before pinning. Research used 3.87.x as latest known.
- **FB SDK version:** Confirm current SDK version at https://developers.facebook.com/docs/games/instant-games/guides/sdk-reference. Research used 7.1 as latest known.
- **FB bundle size limits:** Verify the 200KB initial payload limit is still current at https://developers.facebook.com/docs/games/instant-games/ — this constraint shapes all asset loading architecture.
- **Flower visual differentiation:** Research cannot validate that the planned 5 flower state sprites will be distinguishable at 375px-wide viewport (iPhone SE). Requires an actual visual prototype test on a physical device before committing to the art direction.
- **Phase timing balance:** The 40s/80s/120s phase boundaries and spawn rate deltas are design assumptions, not research findings. These must be validated through playtesting in Phase 4 — no external source can provide them.

---

## Sources

### Primary (HIGH confidence)
- `PROJECT.md` — project requirements, core mechanic decisions (combo, wrong-tap penalty, 3-phase arc)
- MDN Web Docs — Touch Events, Canvas Optimizing, Web Audio API best practices, Animation performance (verified via WebFetch 2026-03-13)
- "Game Programming Patterns" (Nystrom) — FSM pattern, game loop pattern (canonical reference)
- "Fix Your Timestep" (Glenn Fiedler, 2004) — fixed-rate game loop with delta-time accumulator (canonical reference)
- "Juice It Or Lose It" (Jonasson & Purho, GDC 2012) — game feel / juice principles (canonical for casual game design)
- Apple HIG — 44px minimum tap target standard (stable, training knowledge)

### Secondary (MEDIUM confidence)
- Phaser 3 ecosystem — training knowledge through August 2025 (versions, API, community patterns)
- Facebook Instant Games SDK v7.1 — training knowledge (init order, bundle constraints, storage API)
- Casual mobile game genre conventions — training knowledge (Cookie Clicker, Fruit Ninja, Tap Titans, Bejeweled Blitz patterns)
- Phaser 3 Vite template patterns — training knowledge (https://github.com/phaserjs/template-vite-ts not fetched, verify manually)

### Tertiary (LOW confidence — needs validation before implementation)
- FB SDK current version (7.1 as of training data cutoff — verify before FB port phase)
- FB initial payload limit (200KB figure — verify before FB port phase)
- Current Phaser stable version (3.87.x — verify at https://github.com/phaserjs/phaser/releases)

---

*Research completed: 2026-03-13*
*Ready for roadmap: yes*
