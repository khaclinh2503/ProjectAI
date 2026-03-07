# Project Research Summary

**Project:** Bloom Harvest
**Domain:** Casual mobile tap/timing game with collection, gacha, and garden meta-layer
**Researched:** 2026-03-07
**Confidence:** MEDIUM

---

## Executive Summary

Bloom Harvest is a casual mobile timing game where players tap flowers at the exact moment of peak bloom. The genre (tap/timing + collection) is well-understood: Piano Tiles, Tap Tap Revenge, and Magic Tiles established the core loop; Clash Royale and Pokemon GO proved that layering rarity-based collection on top of a simple mechanic is a durable retention engine. The recommended approach is to build Cocos Creator 3.8.x as the single codebase targeting iOS, Android, and Facebook Instant Games simultaneously — it is the only engine with mature first-class support for all three targets without a wrapper.

The critical design insight from research is that **the timing feel IS the product, not a feature**. The bloom-burst tap moment must be satisfying before any meta-system is added. Research consistently shows that casual players who bounce in the first 2 minutes never reach gacha, collections, or monetization. Every Phase 1 decision — from asset pipeline discipline to millisecond-based timing windows to particle juice — must serve getting that tap moment right. Layering currency, collection, and social features on top of a mediocre feel produces a mediocre game with monetization bolted on. Nail the tap, then monetize.

The top risks are: (1) FB Instant Games bundle size, which must be architected from Day 1 using Cocos Creator's Asset Bundle system — retrofitting this after content is built is expensive; (2) frame-rate-dependent timing logic, which will make the core loop feel inconsistent across the 30fps/60fps device range your actual audience uses; and (3) gacha rate compliance, which is a legal and store-rejection risk if rate tables are not config-driven with unit tests. All three risks are eliminable in Phase 1 if the foundation is set correctly before any content is produced.

---

## Key Findings

### Recommended Stack

Cocos Creator 3.8.x with TypeScript is the unambiguous engine choice. Unity WebGL builds are too large for the FB Instant Games 5 MB initial payload requirement. Phaser and PixiJS cannot produce native binaries. Godot's HTML5 export lacks a mature monetization plugin ecosystem. Cocos Creator's built-in animation, audio, UI, and asset bundle systems cover all MVP needs — no additional third-party game frameworks are needed.

For services: Google AdMob (via Cocos Service panel) for mobile ads; FB Instant SDK ads for the HTML5 build; Cocos Creator's built-in IAP service for native purchases; Firebase (Firestore + Remote Config + Analytics) as the lightweight backend. All SDK calls must be wrapped in platform adapter classes — no direct SDK imports in gameplay scripts.

**Core technologies:**
- **Cocos Creator 3.8.x**: Engine and cross-platform build pipeline — only engine with first-class iOS + Android + FB Instant in one TypeScript codebase
- **TypeScript 5.x** (bundled): Game logic language — strong typing prevents bugs in complex flower state machines; JS deprecated in Creator 3.x
- **FB Instant Games SDK 7.1**: Platform API for leaderboards, payments, sharing, ads on the HTML5 build — required by Facebook, no alternative
- **Google AdMob**: Rewarded and interstitial ads on native builds — highest fill rate for casual games in Southeast Asia
- **Firebase (JS SDK 10.x)**: Player sync, leaderboard backend, remote config for seasonal events, analytics — free Spark tier covers MVP scale
- **Cocos Creator Asset Bundle system**: Critical for splitting the 200 MB FB Instant budget; core bundle must stay under 5 MB initial payload
- **TexturePacker**: Sprite atlas generation — required to hit the target of less than 25 draw calls in the gameplay scene on low-end Android

**Do NOT use:** Physics engine (Box2D/Bullet — no gameplay use case), Spine (commercial license, bundle size not justified at MVP), Redux/MobX (web-framework patterns do not map to game loops), Facebook Audience Network directly (use via AdMob mediation instead).

**Versions to verify before project setup** (research used training data, not live docs):
- Cocos Creator latest stable (may be 3.9.x by March 2026)
- FB Instant Games SDK current version (was 7.1 as of mid-2025)
- AdMob Android/iOS SDK versions (LOW confidence — change frequently)

See `STACK.md` for full version matrix and verification URLs.

---

### Expected Features

The game divides cleanly into three layers: core loop (tap/timing), progression meta (collection/upgrade/gacha), and social/monetization. Each layer must be validated before the next is built.

**Must have (table stakes) — MVP blockers:**
- Responsive tap detection with sub-100ms feedback — any lag breaks the core mechanic
- Visual and audio hit feedback (particle burst, scale pop, SFX) on tap — this IS the product moment
- Clear timing window indicator via bloom animation — players must read the window without separate UI
- Score display and high score tracking — session-to-session motivation
- Miss/failure feedback (wilt animation + penalty) — required for the skill improvement loop
- Game over / session end screen with replay button — standard mobile game contract
- Campaign mode (10-15 levels minimum) and Endless mode — having only one halves retention
- Level difficulty progression — difficulty curve is the product roadmap for campaign
- Interactive tutorial — "tap at peak bloom" must be understood in under 30 seconds, no text walls
- Pause/resume, settings (sound/music toggle) — real life interrupts; missing = uninstalls
- Rewarded ads (continue after fail, double reward) — highest engagement ad placement for the genre

**Should have (competitive differentiators) — first update window:**
- Flower rarity system (Common / Rare / Epic / Legendary) with distinct visual treatment per tier
- Per-species bloom timing personality (roses forgiving/slow, cherry blossoms punishing/fast)
- Flower collection / Florarium view with locked slots visible for FOMO motivation
- Gacha / seed pack opening with pity system (required by Apple Guideline 3.1.1)
- Daily quests (3/day, reset at midnight) and login streak rewards
- Global leaderboard (FB Instant native API; Game Center or custom backend for native)
- Score sharing with deep link — low effort, meaningful virality for a timing game

**Defer to v2+:**
- Garden decoration system — High complexity, High reward; needs monetization cohort data before building
- Seasonal events — requires operational content calendar; plan before shipping, build after launch data
- Achievement system — nice-to-have, low urgency relative to collection and quests
- Flower upgrade system — needs collection data to balance; add after cohort analysis
- Friends leaderboard — requires social auth which varies by platform; defer until player base exists

**Deliberate anti-features (do not build in v1):**
- Real-time multiplayer PvP
- Energy/stamina gate (kills new user retention in the critical first week)
- Crafting/flower combination (cognitive overhead that contradicts the casual loop)
- In-game chat (moderation infrastructure + COPPA complexity)
- Subscription monetization (wrong model for casual timing games)

See `FEATURES.md` for full dependency graph and monetization pattern details.

---

### Architecture Approach

The recommended pattern is a layered Manager architecture with persistent singleton nodes surviving scene transitions, a central EventBus for decoupled system communication, and platform adapter classes isolating all external SDK calls. Scenes are thin shells that wire UI to manager APIs. The critical discipline: no gameplay script ever imports an SDK directly — all platform calls go through adapter classes that can be no-op stubs during development.

**Major components:**
1. **Boot Scene + Persistent Managers** — initializes all manager singletons as persistent root nodes; runs FB Instant init sequence before `startGameAsync()`; loads save data; then transitions to MainMenu
2. **CoreGameplayLoop** — owns round state machine (Idle → Countdown → Playing → RoundOver), tap validation against bloom windows, combo tracking; does NOT own ads, saves, or player data
3. **FlowerLifecycleSystem** — manages per-flower state machine (Bud → Bloom → Wilt) with millisecond-based timing; exposes bloom window as wall-clock timestamps, never frame counts
4. **ScoreSystem** — session score accumulator with rarity multipliers, timing quality bands (Perfect/Good/Miss), and combo multiplier; emits `ScoreEvent` consumed by UI and QuestSystem
5. **CollectionSystem + GachaEngine** — tracks unlocked species; executes gacha pulls from config-driven probability table; enforces pity system
6. **MonetizationSystem** — single entry point for all ads and IAP; owns ad readiness state, frequency cap logic, and IAP purchase validation flow; no ad SDK calls outside this system
7. **SaveSystem** — single async interface wrapping both `cc.sys.localStorage` (native) and `FBInstant.player.setDataAsync()` (HTML5); schema-versioned with migration functions; saves only on round end, scene transition, and app pause
8. **FBInstantAdapter / AdsAdapter / IAPAdapter** — platform adapter layer; all other systems call adapters; adapters can be null-implemented for development without live SDKs
9. **EventBus** — global pub/sub enabling QuestSystem and UIManager to react to gameplay events without direct coupling to game loop
10. **FlowerDatabase** — static config loaded from JSON assets; all flower species data (growth speed, bloom window, base points, animation keys) lives here, never hardcoded in scripts

**Scenes:** Boot, MainMenu, Gameplay, Collection, Garden (v2), Shop, Leaderboard.

**Key patterns:**
- Platform detection at startup selects FBInstantAdapter vs NullPlatformAdapter
- Node pooling for flowers (prevents GC spikes and listener churn)
- Additive scene loading for modal UI (gacha reveal, settings, round end) over current scene

See `ARCHITECTURE.md` for full data flow diagrams (session start, tap event, round end, gacha pull, save).

---

### Critical Pitfalls

Research identified 5 critical pitfalls (rewrites, store rejections, permanent churn) and 6 moderate pitfalls. The top 5 to address:

1. **FB Instant bundle exceeds initial payload limit** — Establish Asset Bundle architecture and a hard budget (initial payload under 5 MB, total under 100 MB with headroom) before any content is added. Audit bundle size at every milestone. Retrofitting asset bundling after 20 flower types are built is a multi-day rewrite. Address in Phase 1.

2. **Frame-rate-dependent timing logic** — Express ALL bloom windows as wall-clock millisecond timestamps (`bloomStart = Date.now() + growDuration`). Never use frame counts or `dt` accumulation for timing window boundaries. Test on a device matrix: high-end iOS, Snapdragon 680-class Android, and Chrome with 4x CPU throttle for FB Instant. Address in Phase 1 (core gameplay prototype).

3. **Save data corruption from dual write paths** — Design a single `SaveManager` abstract interface (both backends return Promises) before any feature saves data. One canonical JSON schema with a version field and migration function for every schema change. Local `localStorage` cache as fallback when FB's `getDataAsync` fails. Address in Phase 1 (foundation).

4. **Draw call explosion from per-flower sprites** — All flower states (bud, bloom, wilt) must share one or two texture atlases, not individual PNGs. Target under 25 draw calls in the gameplay scene. Use a pooled particle system for bloom bursts, not instantiated per-tap. Enforce atlas discipline in the asset pipeline spec before artists produce any content. Address in Phase 1 (asset pipeline setup).

5. **Gacha rate manipulation — legal and store rejection risk** — Store ALL probability tables in a single config JSON file read by both the draw function and the UI display. Write unit tests that (a) assert rates sum to 100% and (b) run 100,000 simulated draws and assert empirical distribution matches config within 1%. The in-game rate disclosure screen must be generated programmatically from the same config. Address when gacha is introduced; rate table config and tests are the first gacha deliverable.

**Additional pitfalls to track:**
- Missing juice on tap events: particle burst, screen shake, score popup animation are NOT polish — they ARE the product. Must ship with the first playable prototype.
- Interstitial ads after loss states: highest uninstall trigger in the genre. Interstitials only after win states or neutral transitions. Minimum 3 levels between triggers. Centralize all trigger logic in `MonetizationSystem`.
- Client-side only IAP receipt validation: trivially bypassable on Android. Use a Firebase Cloud Function to validate receipts server-side before granting items. One-day implementation, must be in place before IAP ships.

See `PITFALLS.md` for full prevention checklists and warning signs.

---

## Implications for Roadmap

Research from all four files converges on a clear build order driven by the dependency graph: lower infrastructure layers first, core timing feel validated before any meta-system, monetization last to avoid coupling it to gameplay design decisions.

### Phase 1: Foundation + Core Timing Loop

**Rationale:** The bloom timing mechanic is the product hypothesis. Validate it before anything else. All infrastructure decisions (save abstraction, asset bundle architecture, timing system) made here are locked in for the entire project — getting them wrong is the most expensive class of mistake.

**Delivers:** A playable prototype where a single flower blooms and the tap feels satisfying. All cross-cutting infrastructure is in place.

**Implements:**
- Boot scene + EventBus + FlowerDatabase (JSON config)
- SaveSystem abstract interface (local + FB Instant backends)
- FlowerLifecycleSystem with millisecond-based timing windows
- CoreGameplayLoop (single flower, Bud → Bloom → Wilt state machine)
- ScoreSystem (Perfect / Good / Miss bands, combo multiplier)
- Tap feedback juice layer: particle burst, screen shake, score popup animation, audio SFX
- Asset Bundle architecture established; initial payload budget enforced
- Platform orientation locked (portrait); FB Instant init sequence correct (init → load assets → setLoadingProgress → startGameAsync)
- Node pool pattern and `targetOff` lifecycle discipline established

**Avoids:** C-2 (frame-rate timing), C-3 (dual save path), C-4 (draw calls), M-1 (missing juice), m-3 (audio context), m-4 (orientation breakage), C-1 (bundle size, architecture set)

**Research flag:** Standard patterns — skip additional research. Cocos Creator timing and scene management are well-documented.

---

### Phase 2: Content + Game Modes

**Rationale:** Once the tap feel is validated, add variety (multiple flower species with distinct timing personalities) and structure (Campaign + Endless modes). This is where the game becomes a game, not just a prototype.

**Delivers:** A releasable core game loop with 3-5 flower species, 10-15 campaign levels, Endless mode, tutorial, settings, pause/resume.

**Implements:**
- 3-5 flower species with distinct `baseBloomDuration` and `bloomWindowFraction` values in FlowerDatabase
- Campaign level configs (flower slot layouts, species mix, unlock conditions)
- Endless mode (progressive speed increase)
- Interactive tutorial (first level: one flower, prompted tap, positive feedback)
- Pause/resume, settings screen (sound/music toggle)
- Game over / session end screen (score summary, replay)
- Interstitial ad integration via MonetizationSystem (win states only, 3-level gap minimum)

**Avoids:** M-2 (interstitial abuse — rules established here before any ad fires)

**Research flag:** Difficulty curve tuning (how fast to increase bloom speed in Endless, how to sequence species in Campaign) requires playtest data — flag for balancing iteration, not research.

---

### Phase 3: Progression Meta (Collection + Currency + Gacha)

**Rationale:** Once the core loop is fun, add the long-term retention engine. Collection and gacha are tightly coupled (rarity system feeds both) and must be built together. Economy model must be designed as a spreadsheet before implementation — tuning after launch is possible but expensive.

**Delivers:** Flower collection view (Florarium), 4-tier rarity system, gacha seed packs with pity system, soft/premium currency system, basic IAP (gem packs, starter bundle).

**Implements:**
- CollectionSystem (unlocked species registry, progression state)
- CurrencySystem (soft coins + premium gems ledger, persisted via SaveSystem)
- GachaEngine (config-driven probability table, pity counter, pull result animation)
- Gacha rate config unit tests (sum to 100%, empirical distribution test)
- IAPAdapter + MonetizationSystem IAP flow
- Server-side IAP receipt validation (Firebase Cloud Function)
- Collection / Florarium scene
- Shop scene (gem packs, starter bundle shown days 1-3)
- Rewarded ads (continue after fail in Endless, double harvest reward)

**Avoids:** C-5 (gacha rate manipulation), M-3 (client-side IAP), M-4 (economy miscalibration — requires economy spreadsheet before implementation)

**Research flag:** Apple Guideline 3.1.1 (gacha/loot box disclosure) and Google Play random reward policy must be verified against current wording before gacha ships. Training data covers through Aug 2025 — policies may have updated.

---

### Phase 4: Engagement Loops (Quests + Social)

**Rationale:** Daily return habit is established by quests and streaks. Leaderboard adds competitive motivation. Both depend on the EventBus infrastructure from Phase 1 and the collection/currency infrastructure from Phase 3.

**Delivers:** Daily quests (3/day), login streak rewards, global leaderboard, score sharing.

**Implements:**
- QuestSystem (daily quest state, reset timer, reward distribution via CurrencySystem)
- Achievement system (permanent long-term goals)
- Login streak tracking + escalating rewards
- LeaderboardSystem + FB Instant leaderboard API integration
- Score sharing (screenshot-ready end screen + deep link)
- Leaderboard scene

**Avoids:** m-2 (score spoofing — add server-side plausibility check on score submission)

**Research flag:** FB Instant leaderboard API behavior (caching, rate limits) — verify against current FB Instant SDK docs. Also: friends leaderboard requires social auth which behaves differently on iOS/Android vs FB Instant; may need to scope to global-only for v1.

---

### Phase 5: Polish, Performance, and Platform Compliance

**Rationale:** This phase catches everything that was deferred for speed and prepares the game for store submission. Performance must be verified on actual low-end target devices before submission, not assumed from development machines.

**Delivers:** Store-ready builds for iOS, Android, and FB Instant Games.

**Implements:**
- Texture atlas audit (all flower states in shared atlases, draw call target under 25)
- FB Instant Games file size audit (initial payload under 5 MB, total under 100 MB)
- Memory profiler run after 10-minute gameplay session (check for listener leaks)
- Device matrix performance test (Snapdragon 680-class Android, iPhone SE-class iOS)
- FB Instant init sequence audit (setLoadingProgress called, startGameAsync after assets ready)
- Haptic feedback on native tap events
- Audio context unlock on iOS Safari / FB Instant WebView verified
- App store submission metadata, privacy policy, loot box odds disclosure screen

**Research flag:** App store submission requirements (privacy nutrition labels, ATT prompt for AdMob on iOS) — verify current requirements at time of submission. These change frequently.

---

### Phase 6 (Post-launch): Garden Decoration + Seasonal Events

**Rationale:** Deferred to post-launch because (1) garden is high complexity / high cost to build without knowing which player segments will spend, and (2) seasonal events require an operational content calendar that can only be planned after you know your player retention shape. Both need launch data to scope correctly.

**Delivers:** Garden decoration system (IAP-driven cosmetic meta-layer) and seasonal event infrastructure (remote-config-driven limited flowers + event leaderboards).

**Implements:**
- GardenSystem (placement, decoration catalog, garden scene)
- Firebase Remote Config for event parameters (start/end dates, featured flower IDs, reward multipliers)
- Seasonal flower pool (extends CollectionSystem)
- Event leaderboard (extends LeaderboardSystem)
- Upgrade system (per-species stat improvements)

**Avoids:** m-5 (seasonal event dates baked into build — Remote Config must be the mechanism)

**Research flag:** Garden UX (drag-to-place, snap grid, item management) is a design research area with established patterns but needs UX prototyping. Seasonal event operational workflow (content calendar, QA pipeline) is an organizational pattern, not a code pattern — plan the process before building the system.

---

### Phase Ordering Rationale

- **EventBus before everything** — every system emits or listens; it has no dependencies of its own
- **SaveSystem before any feature that saves state** — retrofitting a unified save abstraction is the most painful cross-cutting refactor in a Cocos Creator game
- **Asset Bundle architecture before any art assets** — splitting bundles after content is built requires reworking all asset references
- **Core timing feel before meta systems** — players who bounce in the first 2 minutes never reach gacha; validating the feel first is not optional
- **Currency system before collection/gacha** — both depend on it; building them without a currency abstraction creates hard coupling
- **MonetizationSystem shell before any ad placement** — centralizing trigger logic before the first ad fires prevents the scattered-trigger anti-pattern
- **Gacha economy spreadsheet before gacha code** — the rates are a game design deliverable, not a code deliverable; the code just reads the config

### Research Flags Summary

| Phase | Research Needed | Reason |
|-------|----------------|--------|
| Phase 3 | Apple/Google gacha policy | Training data through Aug 2025; policies change; verify before shipping gacha |
| Phase 4 | FB Instant leaderboard API specifics | Rate limits, caching behavior; verify against current SDK docs |
| Phase 5 | iOS ATT prompt + AdMob interaction | ATT requirements change; verify at submission time |
| Phase 6 | Garden UX patterns | UX prototyping needed; not purely a code problem |
| All | Cocos Creator 3.9.x changes | A newer version may exist by project start; verify API changes |

**Phases with standard patterns (no research needed):**
- Phase 1: Cocos Creator scene management and timing systems are extensively documented and stable
- Phase 2: Campaign/endless game mode structure is a well-established casual game pattern
- Phase 5: Performance profiling workflow in Cocos Creator is standard and well-documented

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Core engine choice is HIGH confidence. SDK version numbers (AdMob, FB Instant, Firebase) are MEDIUM-LOW; WebSearch unavailable during research; verify all versions at project kickoff |
| Features | MEDIUM | Genre patterns from training data are well-established; IAP pricing tiers and ad frequency caps are community-standard figures that should be verified against 2026 analytics reports |
| Architecture | MEDIUM | Manager/singleton/adapter patterns for Cocos Creator are stable and widely used; specific API names (cc.director, cc.sys.localStorage) should be verified against the Creator version installed |
| Pitfalls | HIGH for engineering patterns; MEDIUM for policy compliance | Frame-rate timing, memory leaks, draw calls, save abstraction — HIGH confidence (engine fundamentals). Gacha policy wording, store submission requirements — MEDIUM; must be verified against live guidelines before shipping |

**Overall confidence:** MEDIUM — Sufficient to begin development. The core architectural decisions are sound. The items flagged for live verification (SDK versions, gacha policy, store requirements) are all pre-ship verification tasks, not blockers to starting Phase 1.

### Gaps to Address

- **Cocos Creator exact version**: Check https://www.cocos.com/en/creator at project kickoff. A 3.9.x may exist. If so, audit breaking changes from 3.8.x before committing.
- **FB Instant Games SDK current version and bundle limit**: Verify at https://developers.facebook.com/docs/games/instant-games/sdk. The 5 MB initial payload threshold is community-documented, not an officially published hard limit — test empirically.
- **Apple App Store Guideline 3.1.1 current wording on gacha/loot boxes**: Check https://developer.apple.com/app-store/review/guidelines/ before gacha feature is designed. Requirements have evolved and may have updated since Aug 2025.
- **Google Play random reward policy**: Check https://play.google.com/about/monetization-ads/ — same concern as Apple.
- **Economy balance model**: No playtest data exists yet. The unlock timeline targets (Common 100% at 2-3 weeks, Rare 80% at 1-2 months) are industry benchmarks, not validated for this specific game. Build the economy spreadsheet in Phase 3 and validate with external playtesters before the gacha ships.
- **AdMob SDK versions**: LOW confidence on specific version numbers; verify at https://developers.google.com/admob before native integration.
- **Device matrix for performance testing**: Research assumed Snapdragon 680-class as the mid-range Android target. Verify this is representative of the actual SEA casual market device distribution in 2026 before setting performance targets.

---

## Sources

### Primary (HIGH confidence — stable engineering patterns)
- Cocos Creator 3.x official documentation (training knowledge through Aug 2025): scene management, persistent root nodes, asset bundle system, audio system, memory management — https://docs.cocos.com/creator/manual/en/
- Frame-rate-independent timing: fundamental game development principle verified across multiple engine ecosystems
- Save system dual-path pattern: well-established cross-platform pattern, both localStorage and FB Instant Data API are stable

### Secondary (MEDIUM confidence — training data, patterns may have updated)
- FB Instant Games SDK documentation (training knowledge): initialization sequence, leaderboard API, payments API, bundle constraints — https://developers.facebook.com/docs/games/instant-games
- Firebase SDK 10.x documentation (training knowledge): Firestore, Remote Config, Analytics — https://firebase.google.com/docs
- Casual mobile game design patterns: Fruit Ninja, Piano Tiles, Tap Tap, Magic Tiles (timing loop); Pokemon GO, Clash Royale, Gardenscapes (collection/gacha meta)
- IAP pricing tiers: standard casual mobile benchmarks circa 2024-2025 — verify against current analytics
- Apple App Store Review Guidelines 3.1.1 (gacha odds disclosure): verified as of Aug 2025

### Tertiary (LOW confidence — version numbers, market data)
- Google AdMob Android SDK 23.x / iOS SDK 11.x — version numbers change frequently; verify at https://developers.google.com/admob
- TexturePacker 7.x — verify at https://www.codeandweb.com/texturepacker
- SEA device market distribution (Snapdragon 680-class as mid-range proxy): verify with current market share data before performance target-setting
- Casual mobile retention benchmarks (D1, D7, D30): industry-standard figures from Adjust/AppsFlyer/GameAnalytics circa 2024-2025

---
*Research completed: 2026-03-07*
*Ready for roadmap: yes*
