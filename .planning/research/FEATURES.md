# Feature Landscape: Bloom Harvest

**Domain:** Casual mobile tap/timing game with collection and garden decoration
**Researched:** 2026-03-07
**Confidence:** MEDIUM — based on established casual mobile game design patterns (training data through Aug 2025). WebSearch unavailable; recommend spot-checking competitor titles before locking feature priorities.

---

## Table Stakes

Features users expect from any casual mobile tap/timing game. Missing one = users leave within the first session.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Responsive tap detection** | Core mechanic must feel immediate. Sub-100ms feedback is the baseline. Any lag = broken game. | Low | Cocos Creator's input pipeline handles this; test on low-end Android devices specifically. |
| **Visual hit feedback** | Particle burst, screen flash, or scale pop on successful tap. Without it, players don't know if they tapped "correctly." | Low | The bloom-burst moment IS the product — invest here. |
| **Audio feedback on tap** | Satisfying sound on perfect tap, distinct sound on miss. Audio is 50% of the timing feel. | Low | Sound design budget matters more than most realize here. |
| **Clear timing window indicator** | Players must see when the flower is at peak bloom. Visual affordance (glow, pulse, highlight ring) is non-negotiable. | Medium | Animation curve communicates window; no separate UI element needed if bloom animation is readable. |
| **Score display** | Current score visible during play. Players need moment-to-moment feedback. | Low | — |
| **High score tracking** | Retain best score per mode. Session replay motivation. | Low | Local storage minimum; server sync for leaderboard later. |
| **Miss/failure feedback** | Player must know they missed and why. Wilting flower + score penalty animation. | Low | Critical for skill loop — without this, players can't improve. |
| **Game over / session end screen** | Summary of score, stars earned, replay button. Standard mobile game contract. | Low | — |
| **Multiple game modes (Campaign + Endless)** | Campaign gives structure/goal; Endless gives replayability. Having only one halves retention. | Medium | Both are in scope per PROJECT.md. |
| **Level progression in Campaign** | Each level must be clearly harder than the last. Difficulty curve is the product roadmap. | Medium | Controlled via flower species mix and bloom speed per level. |
| **Basic tutorial / onboarding** | First-time player must understand "tap at peak bloom" in under 30 seconds. No text walls. | Medium | Interactive: show one flower blooming, prompt tap, give positive feedback. |
| **Pause / resume** | Real life interrupts. No pause = immediate uninstall from anyone with kids or a job. | Low | — |
| **Settings screen** | Sound on/off, music on/off at minimum. | Low | — |
| **Loading screen / splash** | Required for any game with asset loading. FB Instant Games especially needs a branded loading state. | Low | — |

---

## Differentiators

Features that set Bloom Harvest apart. Not expected as baseline, but create competitive advantage and retention.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Flower rarity system (Common → Legendary)** | Transforms a tap game into a collection game. Rarity = long-term goal. | Medium | 4 tiers is the sweet spot (matches Clash Royale, Pokemon GO patterns). Each tier needs distinct visual treatment so rarity is legible instantly. |
| **Per-species bloom timing personality** | Roses bloom slow and wide (forgiving); Cherry blossoms bloom fast and narrow (punishing). Different species = different skill challenges. | Medium | This is the core design space. Each flower species is a mini-game variant. Requires careful balancing. |
| **Flower collection / Florarium view** | Gallery of all unlocked flowers. Drives completionist behavior. "Gotta catch em all" loop. | Medium | Each slot visible but locked = FOMO motivation. Display % collected. |
| **Garden decoration system** | Lets players personalize their space. Drives IAP and emotional attachment to the game. | High | Decorations can be cosmetic-only; separates spenders from non-spenders cleanly. |
| **Flower upgrade system** | Upgrading a flower increases its score multiplier or widens its bloom window. | Medium | Creates a second spending loop: earn currency → upgrade → score higher → unlock harder content. |
| **Daily quests** | "Harvest 5 roses" or "Score 3 perfects in a row." Creates daily return habit. | Medium | 3 quests per day is the standard (Plants vs Zombies Heroes, Clash Royale pattern). Reset at midnight local time. |
| **Streak / login reward system** | Daily login rewards with escalating value. Standard retention driver. | Low | Day 7 reward must be meaningful (a Rare flower seed minimum). |
| **Achievement system** | Long-term goals beyond quests. "Harvest 1000 flowers lifetime." | Medium | Drives background engagement; players work toward achievements passively. |
| **Gacha / seed pack opening** | Spending premium currency to receive random flowers. Highly monetizable. High engagement moment. | High | Must include pity system (guaranteed Rare after N pulls) to comply with app store guidelines (Apple 2024 rule on loot boxes). Requires disclosure of odds. |
| **Seasonal events / limited flowers** | Time-limited content (Cherry Blossoms in Spring, Sunflowers in Summer). Creates urgency and return visits. | High | Biggest retention driver for casual games post-launch. Plan the content calendar before shipping. |
| **Score sharing / social flex** | Screenshot-ready end screen. "I harvested a Legendary Rose — can you beat my score?" | Low | Deep link back to game. Low effort, high virality potential. |
| **Leaderboard (friends + global)** | Competition loop. Seeing friends above you is a motivation trigger. | Medium | Facebook Instant Games has native leaderboard API. iOS/Android needs Game Center or custom backend. |

---

## Anti-Features

Features to deliberately NOT build in v1 — either too complex, wrong for the core loop, or premature.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Real-time multiplayer PvP** | Requires matchmaking server, low-latency infrastructure, anti-cheat. Massive scope for a launch feature. Already marked out-of-scope in PROJECT.md. | Leaderboard gives competitive feeling without real-time complexity. Add in v2 if retention data supports it. |
| **Crafting / flower combination system** | Adding crafting to a tap game creates cognitive overhead that contradicts "casual." Players open the game on the bus. | Upgrade system is sufficient depth. Keep crafting for a garden-builder genre, not timing games. |
| **Narrative / story campaign** | Story requires writer, VO, cinematics, branching logic. Casual players skip cutscenes. | Level names and visual themes can imply narrative without building one. |
| **Clan / guild system** | Social infrastructure for clans requires significant backend, moderation, and UX work. Premature before you have a player base. | Friends leaderboard captures social benefit at 1/10th the cost. |
| **Energy / stamina system in v1** | Energy gates churn new users. F2P players who can't play freely during the critical first week won't return. | Implement in v2 once you have a paying cohort. Use ads as the soft gate instead. |
| **Complex offline progression (AFK farming)** | Idle game mechanics are a different genre. Grafting AFK farming onto a timing game creates hybrid confusion. | Daily login rewards and quest resets handle the "progress while away" feeling. |
| **PC / Desktop build** | Different input model (mouse vs touch), different distribution (Steam vs app stores), different audience. Splits focus. | Facebook Instant Games runs in browser but plays like mobile. Sufficient for web reach. |
| **Procedural level generation** | Procedural levels for timing games are notoriously hard to balance (difficulty spikes, impossible timing). | Hand-authored levels up to Campaign milestone 50+, then reassess. |
| **Chat / messaging** | In-game chat requires moderation infrastructure and COPPA compliance complexity. | Share buttons give social interaction without chat overhead. |
| **Subscription monetization** | Subscriptions are effective for productivity/utility apps; casual games have low willingness to pay recurring. | One-time IAP bundles and cosmetics outperform subscriptions in this genre. |

---

## Feature Dependencies

```
Tap Detection
  └── Visual/Audio Feedback (depends on: tap detection working)
        └── Timing Window Indicator (depends on: animation system)
              └── Score System (depends on: timing accuracy measurement)
                    └── High Score / Leaderboard (depends on: score system)
                    └── Game Over Screen (depends on: score system)

Flower Species Definitions
  └── Per-Species Bloom Timing (depends on: species data model)
        └── Rarity System (depends on: species definitions)
              └── Collection / Florarium (depends on: rarity system + unlock state)
                    └── Upgrade System (depends on: collection + currency)
              └── Gacha / Seed Packs (depends on: rarity system + premium currency)
                    └── Pity System (depends on: gacha + pull history tracking)

Currency System (soft + premium)
  └── Upgrade System (depends on: currency)
  └── Gacha (depends on: premium currency)
  └── Garden Decoration Shop (depends on: soft or premium currency)

Daily Quests
  └── Achievement System (depends on: quest tracking infrastructure)
  └── Streak / Login Rewards (depends on: session tracking)

Ads Integration (Rewarded + Interstitial)
  └── Rewarded Ad Placement (depends on: ad SDK initialized)
  └── Interstitial Placement (depends on: session flow defined — between levels)

Campaign Levels
  └── Difficulty Curve (depends on: species speed parameters)
  └── Star Rating per Level (depends on: score thresholds)

Seasonal Events
  └── Limited Flower Species (depends on: rarity system)
  └── Event Leaderboard (depends on: leaderboard system)
  └── Server-side date/flag system (depends on: backend or remote config)
```

---

## Monetization Pattern Details

### Ads (Rewarded + Interstitial)

**Table stakes behavior:**
- Rewarded ads gated to player choice ("Watch ad to continue after fail" / "Watch ad to double harvest reward")
- Interstitials between levels — not during gameplay, never blocking UI
- Interstitial frequency cap: maximum 1 per 2 minutes to avoid policy violations (Apple, Google)

**What performs well in casual timing games:**
- "Revive" rewarded ad (after game over in Endless mode) — highest engagement rate
- "Double harvest" rewarded ad (after level complete) — low friction, high value perception
- Rewarded ad for premium currency ("Watch 3 ads = 10 gems") — drives engagement loop

**Complexity:** Low (SDK integration) to Medium (placement strategy, frequency logic)

### IAP (In-App Purchase)

**Table stakes IAP tiers for casual mobile (MEDIUM confidence — market standard as of 2025):**

| Tier | Price Range | What to Sell |
|------|-------------|-------------|
| Entry | $0.99 – $1.99 | Small gem pack, ad removal for session |
| Mid | $4.99 – $9.99 | Medium gem pack + bonus flower seed |
| Whale | $19.99 – $29.99 | Large gem pack + Exclusive skin |
| Starter Pack | $2.99 (one-time, time-limited) | Best value bundle shown to new players in first 3 days |

**Key IAP rules:**
- Starter pack shown day 1-3 only (urgency) — highest conversion window
- "No Ads" permanent purchase ($2.99–$4.99) — low revenue but high satisfaction signal
- Gacha bundles outperform direct purchase of specific flowers (mystery = higher perceived value)
- Never gate campaign completion behind IAP — this kills organic reviews

**Complexity:** Medium (store setup, receipt validation, entitlement system)

---

## MVP Recommendation

Build in this order to validate the core loop before adding meta-systems:

**Must ship in MVP:**
1. Tap detection + bloom animation + hit/miss feedback (the feel)
2. 3-5 flower species with distinct timing personalities
3. Score system with combo multiplier
4. Campaign mode: 10-15 levels
5. Endless mode
6. Basic tutorial (interactive, first level)
7. Settings (sound/music toggle)
8. Rewarded ads (continue + double reward)

**Ship in first update (week 2-4 post-launch):**
1. Collection / Florarium view
2. Rarity system (4 tiers)
3. Gacha / seed pack with pity system
4. Daily quests (3/day)
5. Login streak rewards
6. Leaderboard (global score)
7. IAP: gem packs + starter bundle

**Defer to v2:**
- Garden decoration (High complexity, High reward — needs monetization data first)
- Seasonal events (needs operational calendar and content pipeline)
- Achievement system (nice-to-have, low urgency)
- Friends leaderboard (needs social auth which varies by platform)
- Upgrade system (needs collection data to balance)

**Rationale for ordering:**
The timing mechanic must feel great before ANY meta-layer is added. Players who bounce in the first 2 minutes never see the gacha. Nail the tap feel, then layer monetization.

---

## Sources

- Casual mobile game design patterns: training data through August 2025 (MEDIUM confidence)
- Tap/timing game UX patterns: training data — examples include Fruit Ninja, Piano Tiles, Tap Tap series, Magic Tiles (MEDIUM confidence)
- Collection game loops: training data — examples include Pokemon GO, Merge games, Gardenscapes (MEDIUM confidence)
- IAP pricing tiers: training data — standard casual mobile benchmarks circa 2024-2025 (MEDIUM confidence, recommend verifying against current app store analytics)
- Apple loot box disclosure requirement (2024): training data (MEDIUM confidence — recommend verifying current App Store Review Guidelines Section 3.1.1)
- Gacha pity system requirement: training data — Apple App Store guidelines and common practice (MEDIUM confidence)
- Facebook Instant Games leaderboard API: training data (MEDIUM confidence — verify against current FB Instant Games SDK docs before implementation)

**Gaps to validate before implementation:**
- Current Apple App Store Rules on loot boxes / gacha (verify Section 3.1.1 of current guidelines)
- Google Play policy on random reward mechanics (verify current Play Console policy)
- Facebook Instant Games current file size limit and leaderboard API changes (verify at developers.facebook.com)
- Ad network recommended frequency caps for 2026 (check AdMob, IronSource, MAX docs)
