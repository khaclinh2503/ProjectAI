# Architecture Patterns — Bloom Harvest

**Domain:** Casual mobile flower timing game (Cocos Creator)
**Researched:** 2026-03-07
**Confidence:** MEDIUM — Based on Cocos Creator documentation knowledge through August 2025 and established casual game architecture patterns. WebSearch and WebFetch were unavailable for verification. Core patterns are stable and well-established.

---

## Recommended Architecture

Bloom Harvest follows a **layered Manager architecture** common to Cocos Creator casual games:

```
┌──────────────────────────────────────────────────┐
│                  UI / Scene Layer                │
│  (MainMenu, Gameplay, Collection, Garden, Shop)  │
└────────────────────┬─────────────────────────────┘
                     │ events / callbacks
┌────────────────────▼─────────────────────────────┐
│              Game Manager Layer                  │
│  GameManager · FlowerManager · ScoreManager      │
│  QuestManager · LeaderboardManager               │
│  MonetizationManager · SaveManager               │
└────────────────────┬─────────────────────────────┘
                     │ reads / writes
┌────────────────────▼─────────────────────────────┐
│               Data / State Layer                 │
│  PlayerData · FlowerDatabase · LevelConfig       │
│  CollectionData · UpgradeData · ShopCatalog      │
└────────────────────┬─────────────────────────────┘
                     │ persistence
┌────────────────────▼─────────────────────────────┐
│            Platform Adapter Layer                │
│  SaveAdapter (LocalStorage / CloudSave)          │
│  AdsAdapter · IAPAdapter · FBInstantAdapter      │
└──────────────────────────────────────────────────┘
```

All Managers are **persistent singleton nodes** that survive scene transitions (attached to a root node with `cc.game.addPersistRootNode()`). Scenes are thin: they wire up UI to manager APIs and react to events.

---

## Component Boundaries

### 1. Core Gameplay Loop

**Responsibility:** Drive the per-session flower lifecycle, timing windows, scoring events, and round state (start → playing → end).

**Owns:**
- Round state machine (`Idle | Countdown | Playing | RoundOver`)
- Active flower slot references for the current level
- Tap validation logic (is the flower in the bloom window?)
- Combo tracking within a round

**Communicates with:**
- `FlowerLifecycleSystem` — to spawn and tick flower states
- `ScoreSystem` — to emit scoring events on valid/invalid taps
- `QuestSystem` — to emit gameplay events (perfect tap, combo reached)
- `GameManager` — to report round outcomes

**Does NOT own:** Persistent player data, ads, save logic.

---

### 2. Flower Lifecycle System

**Responsibility:** Manage the state machine for each flower instance on the board: `Bud → Bloom → Wilt`. Expose the "perfect bloom window" timing.

**Owns:**
- Per-flower timer (driven by flower rarity and upgrade multipliers)
- State transitions and animation triggers
- Bloom window definition (start time, duration, end time)
- Visual feedback (particle burst on perfect tap, droop on wilt)

**Communicates with:**
- `FlowerDatabase` — reads base growth speed per flower species
- `UpgradeSystem` — reads speed/window multipliers for the player's upgrades
- `CoreGameplayLoop` — notifies when a flower wilts without being tapped

**Data input:** `FlowerConfig { id, rarity, baseBloomDuration, bloomWindowFraction, animationKey }`

---

### 3. Scoring System

**Responsibility:** Calculate and accumulate score for the current session. Issue point awards and penalties.

**Owns:**
- Session score accumulator
- Rarity multiplier lookup
- Timing quality bands (Perfect / Good / Miss)
- Combo multiplier state

**Communicates with:**
- `CoreGameplayLoop` — receives tap result events
- `FlowerDatabase` — reads rarity base points
- `UpgradeSystem` — reads score boost upgrades
- `LeaderboardSystem` — pushes final score on session end
- `QuestSystem` — emits "score X in one round" events

**Data output:** `ScoreEvent { flowerID, quality, pointsAwarded, comboMultiplier, sessionTotal }`

---

### 4. Collection / Gacha System

**Responsibility:** Track which flower species the player has unlocked. Handle gacha pulls (currency-based random unlock) and gameplay-gated unlocks.

**Owns:**
- Unlocked species registry
- Gacha probability table per rarity tier (Common/Rare/Epic/Legendary)
- Gacha pull execution and result display
- Seasonal flower pool toggling (event on/off)

**Communicates with:**
- `PlayerData` — reads/writes owned species list
- `CurrencySystem` (inside MonetizationSystem) — deducts premium currency for pulls
- `QuestSystem` — notifies on new species unlock
- `FlowerDatabase` — reads full species catalog

**Does NOT own:** Currency balance (lives in MonetizationSystem), flower stats (lives in FlowerDatabase).

---

### 5. Upgrade System

**Responsibility:** Allow players to spend resources to improve flower growth speed, bloom window duration, and score multipliers per species.

**Owns:**
- Upgrade tree definition per flower species
- Current upgrade level per player per species
- Resource cost calculation
- Stat export interface (used by FlowerLifecycle and Scoring)

**Communicates with:**
- `PlayerData` — reads/writes upgrade levels
- `CurrencySystem` — deducts soft currency (coins)
- `FlowerLifecycleSystem` — provides computed speed/window multipliers
- `ScoreSystem` — provides computed score boost multipliers

**Data contract:**
```typescript
interface UpgradeStats {
  growthSpeedMultiplier: number;   // 1.0 = base
  bloomWindowMultiplier: number;   // 1.0 = base
  scoreBoostMultiplier: number;    // 1.0 = base
}
getUpgradeStats(flowerID: string): UpgradeStats
```

---

### 6. Garden Decoration System

**Responsibility:** Manage the persistent garden view (background scene between gameplay sessions). Allow players to place, move, and remove decorative items.

**Owns:**
- Garden layout state (which items placed, positions)
- Decoration catalog (items, prices, categories)
- Garden scene rendering logic (separate from gameplay scene)

**Communicates with:**
- `PlayerData` — saves/loads garden layout
- `CurrencySystem` — deducts soft or premium currency for items
- `CollectionSystem` — some decorations unlock with flower collections

**Note:** This is a meta-layer feature. It shares no runtime coupling with the CoreGameplayLoop — data flows only through PlayerData at session boundaries.

---

### 7. Quest / Achievement System

**Responsibility:** Track progress on daily quests and permanent achievements. Distribute rewards on completion.

**Owns:**
- Active quest state (progress counters, completion flags)
- Achievement registry and unlock state
- Daily reset timer logic
- Reward distribution (calls CurrencySystem / CollectionSystem)

**Communicates with (event listeners):**
- `CoreGameplayLoop` — listens for round_end, perfect_tap, combo events
- `ScoreSystem` — listens for score milestones
- `CollectionSystem` — listens for species_unlocked events
- `CurrencySystem` — pushes rewards on quest completion
- `SaveSystem` — persists progress

**Pattern:** QuestSystem subscribes to a central EventBus. Other systems emit events; QuestSystem reacts. This keeps emitters decoupled from quest logic.

---

### 8. Leaderboard System

**Responsibility:** Submit scores to FB Instant Games leaderboard API and fetch friend/global rankings for display.

**Owns:**
- Score submission queue (with retry on network failure)
- Cached leaderboard data (friend scores, global top)
- Score sharing payload construction

**Communicates with:**
- `FBInstantAdapter` — platform API calls
- `ScoreSystem` — receives final session score
- `PlayerData` — reads player display name/avatar

**Isolation:** All FB Instant Games API calls are wrapped in `FBInstantAdapter`. If the platform is native mobile (not FB), the adapter no-ops gracefully. Leaderboard UI shows a "not available" state.

---

### 9. Monetization System (Ads + IAP)

**Responsibility:** Manage ad lifecycle (rewarded, interstitial) and IAP purchase flow. Acts as single entry point for all revenue operations.

**Owns:**
- Ad readiness state (is rewarded ad loaded?)
- Ad frequency cap / cooldown logic
- IAP product catalog and purchase validation
- Currency grant after successful reward/purchase

**Sub-components:**
- `AdsAdapter` — wraps Cocos Creator AdMob/Unity Ads SDK
- `IAPAdapter` — wraps platform IAP (Apple StoreKit, Google Play Billing)
- `FBInstantAdapter` — wraps FB Instant payments API
- `CurrencySystem` — soft currency (coins) and premium currency (gems) ledger

**Communicates with:**
- `QuestSystem` — rewarded ads offered as quest reward shortcuts
- `CollectionSystem` — IAP bundles unlock species
- `SaveSystem` — persists currency balances
- Platform adapters — all external SDK calls isolated here

**Policy:** No direct SDK calls from gameplay or UI scripts. All monetization flows go through `MonetizationSystem` interface.

---

### 10. Save / Persistence System

**Responsibility:** Serialize and deserialize all player state. Abstract storage backend (local vs. cloud).

**Owns:**
- Save schema versioning and migration
- Serialization of: PlayerData, CollectionData, UpgradeData, GardenLayout, QuestProgress, CurrencyBalances
- Auto-save trigger (on scene transition, app pause, round end)
- Conflict resolution (local vs. cloud — last-write-wins for casual game)

**Communicates with:**
- All stateful systems — reads their data on load, writes on save
- `FBInstantAdapter` — cloud save via FB Player.setDataAsync (FB platform)
- `cc.sys.localStorage` — local fallback

**Data shape:**
```typescript
interface SaveBundle {
  version: number;
  playerID: string;
  currency: { coins: number; gems: number };
  collection: { unlockedIDs: string[]; upgradelevels: Record<string, number> };
  garden: { layout: PlacedItem[] };
  quests: { daily: QuestState[]; achievements: AchievementState[] };
  meta: { lastSaved: number; totalSessions: number };
}
```

---

### 11. FB Instant Games Integration

**Responsibility:** Isolate all Facebook Instant Games SDK calls behind a platform adapter. All other systems call this adapter; none import the FB SDK directly.

**Owns:**
- SDK initialization sequence (`FBInstant.initializeAsync → startGameAsync`)
- Player identity (getID, getName, getPhoto)
- Leaderboard API (getLeaderboardAsync, setScoreAsync, getConnectedPlayersEntriesAsync)
- Cloud save (getDataAsync, setDataAsync)
- Payments API (getPurchasesAsync, purchaseAsync)
- Share / context switching (shareAsync, chooseContextAsync)

**Platform detection pattern:**
```typescript
// PlatformAdapter selects implementation at startup
const adapter = cc.sys.isBrowser && typeof FBInstant !== 'undefined'
  ? new FBInstantAdapter()
  : new NullPlatformAdapter(); // no-ops for native
```

---

## Data Flow

### Session Start Flow

```
GameManager.startRound(levelConfig)
  → FlowerManager.spawnFlowers(levelConfig.flowerSlots)
      → FlowerDatabase.getConfig(flowerID)
      → UpgradeSystem.getUpgradeStats(flowerID)
      → FlowerLifecycle.startTimer(config, stats)
  → ScoreSystem.resetSession()
  → QuestSystem.onRoundStart()
```

### Tap Event Flow

```
User tap on flower node
  → FlowerLifecycle.onTapped()
      → evaluates bloom window → returns TapResult { quality, flowerID }
  → ScoreSystem.onTapResult(TapResult)
      → calculates points → emits ScoreEvent
  → QuestSystem.onTapEvent(TapResult)       [via EventBus]
  → UIManager.updateScoreDisplay(ScoreEvent)
```

### Round End Flow

```
CoreGameplayLoop.onRoundEnd()
  → ScoreSystem.getFinalScore() → sessionScore
  → LeaderboardSystem.submitScore(sessionScore)
  → QuestSystem.onRoundEnd(sessionScore, stats)
      → checks completion → distributes rewards via CurrencySystem
  → SaveSystem.save()
  → UIManager.showRoundEndScreen(results)
  → MonetizationSystem.maybeShowInterstitial()
```

### Gacha Pull Flow

```
UI: player taps "Pull x1"
  → CollectionSystem.requestPull(pullType)
      → MonetizationSystem.deductCurrency(gemCost)
          → CurrencySystem.deduct(gems, amount)
          → if insufficient → return error → UI shows IAP prompt
      → GachaEngine.roll(seasonalPool) → flowerID
      → CollectionSystem.unlockFlower(flowerID)
          → PlayerData.addToCollection(flowerID)
          → QuestSystem.onFlowerUnlocked(flowerID)  [via EventBus]
      → SaveSystem.save()
  → UI shows pull result animation
```

### Save Flow

```
Trigger: scene transition | app pause | round end
  → SaveSystem.collectState()
      → reads from: CurrencySystem, CollectionSystem, UpgradeSystem,
                    GardenSystem, QuestSystem
      → assembles SaveBundle
  → SaveSystem.persist(bundle)
      → cc.sys.localStorage.setItem('save', JSON.stringify(bundle))
      → FBInstantAdapter.setDataAsync(bundle)  [if on FB platform]
```

---

## Scene Management Approach

**Cocos Creator approach:** Use `cc.director.loadScene()` for major transitions and additive scene loading (`cc.director.loadScene` with `additive: true`) for overlay UI (popups, HUD).

### Scene List

| Scene | Purpose | Persistent Managers Needed |
|-------|---------|---------------------------|
| `Boot` | Load persistent managers, load save, platform init | All managers initialize here |
| `MainMenu` | Entry point, mode selection, daily quest summary | GameManager, QuestSystem, SaveSystem |
| `Gameplay` | Core flower timing loop | All gameplay systems |
| `Collection` | Browse/upgrade flowers, gacha pull | CollectionSystem, UpgradeSystem, MonetizationSystem |
| `Garden` | Decoration placement meta-layer | GardenSystem, CurrencySystem |
| `Shop` | IAP and currency purchases | MonetizationSystem |
| `Leaderboard` | Score rankings | LeaderboardSystem, FBInstantAdapter |

**Boot scene pattern:** All Manager nodes are created in Boot and registered as persistent root nodes. Boot then loads MainMenu. Subsequent scene transitions never destroy managers.

```typescript
// Boot.ts
async onLoad() {
  await PlatformAdapter.initialize();   // FB SDK init if applicable
  await SaveSystem.load();
  GameManager.instance.init();
  // ... init all managers
  cc.director.loadScene('MainMenu');
}
```

**Overlay / additive loading:** Popups (gacha reveal, settings, round end) are loaded additively on top of the current scene, then unloaded. This avoids full scene transitions for modal UI.

---

## Suggested Build Order

Build order is determined by dependency direction: lower layers must exist before upper layers can call them.

```
Phase 1: Foundation
  ├── Boot scene + persistent node pattern
  ├── EventBus (global pub/sub, no dependencies)
  ├── FlowerDatabase (static data, no runtime deps)
  ├── SaveSystem (schema only, no content yet)
  └── PlayerData model (plain data object)

Phase 2: Core Gameplay Loop (the fun)
  ├── FlowerLifecycleSystem (depends on FlowerDatabase)
  ├── CoreGameplayLoop (depends on FlowerLifecycle)
  ├── ScoreSystem (depends on CoreGameplayLoop events)
  └── Gameplay scene + basic UI (score, timer)

Phase 3: Progression Foundation
  ├── CollectionSystem (depends on PlayerData, FlowerDatabase)
  ├── UpgradeSystem (depends on CollectionSystem, PlayerData)
  └── CurrencySystem (depends on PlayerData, SaveSystem)

Phase 4: Meta Systems
  ├── QuestSystem (depends on EventBus, CurrencySystem)
  ├── GardenSystem (depends on PlayerData, CurrencySystem)
  ├── GachaEngine (depends on CollectionSystem, CurrencySystem)
  └── Collection/Garden scenes

Phase 5: Social + Platform
  ├── FBInstantAdapter (isolated, wraps FB SDK)
  ├── LeaderboardSystem (depends on FBInstantAdapter, ScoreSystem)
  └── Leaderboard scene

Phase 6: Monetization
  ├── AdsAdapter (wraps ad SDK)
  ├── IAPAdapter (wraps store SDK)
  ├── MonetizationSystem (depends on both adapters, CurrencySystem)
  └── Shop scene

Phase 7: Polish + Content
  ├── Seasonal event system (extends CollectionSystem)
  ├── Achievement system (extends QuestSystem)
  ├── Performance optimization (asset bundles, texture atlases)
  └── FB Instant Games file size audit
```

**Critical ordering rationale:**

- `EventBus` must exist before any system emits or listens. Build first.
- `FlowerDatabase` is read-only static config. Build before any system that needs flower data.
- `CoreGameplayLoop` is the product hypothesis. Build it by Phase 2 to validate the "tap timing" fun before any meta systems.
- `CurrencySystem` is a dependency for both Upgrade and Gacha — build it before either.
- `MonetizationSystem` is intentionally last. Do not couple core gameplay to monetization early; it creates design pressure that degrades gameplay quality.
- Platform adapters (`FBInstantAdapter`, `AdsAdapter`) wrap volatile external SDKs. Build them with null implementations first (no-op adapters) so all other systems can develop without a live SDK.

---

## Anti-Patterns to Avoid

### Direct Scene-to-Scene Data Passing
**What goes wrong:** Passing game state via scene parameters or static fields tied to scene lifecycle.
**Instead:** All state lives in persistent Manager nodes or SaveSystem. Scenes read from managers on `onLoad`.

### Gameplay Scripts Importing SDK Directly
**What goes wrong:** `FlowerLifecycle.ts` imports `FBInstant` — breaks native build, impossible to unit test.
**Instead:** All SDK calls go through adapter layer. Gameplay scripts never import platform SDKs.

### Monolithic GameManager
**What goes wrong:** One `GameManager` owns all state — becomes a god object, every system depends on it, untestable, merge conflicts on every feature.
**Instead:** Each system manages its own domain. `GameManager` only orchestrates round lifecycle and routes between scenes.

### Saving on Every Frame or Every Tap
**What goes wrong:** `cc.sys.localStorage` is synchronous and blocks the main thread. FB `setDataAsync` is rate-limited.
**Instead:** Save only on round end, scene transition, and app pause (`cc.game.on(cc.Game.EVENT_HIDE)`).

### Hardcoded Flower Configs in Scripts
**What goes wrong:** Flower growth speed, bloom window, point values in TypeScript constants. Impossible to balance without code changes.
**Instead:** All flower data in `FlowerDatabase` — JSON files loaded as Cocos Creator assets, editable without recompile.

---

## Scalability Considerations

| Concern | Now (MVP) | At 50+ flower species | At seasonal events |
|---------|-----------|----------------------|-------------------|
| Flower data | Single JSON file | Split into category bundles, lazy load | Seasonal pool as separate asset bundle |
| Save size | Full JSON in localStorage | Same — save only IDs, not full objects | Include event state in save schema v2+ |
| Gacha pool | Static probability table | Weighted pool by rarity tier, configurable | Pool hot-swap on event start/end |
| FB file size | All assets in main bundle | Separate asset bundles per scene | Seasonal assets in downloadable bundles (if FB allows) |
| Ad frequency | Simple round counter | Cooldown timer + session cap | No change needed |

---

## Sources

- Cocos Creator documentation (training knowledge through August 2025): scene management, persistent root nodes, `cc.director`, asset bundles
- FB Instant Games SDK documentation (training knowledge): initialization sequence, leaderboard API, player data API, payments API
- Established casual game architecture patterns: Manager/Service layer, EventBus decoupling, adapter pattern for platform SDKs
- Confidence: MEDIUM — WebSearch and WebFetch unavailable for live verification. Patterns are stable and widely used; Cocos Creator API specifics should be verified against current docs (v3.x) before implementation.
