# Technology Stack

**Project:** Bloom Harvest
**Researched:** 2026-03-07
**Note on sources:** WebSearch and WebFetch were unavailable during this research session. All findings are based on training data (cutoff: August 2025), which covers Cocos Creator 3.x through mid-2025 releases and the FB Instant Games SDK through version 7.x. Confidence levels reflect this constraint — treat MEDIUM/LOW items as requiring manual version verification before implementation.

---

## Recommended Stack

### Core Engine

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Cocos Creator | 3.8.x (latest stable as of mid-2025) | Game engine, cross-platform build pipeline | Only engine with first-class support for both native mobile (iOS/Android via JSB) and WebGL/HTML5 in a single TypeScript codebase. Mature asset pipeline, built-in animation editor, scene editor. |
| TypeScript | 5.x (bundled with Creator) | Game logic language | Cocos Creator 3.x deprecated JavaScript — TypeScript is the supported language. Strong typing prevents entire classes of runtime bugs in complex state machines (bloom lifecycle). |

**Confidence:** MEDIUM — Cocos Creator 3.8.x was the active release branch through mid-2025. Verify the exact patch version at https://www.cocos.com/en/creator before project setup; a 3.9.x may exist by March 2026.

**Why NOT Cocos Creator 2.x:** End of active development. No new platform support. TypeScript support is limited compared to 3.x. All new casual games should use 3.x.

**Why NOT Unity:** Unity's WebGL builds are large (10–30 MB minimum) and perform poorly on Facebook Instant Games' 200 MB budget. Unity's HTML5 export path requires IL2CPP WASM compilation which adds significant load time. Cocos Creator's JavaScript/TypeScript runtime compiles directly to optimized Web bundles with much smaller footprints.

**Why NOT Phaser / PixiJS:** These are pure HTML5 engines. They cannot produce native iOS/Android binaries. You'd need to wrap in Capacitor/Cordova, losing access to native performance optimizations and requiring a separate build pipeline.

---

### Build Targets

| Target | Cocos Creator Build Template | Notes |
|--------|------------------------------|-------|
| Android | Android (via Android Studio + Gradle) | NDK r21+ required; produces APK/AAB |
| iOS | iOS (via Xcode) | Xcode 14+ required; produces IPA |
| Facebook Instant Games | Web Mobile (HTML5) | Uses FB Instant Games SDK injected at runtime |

**Confidence:** HIGH — This is the standard Cocos Creator 3.x build matrix and has been stable since 3.6.

---

### Facebook Instant Games SDK

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| FB Instant Games SDK | 7.1 (latest as of 2025) | Platform API: leaderboards, payments, sharing, player data | Required by Facebook. No alternative. |
| Cocos Creator FB Instant Games build template | Bundled | Injects FBInstant SDK, handles bundle format | Creator's built-in `fb-instant-games` build target handles the HTML5 wrapping; the SDK is auto-injected into index.html. |

**Integration pattern:**

```typescript
// Declare global in tsconfig or a .d.ts file
declare const FBInstant: any;

// In your game's boot scene (before first frame renders):
async function initFBInstant(): Promise<void> {
    await FBInstant.initializeAsync();
    // Now safe to show loading progress
    await FBInstant.setLoadingProgress(100);
    await FBInstant.startGameAsync();
    // Game loop begins here
}
```

**Key FB Instant APIs this game uses:**

| API | Usage in Bloom Harvest |
|-----|----------------------|
| `FBInstant.player.getID()` | Identify player for backend sync |
| `FBInstant.getLeaderboardAsync()` | Global and friend leaderboards |
| `FBInstant.payments.*` | IAP for premium currency, skins |
| `FBInstant.shareAsync()` | Share high score screenshots |
| `FBInstant.getRewardedVideoAsync()` | Rewarded video ads |
| `FBInstant.getInterstitialAdAsync()` | Interstitial ads |

**Bundle size constraint:** FB Instant Games requires the initial payload (index.html + critical JS) to be under 5 MB; total game bundle must be under 200 MB. Use Cocos Creator's Asset Bundle system to lazy-load non-critical assets (flower animations, decorations) after game start.

**Confidence:** MEDIUM — SDK 7.1 was current through mid-2025. Verify current version at https://developers.facebook.com/docs/games/instant-games/sdk before implementation; breaking changes between major versions are uncommon but do occur.

---

### Ads SDK

#### Mobile (iOS + Android)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Google AdMob (via Cocos Plugin) | AdMob Android SDK 23.x / iOS SDK 11.x | Rewarded ads, interstitials, banners | Largest fill rate globally, especially in Southeast Asia (target market). Cocos Creator has a maintained `cocosPlugin-admob` or use the official Cocos Service panel integration. |

**Why AdMob over others:**
- MAX fill rate and eCPM for casual games in Asia
- Google Play policy compliance built-in
- App Tracking Transparency (ATT) handling for iOS is well-documented with AdMob
- Facebook Audience Network (FAN) is the logical alternative, but FAN mobile SDKs have had repeated policy issues and fill rate has declined since 2022

**Integration approach:**

```typescript
// Initialize once at game boot (native builds only)
// Use platform guards to avoid calling on HTML5 builds
if (sys.isNative) {
    admob.initialize();
    // Load rewarded ad
    admob.rewardedAd.load({ adUnitId: REWARDED_AD_UNIT_ID });
}
```

**Why NOT Facebook Audience Network on mobile:** FAN's iOS SDK requires ATT prompt handling that conflicts with AdMob's mediation if both are active. For a solo/small team, managing two ad SDKs adds integration complexity disproportionate to the eCPM gains. Use AdMob mediation (which can include FAN as a mediated network) instead of direct FAN integration.

**Confidence:** MEDIUM — AdMob SDK versions advance frequently; verify current versions at https://developers.google.com/admob before integration.

#### Facebook Instant Games (HTML5)

| Technology | Purpose |
|------------|---------|
| FB Instant Games Ads (built into FBInstant SDK) | Rewarded video and interstitial ads — same SDK, no separate integration |

On HTML5/FB Instant builds, ads go through `FBInstant.getRewardedVideoAsync()` and `FBInstant.getInterstitialAdAsync()`. No additional SDK needed. Platform handles monetization policy compliance.

---

### IAP SDK

#### Mobile (iOS + Android)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Cocos Creator IAP Service (CocosSDK) | Via Cocos Dashboard Service | In-app purchases for native builds | Cocos provides a unified IAP wrapper that handles both Apple StoreKit and Google Play Billing in one API. Removes the need to maintain platform-specific purchase flows separately. |

**Alternative:** If Cocos IAP Service is insufficient (e.g., server-side receipt validation is needed), use `cordova-plugin-purchase` or a raw StoreKit/Google Play Billing integration via Cocos JSB. For this game, Cocos's built-in service is sufficient for MVP.

**Server-side validation:** IAP receipts MUST be validated server-side for any purchase that grants premium currency or items. Client-side only validation is exploitable. You will need a lightweight backend endpoint (see ARCHITECTURE.md).

**Confidence:** MEDIUM — Cocos Service panel availability changes; verify at https://www.cocos.com/en/services that IAP service is still offered.

#### Facebook Instant Games (HTML5)

| Technology | Purpose |
|------------|---------|
| `FBInstant.payments.*` | Built into FB Instant SDK. Handles Facebook Credits / local payment methods. |

FB Instant Games payments use Facebook's own payment infrastructure. Products are defined in the Facebook Developer Console. No additional library required.

---

### Backend / Data Persistence

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Cocos Creator Local Storage (`sys.localStorage`) | Built-in | Offline progression, settings | Zero-dependency local persistence for both native and HTML5. Sufficient for offline-first casual gameplay. |
| Firebase (optional) | Firebase JS SDK 10.x (HTML5) / Firebase C++ SDK (native via Cocos extension) | Leaderboards, player sync, analytics | Industry standard for casual mobile backends. Firestore for player data, Realtime Database or Firestore for leaderboards, Analytics for funnel tracking. Firebase Remote Config is especially useful for live-ops (seasonal events). |

**Why Firebase over a custom backend:** Bloom Harvest's backend needs are simple: player profile sync, leaderboard writes, analytics events. Firebase covers all three with no server management. The free Spark plan is sufficient for MVP scale (up to 50K daily active users). A custom backend is unnecessary complexity until you hit scale.

**Why NOT Playfab:** PlayFab is more powerful but has a steeper integration curve. Its JavaScript SDK is not optimized for Cocos Creator and requires extra bridging. Firebase is simpler for this game's feature set.

**Confidence:** MEDIUM — Firebase SDK versions advance frequently; verify version compatibility with your Cocos Creator build (especially the HTML5 bundle size impact of Firebase JS SDK).

---

### Animation

| Technology | Purpose | Why |
|------------|---------|-----|
| Cocos Creator Animation Editor (built-in) | Flower bloom lifecycle animation (bud → bloom → wilt) | Native to the engine, zero additional dependency, performant on mobile. Supports keyframe animation, easing curves, events on frames (trigger scoring window). |
| DragonBones or Spine | Skeletal animation for complex flower types | Only add if hand-keyed animations are insufficient for specific flower species. Spine is higher quality but requires a paid license for commercial use. DragonBones is free. For MVP, avoid — built-in animation is sufficient. |

**Recommendation:** Use Cocos Creator's built-in Animation component for all MVP flower animations. Add Spine only if art direction requires skeletal deformation that keyframe cannot achieve. The licensing cost and bundle size hit of Spine is not justified for a casual game at MVP stage.

**Confidence:** HIGH — Built-in animation is a core Cocos Creator feature.

---

### Physics

**Do NOT use a physics engine for this game.** Bloom Harvest is a timing/tap game. No rigid body physics, no collisions between game objects that require simulation. Using Box2D or Bullet (Cocos Creator's built-in physics engines) adds bundle size and initialization overhead for zero gameplay benefit.

Use Cocos Creator's `tween` system and `Animation` component for all movement and state transitions.

**Confidence:** HIGH — This is a design decision, not a library question.

---

### Audio

| Technology | Purpose | Why |
|------------|---------|-----|
| Cocos Creator AudioSource (built-in) | BGM, SFX (tap feedback, bloom sounds) | Native to engine. Supports Web Audio API on HTML5, native audio on mobile. No external library needed for a casual game's audio requirements. |

**Asset format:** Use `.mp3` for HTML5 compatibility and `.ogg` as fallback for older Android. Cocos Creator's audio system handles format selection automatically when both are provided.

**Confidence:** HIGH — Core engine feature.

---

### State Management

| Pattern | Purpose | Why |
|---------|---------|-----|
| Cocos Creator `GameManager` singleton (custom) | Global game state: current level, score, currency, player data | Cocos Creator does not prescribe a state management library. A simple singleton `GameManager` node that persists across scenes (using `director.addPersistRootNode`) is the standard community pattern for casual games. |

**Do NOT use** Redux, MobX, or other web-framework state libraries. They add unnecessary complexity, are not designed for game loops, and have no Cocos Creator integrations.

---

### UI Framework

| Technology | Purpose | Why |
|------------|---------|-----|
| Cocos Creator UI System (built-in) | All game UI: menus, HUD, shop, collection screens | Canvas-based UI with Widget, Layout, ScrollView components. Handles screen adaptation for different device sizes via Widget anchors. No external UI library needed. |

**Screen adaptation strategy:** Use the `Design Resolution` setting in Project Settings. Set a base resolution of 720x1280 (portrait). Use `Fit Height` adaptation mode so the game fills the screen height and letterboxes on wider devices. All UI nodes should use Widget component with anchors, not fixed pixel positions.

---

### Asset Management

| Technology | Purpose | Why |
|------------|---------|-----|
| Cocos Creator Asset Bundle system | Lazy-loading flower assets, seasonal content | Critical for FB Instant Games 200 MB constraint. Split assets into: `main` bundle (core gameplay, < 5 MB), `flowers` bundle (all flower sprites/animations), `decorations` bundle (garden decoration assets). Download on demand. |
| TexturePacker (external tool) | Sprite atlas generation | Reduces draw calls by batching flower sprites into atlases. Essential for smooth 60fps on mid-range Android. Free tier is sufficient for MVP. |

**Confidence:** HIGH — Asset Bundle system is a core Cocos Creator 3.x feature. TexturePacker is the industry standard for sprite atlases.

---

### Development Tools

| Tool | Purpose | Why |
|------|---------|-----|
| Cocos Dashboard | Engine version management, project creation | Official tool — use it |
| VS Code | TypeScript editing | Best TypeScript support, Cocos Creator extension available |
| Cocos Creator VS Code Extension | Autocomplete for Cocos APIs | Reduces lookup time significantly |
| Android Studio (latest stable) | Android build compilation | Required by Cocos Creator for Android builds |
| Xcode (latest stable) | iOS build compilation | Required by Cocos Creator for iOS builds |
| Chrome DevTools | HTML5/FB Instant debugging | Debug web builds; use FB Instant Games Instant Games sandbox for platform testing |

---

### Analytics

| Technology | Purpose | Why |
|------------|---------|-----|
| Firebase Analytics | Funnel analysis, retention, event tracking | Already in stack for backend. Free, deep integration with Firebase ecosystem. |
| Facebook Analytics (via Pixel / App Events) | FB Instant Games player behavior | Required for FB ad targeting if you run user acquisition campaigns on Facebook. Automatically available when using FB Instant SDK — call `FBInstant.logEvent()`. |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Engine | Cocos Creator 3.8.x | Unity | Unity WebGL too large for FB Instant Games 5 MB initial payload limit |
| Engine | Cocos Creator 3.8.x | Phaser 3 | Phaser cannot produce native iOS/Android builds without Capacitor wrapper; adds build complexity |
| Engine | Cocos Creator 3.8.x | Godot 4 | Godot's HTML5 export is improving but still not optimized for FB Instant; no mature monetization plugin ecosystem |
| Ads (mobile) | AdMob | FB Audience Network (direct) | FAN fill rate declining; iOS ATT complexity; use FAN via AdMob mediation instead of direct |
| Ads (mobile) | AdMob | AppLovin MAX | MAX is excellent but adds another SDK; use AdMob mediation to access MAX demand instead |
| Backend | Firebase | Custom Node.js/PostgreSQL | Overkill for MVP; Firebase covers all needs with zero server management |
| Backend | Firebase | PlayFab | Steeper integration, no Cocos Creator native SDK, overkill for this game's feature set |
| Animation | Built-in | Spine | Spine commercial license required; bundle size increase; not justified for casual tap game at MVP |
| State | GameManager singleton | Redux/MobX | Web-framework patterns add complexity with no game-loop awareness; not designed for tick-based game state |

---

## Installation

```bash
# 1. Install Cocos Creator via Cocos Dashboard
# Download from: https://www.cocos.com/en/creator
# Install Cocos Dashboard, then install Creator 3.8.x through the Dashboard

# 2. Create new project in Dashboard (TypeScript template)

# 3. Add Firebase JS SDK (for HTML5 build)
# In your project's web build folder or via npm for build pipeline:
npm install firebase@10

# 4. FB Instant Games SDK
# No npm install needed — injected automatically by Creator's fb-instant-games build template
# Declare types in a .d.ts file for TypeScript support:
# declare const FBInstant: any; // or use @types/facebook-instant-games if available

# 5. AdMob
# Use Cocos Dashboard > Service panel to add AdMob service
# This auto-configures native Android/iOS dependencies

# 6. TexturePacker (separate install)
# Download from: https://www.codeandweb.com/texturepacker
```

---

## Version Matrix Summary

| Component | Version | Confidence | Verify At |
|-----------|---------|------------|-----------|
| Cocos Creator | 3.8.x | MEDIUM | https://www.cocos.com/en/creator |
| TypeScript | 5.x (bundled) | HIGH | Bundled with Creator |
| FB Instant Games SDK | 7.1 | MEDIUM | https://developers.facebook.com/docs/games/instant-games/sdk |
| Firebase JS SDK | 10.x | MEDIUM | https://firebase.google.com/docs/web/setup |
| Google AdMob Android SDK | 23.x | LOW | https://developers.google.com/admob/android |
| Google AdMob iOS SDK | 11.x | LOW | https://developers.google.com/admob/ios |
| TexturePacker | 7.x | LOW | https://www.codeandweb.com/texturepacker |

---

## Sources

- Training data (Cocos Creator 3.x documentation, August 2025 cutoff) — MEDIUM confidence
- Training data (FB Instant Games SDK 7.x documentation) — MEDIUM confidence
- Training data (Google AdMob SDK documentation) — LOW confidence (version numbers change frequently)
- Training data (Firebase SDK 10.x documentation) — MEDIUM confidence
- Note: All URLs listed under "Verify At" should be checked before project kickoff. WebSearch and WebFetch were unavailable during this research session, which is the primary reason confidence is MEDIUM rather than HIGH for most items.
