# Domain Pitfalls: Bloom Harvest

**Domain:** Casual mobile timing game — Cocos Creator, FB Instant Games, Gacha, Ads+IAP
**Researched:** 2026-03-07
**Confidence note:** WebSearch and WebFetch tools unavailable. All findings from training knowledge (cutoff Aug 2025). Confidence levels reflect source quality and specificity. Flag marked items for live verification before implementation.

---

## Critical Pitfalls

Mistakes that cause rewrites, store rejections, or permanent player churn.

---

### Pitfall C-1: FB Instant Games Bundle Exceeds Initial Load Limit

**What goes wrong:** Facebook Instant Games enforces a ~200MB total bundle cap, but more critically, it enforces an *initial payload* size that must download before the game is playable. If this initial payload is too large (community-documented threshold is roughly 5–20MB for the first render frame), the game's "loading screen" time spills past the point where Facebook kills the session or the user quits. Developers pack all atlas sheets and audio into one bundle, exceed the threshold, and see 60–80% drop-off before first interaction.

**Why it happens:** Cocos Creator's default build outputs a single `main.js` + bundled assets. Teams build for mobile first (where asset streaming is natural) and then flatten everything into the FB Instant build without auditing what loads synchronously.

**Consequences:** Unplayable on slow mobile connections. Facebook may flag the game during review. Effective user acquisition cost skyrockets because most paid installs never reach the game loop.

**Prevention:**
- Audit the FB Instant build with `wc -c` or bundle analyzer before each milestone. Set a hard budget: initial payload ≤ 5MB, full bundle ≤ 100MB (leave headroom below the 200MB cap for future content).
- Use Cocos Creator's Asset Bundle system (`cc.assetManager.loadBundle`) to split assets: core game bundle (minimal) + flower atlas bundles (lazy-loaded per rarity tier) + audio bundle (load after first interaction).
- Compress all textures with ETC2/ASTC for mobile; for WebGL (FB Instant), use WebP atlases.
- Strip audio to mono, 44.1kHz, OGG for web; do not embed uncompressed WAV files.

**Warning signs:**
- FB Instant build zip exceeds 50MB and you haven't started lazy loading yet.
- First meaningful paint on a 4G connection takes more than 3 seconds in Chrome DevTools throttled mode.
- `main.js` minified size exceeds 2MB.

**Phase to address:** Phase 1 (project setup) — establish bundle budget and Asset Bundle architecture before any content is added. Retrofitting this after 20 flower types are built is extremely painful.

---

### Pitfall C-2: Timing Input Feels Wrong Due to Frame-Rate-Dependent Logic

**What goes wrong:** The flower bloom window (the "nở bung" moment) is calculated against frame count or `dt` accumulated incorrectly. On 30fps devices (low-end Android) the window feels wider/different than on 60fps devices. On FB Instant (WebGL, variable fps) it feels completely different again. Players complain the tap timing is "unfair" and churn immediately — this is a death sentence for a timing game.

**Why it happens:** `schedule` callbacks with `dt` accumulation drift under frame drops. Developers test on flagship devices and never test on a Xiaomi Redmi or an FB Instant tab. The bloom window is expressed as a frame range rather than a wall-clock millisecond range.

**Consequences:** Core loop feels broken to the majority of your actual users (casual players on mid-to-low-end Android). Impossible to tune difficulty because the numbers mean different things on different devices.

**Prevention:**
- Express ALL timing windows in **wall-clock milliseconds** using `Date.now()` or Cocos Creator's `cc.director.getTotalTime()`, never in frame counts.
- The bloom window start/end timestamps are set at spawn time: `bloomStart = Date.now() + growDuration`, `bloomEnd = bloomStart + windowDurationMs`. Tap validity is: `now >= bloomStart && now <= bloomEnd`.
- Test on a device profile matrix: high-end iOS, mid-range Android (Snapdragon 680-class), and FB Instant in Chrome with CPU 4x throttle.
- Lock the game to 60fps target on native with graceful degradation; never let physics/timer logic couple to render fps.

**Warning signs:**
- Timing code contains `this._frameCount++` comparisons.
- Bloom window feels different when you run the same level twice with different device loads.
- The word "frame" appears in any timing comment in the core gameplay code.

**Phase to address:** Phase 1 (core gameplay loop prototype). Establish the millisecond-based timing contract before any other gameplay system is built on top of it.

---

### Pitfall C-3: Save Data Corruption From Dual Write Paths (Native vs FB Instant)

**What goes wrong:** Cocos Creator native mobile uses `cc.sys.localStorage` (backed by device storage). FB Instant Games has its own `FBInstant.player.setDataAsync()` / `getDataAsync()` API. Teams implement two separate save code paths, introduce subtle differences in data shape, and then a player switches between platforms (e.g., plays on FB Instant first, then installs the Android app) and their progress corrupts or resets.

**Why it happens:** Save system is added "later" without designing a platform abstraction. FB Instant data is async (Promise-based); `localStorage` is sync. The different mental model causes bugs when one code path gets a feature the other doesn't.

**Consequences:** Player loses gacha-acquired rare flowers. IAP purchases vanish. Negative reviews citing "game deleted my progress." Potential refund disputes on IAPs. This is legally and reputationally serious.

**Prevention:**
- Design a `SaveManager` abstraction in Phase 1 that wraps both backends behind a single async interface: `saveManager.save(data)` and `saveManager.load()`. Both return Promises regardless of platform.
- Platform detection: `cc.sys.platform === cc.sys.WECHAT_GAME` / check for `FBInstant` global presence. Route to the correct backend transparently.
- Define ONE canonical save schema (JSON) with a version field. Write a migration function for every schema change.
- On FB Instant, also write a local `localStorage` cache as fallback for when `getDataAsync` fails (network issues are common on mobile web).
- Test save/load on both platforms in CI before every release.

**Warning signs:**
- `localStorage.setItem` appears outside of a `SaveManager` class.
- Save functions have `if (isFBInstant)` branches scattered across multiple files.
- No save data version field in the schema.

**Phase to address:** Phase 1 (project foundation). This is a cross-cutting concern; the abstraction must exist before any feature saves data.

---

### Pitfall C-4: Draw Call Explosion From Per-Flower Sprite + Effect Stacking

**What goes wrong:** Each flower has a sprite, a particle effect (bloom burst), a shadow, and a rarity glow — each potentially a separate draw call. With 8–12 flowers on screen plus UI, a garden decoration layer, and a background, the game easily hits 80–120 draw calls per frame. Low-end Android (GPU-limited) drops to 20fps. The game lags exactly at the moment the player needs precision timing — catastrophic for a timing game.

**Why it happens:** Assets are designed individually without a shared atlas strategy. Particle effects use default settings (overdraw-heavy). Each flower type has its own texture rather than being part of a shared sprite sheet.

**Consequences:** Unplayable on the 40% of your casual audience using low-end Android. App store ratings crater ("game is laggy"). The problem is invisible during development on a MacBook.

**Prevention:**
- All flowers (all states: bud, bloom, wilt) must be in **one or two shared texture atlases**, not individual textures. Use Cocos Creator's Auto Atlas or TexturePacker.
- Target ≤ 25 draw calls for the main gameplay scene. Profile in Cocos Creator's profiler from Day 1.
- Bloom burst: use a **single shared particle system** that is pooled and repositioned on tap, not spawned per flower.
- Rarity glow: implement as a tinted sprite or shader uniform on the flower sprite itself — not a separate overlay node.
- Garden decoration objects must share a separate atlas. Never mix decoration and gameplay atlases (they update at different frequencies).
- Use `cc.Sprite.SizeMode.TRIMMED` and enable packing in atlas settings.

**Warning signs:**
- Cocos Creator profiler shows draw calls > 40 in the gameplay scene.
- Each flower type is a separate `.png` file in the assets folder.
- Particle systems are created with `cc.instantiate` inside a per-tap handler.

**Phase to address:** Phase 1 (asset pipeline setup). Enforce atlas discipline in the asset pipeline spec before artists produce content. Retrofitting atlases after 30 flower types are individually textured is a multi-day task.

---

### Pitfall C-5: Gacha Rate Manipulation Causes Store Rejection or Legal Issues

**What goes wrong:** The gacha pull rates displayed to the player ("5% chance of Legendary") don't match the actual implemented probabilities. Alternatively, rates are changed server-side without updating the displayed table. In certain jurisdictions (Japan, South Korea, parts of EU, and increasingly in US states) this is illegal. Apple App Store Review Guideline 3.1.1 requires disclosure of gacha odds; Google Play requires display of item probabilities. Violating this gets the app removed.

**Why it happens:** Rates are hardcoded as magic numbers spread across the codebase. A "balance pass" changes the numbers but not the UI strings. No automated test verifies that displayed rates sum to 100% and match the draw function.

**Consequences:** Store removal. Refund demands. Class-action litigation risk (documented cases in mobile gaming). Reputational destruction in communities that track this (gacha players actively test rates).

**Prevention:**
- Store ALL gacha rate tables in a **single config data file** (JSON/SO), not hardcoded. The UI reads from the same config that the draw function reads. One source of truth.
- Write a unit test that: (a) sums all rates in the config and asserts they equal 100%, (b) runs 100,000 simulated draws and asserts the empirical distribution matches the config within a 1% margin.
- The in-game rate display screen must be generated programmatically from the config, never written manually in UI text fields.
- Implement **pity system** (guaranteed Legendary after N pulls) and expose that rule in the displayed UI.
- Before any gacha feature ships, review Apple Guideline 3.1.1 and current Google Play policy. Flag for legal review if targeting JP/KR markets.

**Warning signs:**
- Gacha rates are defined as float literals in a switch statement or if-chain.
- "Display the rates" is a task separate from "implement the rates."
- No unit test covers the gacha draw function.

**Phase to address:** Phase 2 or whichever phase introduces gacha. Rate table config and its tests must be the first gacha deliverable.

---

## Moderate Pitfalls

Mistakes that cause significant rework or player friction but are recoverable.

---

### Pitfall M-1: Missing "Juice" Makes Perfect Timing Feel Underwhelming

**What goes wrong:** The core loop (tap at bloom peak) is mechanically correct but feels flat. Numbers pop up, a score increments, next flower appears. Players don't feel the satisfying "pop" that the game's core value proposition promises. Retention at Day 1 is below 30% despite the mechanic being balanced correctly.

**Why it happens:** Teams prioritize getting mechanics working and leave "juice" for polish phase. In a timing game, juice IS the core product — it's not polish, it's the value. The "polish phase" never arrives before launch.

**Prevention:**
- Define a juice checklist before Phase 1 gameplay is called "done":
  - Screen shake (0.05–0.1s, small amplitude) on Perfect tap
  - Particle burst calibrated to rarity (Common = 8 particles, Legendary = 40+ particles)
  - Screen flash (white, 2–3 frames, rarity-tinted) on Perfect
  - Score popup that scales up then fades, with color-coded by timing accuracy
  - Sound effect layering: tap SFX + bloom SFX + rarity jingle (for Epic/Legendary)
  - Camera zoom-in micro-pulse (scale 1.0 → 1.02 → 1.0 over 4 frames) on Perfect
- All juice elements must be implemented in the **first playable prototype**, not after.
- Budget: at minimum 3 distinct "Perfect tap" feedback layers before calling the prototype done.

**Warning signs:**
- The word "polish" is used to defer any feedback implementation.
- Playtests produce the feedback "it works but doesn't feel satisfying."
- Score popup is a plain white label with no animation.

**Phase to address:** Phase 1 (first playable prototype). Juice must ship with the mechanic, not after.

---

### Pitfall M-2: Interstitial Ads Shown at Wrong Moments Cause Immediate Uninstalls

**What goes wrong:** An interstitial ad fires immediately after a failed level ("you lost, here's a 30-second ad"). The player was already frustrated by losing and now cannot retry without watching an ad. This pattern has the highest uninstall trigger rate of any ad placement pattern documented in mobile analytics.

**Why it happens:** Ad SDK integration is done by a developer who maps "level end" events to ad triggers without understanding player emotional state. The SDK default examples show ads on level completion regardless of outcome.

**Prevention:**
- Interstitials ONLY after win states or neutral transitions (returning to main menu by choice). NEVER after a loss.
- Minimum 3 levels between interstitial triggers (not 1:1 with level completions).
- On FB Instant, rewarded ads must use `FBInstant.getInterstitialAdAsync` and `FBInstant.getRewardedVideoAsync` correctly — they are different APIs with different caching behaviors. Pre-load ads during loading screens.
- Build an `AdManager` that centralizes all trigger logic. No ad SDK call should exist outside `AdManager`.
- Test the full "lose → retry" flow explicitly in QA checklist to confirm no ad fires.

**Warning signs:**
- Ad trigger calls are scattered across multiple scene scripts.
- The QA checklist doesn't include ad trigger verification for each game state.
- "Show ad on level end" is the implementation without loss/win distinction.

**Phase to address:** Phase where monetization is introduced. Establish `AdManager` with trigger rules before connecting any ad SDK.

---

### Pitfall M-3: IAP Receipt Validation Done Client-Side Only

**What goes wrong:** IAP purchases are validated by checking the device's response directly in game code. On Android, this is trivially bypassable (modified APK, Lucky Patcher, etc.). Players get premium currency or rare flowers without paying. Economy is flooded. Honest paying players feel cheated. Revenue per paying user collapses.

**Why it happens:** "We'll add server validation later." Later never comes, or the game launches before the backend is ready.

**Prevention:**
- Even for a casual game: validate receipts server-side using Apple's `/verifyReceipt` endpoint and Google Play's `purchases.products.get` API. This requires a minimal backend (a single cloud function is sufficient).
- For FB Instant, use `FBInstant.payments.purchaseAsync()` and validate the signed purchase payload against Facebook's payment API before granting items.
- The flow: client receives purchase receipt → sends to your server → server validates with platform API → server grants item → server returns confirmation → client reflects item grant.
- If full backend is out of scope for MVP, use a Firebase Cloud Function as the validator. This is a 1-day implementation, not a full backend project.

**Warning signs:**
- IAP grant logic (`player.addCurrency(amount)`) is called directly in the `onPurchaseComplete` callback.
- No backend endpoint exists for purchase validation.
- The team says "we'll add server validation when we have a server."

**Phase to address:** Phase where IAP is introduced. Receipt validation infrastructure must be the first IAP deliverable, not the last.

---

### Pitfall M-4: Flower Collection Balance — Early Unlock Saturation Kills Long-Term Retention

**What goes wrong:** Players unlock 60% of all flower types in the first week through normal gameplay + free gacha currency. The collection feels complete too soon. There's no reason to return. D7 retention collapses.

**Why it happens:** Unlock rates are tuned during development by developers who play the game 6–8 hours per day. What feels "slow" to the developer is "instant" for a casual player playing 15 minutes per day. The economy is not modeled from the player's perspective.

**Prevention:**
- Model the unlock economy as a spreadsheet before implementation. Define: expected daily play sessions (2–3), session length (10–15 min), free currency earned per session, gacha cost per pull, pull pool size per rarity tier. Calculate expected time to collect 50% / 80% / 100% of Common tier.
- Target: Common 100% at 2–3 weeks of daily play, Rare 80% at 1–2 months, Epic 50% at 3+ months, Legendary open-ended.
- Seasonal flowers should be permanently unavailable outside their event window — this creates FOMO-driven urgency and reactivation.
- After modeling, implement the economy, then playtest against the model.

**Warning signs:**
- No economy spreadsheet exists.
- "We'll tune the rates after launch" is the plan.
- Developer playtesters have unlocked most content within 3 days of development testing.

**Phase to address:** Phase 2 (gacha + collection system). Economy model must be completed before the gacha system is implemented.

---

### Pitfall M-5: Cocos Creator Memory Leaks From Undestroyed Event Listeners

**What goes wrong:** Components register event listeners (`this.node.on(...)`, `cc.game.on(...)`, `cc.director.on(...)`) but never call the matching `off()` in `onDestroy`. In a scene with dozens of flower nodes being spawned and destroyed, this accumulates thousands of orphaned listeners. Memory spikes. The game crashes on low-RAM devices (1–2GB RAM, still 25%+ of casual mobile audience) after 10–15 minutes.

**Why it happens:** Cocos Creator does not automatically remove event listeners when a node is destroyed (unlike some other engines). This is documented but commonly missed. The leak is invisible in short test sessions.

**Prevention:**
- Enforce a code review rule: every `this.node.on(...)` must have a corresponding `this.node.off(...)` or `this.node.targetOff(this)` in `onDestroy`.
- Prefer `node.on(event, handler, this)` with the `this` context argument — this enables `node.targetOff(this)` to bulk-remove all listeners from that context.
- Use Cocos Creator's built-in memory profiler (or the Chrome DevTools memory tab for FB Instant) after 5 minutes of gameplay to check for heap growth.
- Node pooling (`cc.NodePool`) for flowers prevents repeated instantiate/destroy cycles, reducing GC pressure and listener churn.
- Write a test scene that spawns and destroys 100 flowers in sequence and measures memory before/after.

**Warning signs:**
- `onDestroy` methods are missing or empty in flower/effect components.
- Memory usage climbs steadily during a 10-minute play session (visible in profiler).
- Crashes reported only after "playing for a while," not at launch.

**Phase to address:** Phase 1 (core gameplay loop). Establish the node lifecycle pattern (spawn from pool, register with context, targetOff in onDestroy) before flower variety is introduced.

---

### Pitfall M-6: FB Instant FBInstant.startGameAsync() Called Before Assets Ready

**What goes wrong:** `FBInstant.startGameAsync()` is called too early (in `onLoad` of the first scene) before textures and audio are loaded. Facebook's loading screen disappears, but the player sees a blank or partially-rendered game. On slow connections, this window lasts 5–15 seconds. Facebook's policy requires the game to be in a "playable state" when `startGameAsync()` resolves — policy violations can result in removal.

**Why it happens:** The FB Instant SDK's "call `startGameAsync()` early" example in their quick-start guide is misleading for asset-heavy games. Developers follow the example.

**Prevention:**
- Call `FBInstant.initializeAsync()` first, then load all critical assets, THEN call `FBInstant.startGameAsync()`.
- Use `FBInstant.setLoadingProgress(n)` (0–100) during asset loading to give Facebook a real progress signal — this improves Facebook's loading UX and reduces perceived wait time.
- The asset loading that must complete before `startGameAsync()`: all UI sprites, the main game scene's atlas, the first level's flower data, core audio (tap SFX, background music start).
- Lazy-load everything else (rarity-specific effects, decoration assets, audio variants) after the player reaches the main menu.

**Warning signs:**
- `startGameAsync()` is called in the first script's `onLoad` or `start`.
- `setLoadingProgress()` is never called (Facebook sees 0% until done).
- Flower effects or audio are missing during the first 30 seconds of play on slow connections.

**Phase to address:** Phase 1 (FB Instant platform integration setup).

---

## Minor Pitfalls

Issues that cause friction but are straightforward to fix if caught early.

---

### Pitfall m-1: Haptic Feedback Missing on Tap Events (Native)

**What goes wrong:** The timing game has no haptic feedback on iOS/Android. The "satisfying pop" of a perfect tap is half as satisfying without vibration. Competitor analysis of top casual timing games shows all use haptics.

**Prevention:** Use Cocos Creator's `cc.sys.vibrate()` (basic vibration) or native plugin for pattern-based haptics. Implement in the same phase as the juice layer. Budget: 1 day.

**Phase to address:** Phase 1 (juice layer, alongside particle effects).

---

### Pitfall m-2: Leaderboard Score Spoofing Without Server Validation

**What goes wrong:** Score is submitted client-side. Players submit scores of 999,999,999. Legitimate players see the leaderboard is broken and stop engaging with it.

**Prevention:** Implement server-side score plausibility validation (max score per session based on level duration × max multiplier). For FB Instant, use `FBInstant.updateAsync()` for leaderboards, which has Facebook-level identity binding (harder to spoof than anonymous endpoints), but still add plausibility checks server-side.

**Phase to address:** Phase where social/leaderboard is introduced.

---

### Pitfall m-3: Audio Context Blocked on iOS Safari / FB Instant WebView

**What goes wrong:** iOS WebView (and Safari) requires a user gesture to unlock the Web Audio API. Background music and SFX are silent until the first tap. Players think the game has no audio, toggle device volume, complain in reviews.

**Prevention:** In the FB Instant build, initiate audio context unlock on the first `touchstart` or tap event. Cocos Creator's audio system handles this in newer versions (3.x), but verify this is working on iOS Safari specifically. Show a "Tap to Start" screen if needed — this serves dual purpose of audio unlock and game start intention signal.

**Phase to address:** Phase 1 (FB Instant platform integration).

---

### Pitfall m-4: Portrait/Landscape Layout Not Locked Causes UI Breakage

**What goes wrong:** Player rotates phone mid-session. The garden layout (designed for portrait) breaks in landscape. Flower positions are hardcoded in Canvas coordinates. UI elements overlap.

**Prevention:** Lock orientation in both the Cocos Creator project settings and the native platform manifests (`AndroidManifest.xml`: `screenOrientation="portrait"`; iOS: disable landscape in Xcode capabilities). FB Instant games: call `FBInstant.setOrientationAsync('PORTRAIT')` in initialization. Do this on Day 1, not when it's reported as a bug.

**Phase to address:** Phase 1 (project setup).

---

### Pitfall m-5: Seasonal Event Data Baked Into Build Instead of Remote Config

**What goes wrong:** Seasonal flower data, event dates, and event rewards are hardcoded in the build. Running an event requires a new app submission. Apple review takes 1–3 days. An event you wanted to start on Valentine's Day starts on February 16th.

**Prevention:** Use remote config (Firebase Remote Config is free tier sufficient) for: event start/end dates, featured flower IDs for the event, event reward multipliers, banner image URLs. The game fetches this at startup. Content is deployed without a new build.

**Phase to address:** Phase where seasonal events are designed. Remote config infrastructure should be established before the first event is implemented.

---

## Phase-Specific Warning Summary

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Project setup | FB Instant file size bomb, orientation not locked, save abstraction missing | Establish budgets, locks, and abstractions before any content |
| Core timing mechanic | Frame-rate-dependent timing, no juice on tap | Millisecond-only timing, juice checklist as acceptance criteria |
| Asset pipeline | Draw call explosion, atlas discipline | Enforce shared atlases and profiler targets from first asset |
| Node lifecycle | Memory leaks from orphaned listeners | Node pool + targetOff pattern, profiler after 5-min session |
| FB Instant integration | startGameAsync timing, audio unlock, loading progress | Follow correct init sequence; test on iOS Safari |
| Gacha system | Rate manipulation (legal), economy miscalibration | Config-driven rates + unit tests + economy spreadsheet first |
| Monetization | Interstitial abuse, client-side IAP, score spoofing | AdManager trigger rules, server validation from day one |
| Social / leaderboards | Score spoofing | Server-side plausibility check |
| Seasonal events | Hardcoded event dates requiring new builds | Remote config for all event parameters |

---

## Confidence Assessment

| Pitfall Area | Confidence | Basis |
|--------------|------------|-------|
| FB Instant file size / init sequence | MEDIUM | Training knowledge of FB Instant SDK docs (Aug 2025). Verify: developers.facebook.com/docs/games/instant-games |
| Cocos Creator draw calls / atlases | HIGH | Well-documented in Cocos Creator official guides and community; stable across versions |
| Frame-rate-independent timing | HIGH | Fundamental game development principle; verified across multiple engine ecosystems |
| Save data dual-path corruption | HIGH | Common cross-platform pattern; both APIs are stable and well-documented |
| Memory leaks / event listeners | HIGH | Cocos Creator-specific and explicitly documented in their manual |
| Gacha legal/store compliance | MEDIUM | Apple Guideline 3.1.1 and Google Play policy confirmed as of Aug 2025; re-verify current wording before gacha ships |
| IAP receipt validation | HIGH | Platform APIs (Apple verifyReceipt, Google Play API) are stable; pattern is industry standard |
| Ad placement psychology | MEDIUM | Based on industry analytics patterns; verify with your own cohort data post-launch |
| Economy balance | MEDIUM | Modeled from casual game industry standards; must be validated with actual playtest data |

---

## Sources

- Cocos Creator 3.x official documentation — asset bundle system, memory management, audio system (training knowledge, Aug 2025 cutoff). Verify at: https://docs.cocos.com/creator/manual/en/
- Facebook Instant Games developer documentation — bundle limits, SDK init sequence, payment API (training knowledge). Verify at: https://developers.facebook.com/docs/games/instant-games
- Apple App Store Review Guidelines 3.1.1 — loot box / gacha odds disclosure requirement. Verify at: https://developer.apple.com/app-store/review/guidelines/
- Google Play Policy — random rewards disclosure requirement. Verify at: https://play.google.com/about/monetization-ads/in-app-purchase/
- Casual mobile game retention benchmarks (industry-standard figures from Adjust, AppsFlyer, GameAnalytics reports — training knowledge, LOW confidence for exact numbers; verify with current reports)

**IMPORTANT: Live verification of FB Instant bundle limits, current gacha policy wording, and Cocos Creator version-specific APIs is strongly recommended before implementation begins. These are the three highest-change-rate areas in this domain.**
