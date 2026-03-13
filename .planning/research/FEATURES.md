# Feature Research

**Domain:** Casual tapping game — HTML5, grid-based, time-limited round
**Researched:** 2026-03-13
**Confidence:** MEDIUM (training knowledge; web search unavailable for external verification)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Responsive tap/touch registration | Core interaction — any lag or missed tap kills feel immediately | LOW | Must fire on `touchstart` not `touchend` on mobile; debounce to prevent phantom taps |
| Visual feedback on every tap | Users need to know the tap registered; silent taps feel broken | LOW | Flash/scale animation on the tapped cell, distinct for correct vs wrong tap |
| Score displayed in real-time | Score is the primary motivator; hiding it until end removes moment-to-moment dopamine | LOW | Live counter update on every collect event |
| Countdown timer | Fixed-round games must show time remaining; without it tension is absent | LOW | Large, visible, changes color/urgency near end (e.g., red at <15s) |
| Distinct flower growth states | Users must be able to tell states apart at a glance — this IS the game | MEDIUM | Clear visual differentiation: Bud vs Blooming vs Full Bloom vs Wilting vs Dead |
| Wrong-tap penalty feedback | Trừ điểm alone is not enough — player must feel the consequence | LOW | Screen shake, red flash, or negative score pop-up animation |
| Game over / results screen | Round end needs closure — score, highscore, play again | LOW | Standard for all time-limited games; missing it feels abrupt |
| Local high score persistence | Players return to beat their own score; without it there's no session-to-session hook | LOW | `localStorage` is sufficient for v1 |
| New game / restart | Players must be able to replay immediately | LOW | Single tap restart from results screen |
| Combo counter display | Combo system without a visible counter is invisible and wastes its motivational value | LOW | Show current combo multiplier prominently, animate on increase |

### Differentiators (Competitive Advantage)

Features that set Bloom Tap apart from generic tappers. These map directly to the project's core value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Timing-skill harvest window (Nở Hé vs Nở Rực Rỡ) | Creates risk/reward depth absent in pure reaction tappers — wait longer for more points or play safe | MEDIUM | The "window" must be clearly communicated; timing arc per flower type needs careful balance testing |
| 3-phase round escalation (0-40s / 40-80s / 80-120s) | Creates a natural emotional arc — casual ramp, strategic midgame, frantic endgame — within a single session | MEDIUM | Spawn rate, flower count, and cycle speed must each shift at phase boundaries; needs parametric tuning |
| Per-flower-type score and speed differentiation | 5 flower types with distinct risk/reward ratios gives implicit "build your own strategy" depth | MEDIUM | Rare fast high-value flower vs common slow low-value flower — without this all taps feel the same |
| Wrong-tap point deduction (not freeze/miss) | Penalizes rashness without stopping play; keeps round flow smooth while punishing mindless tapping | LOW | Decision already made in PROJECT.md; implementation is straightforward |
| Combo multiplier tied to correct taps only | Encourages deliberate accuracy over mash-speed; differentiates from pure speed games | LOW | Combo resets on wrong tap — this creates real tension between speed and accuracy |
| Grid spatial awareness | 8x8 grid means optimal play requires scanning the board, not just reacting to one cell | LOW | No extra implementation needed — it's a property of the grid layout itself |

### Anti-Features (Deliberately Excluded from v1)

Features that seem good but would harm v1 scope, focus, or stability.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Meta-progression / flower unlocks | "Games always have unlocks" — keeps players coming back | Requires save system, balance across unlock curve, UI for collection — multiplies scope 3-4x | Nail the core loop first; add unlocks in v1.1 once replay value of base game is proven |
| Online leaderboard | Social competition and bragging rights | Backend infra, auth, anti-cheat, GDPR concerns — enormous scope for unproven game | Local highscore first; add online board after FB Instant Games port |
| Multiple game modes | Variety keeps players engaged | Dilutes focus — each mode needs separate balance, UI, onboarding | Ship one mode perfectly; modes are v2 expansion |
| Daily challenges / quests | Drives daily retention | Requires server-side challenge generation or complex local scheduling | Irrelevant until retention loop is proven; out of scope for v1 |
| Tutorial / forced onboarding sequence | New-user comprehension | Adds state machine complexity and narrative investment before core is stable | Use implicit teaching: slow phase 0-40s is the natural tutorial — no explicit UI needed |
| Endless mode (no timer) | Some players prefer zen, non-pressured play | Requires difficulty ramp without time pressure — entirely different balance problem | 120s round with the three-phase arc IS the product; endless is a different game |
| Power-ups / special tiles | Adds excitement and "moments" | Scope explosion; each power-up needs own art, logic, balance — premature for v1 | The combo multiplier IS the power-up mechanic for v1 |
| Particle-heavy VFX from the start | Looks polished | Premature investment in art before gameplay is validated; Canvas particle systems eat mobile perf budget | Placeholder scale/flash animations; invest in VFX only after gameplay is confirmed fun |

---

## Game Feel Essentials ("Juice")

These are not gameplay features but are essential to making the game feel good. Missing these makes a mechanically correct game feel dead.

| Juice Element | What It Does | Complexity | Implementation Hint |
|---------------|--------------|------------|---------------------|
| Tap impact scale pulse | Cell briefly scales up then back on tap — satisfies the finger | LOW | CSS transform scale 1.0 → 1.25 → 1.0 over 100ms |
| Score pop-up float | "+120 x3" floats up and fades from the tapped cell | LOW | Absolutely-positioned DOM element or Canvas text, animate upward over 600ms |
| Combo counter "pop" | Combo number grows and bounces when it increases | LOW | Scale animation on counter element each time combo increments |
| Combo break flash | Screen-edge red flash when combo resets on wrong tap | LOW | Full-viewport overlay at low opacity for 150ms |
| Phase transition cue | Visual/audio signal when entering phase 2 and phase 3 | LOW | Brief flash, countdown text "FASTER!", color shift on background |
| Flower cycle micro-animation | Flowers should visually animate through growth states, not snap | MEDIUM | CSS keyframe or sprite sheet transitions between growth stages |
| Timer urgency escalation | Timer pulses or changes color in final 15 seconds | LOW | CSS animation on timer element when value < 15 |
| Results screen score count-up | Final score counts up to value rather than displaying instantly | LOW | `setInterval` tween over 1 second; creates anticipation |
| Wrong-tap screen shake | Brief camera shake reinforces penalty | LOW | `transform: translateX` oscillation over 300ms on game container |

---

## Feature Dependencies

```
[Flower Growth Cycle States]
    └──requires──> [Visual Differentiation per State]
                       └──required by──> [Tap Timing Skill Window]
                                             └──required by──> [Score Differentiation (Hé vs Rực Rỡ)]

[Combo System]
    └──requires──> [Correct Tap Detection]
    └──requires──> [Wrong Tap Detection]
    └──enhances──> [Combo Display Counter]
                       └──enhances──> [Combo Break Flash (juice)]

[3-Phase Escalation]
    └──requires──> [Spawn System with configurable rate]
    └──requires──> [Countdown Timer]
    └──enhances──> [Phase Transition Cue (juice)]

[Results Screen]
    └──requires──> [Score System]
    └──requires──> [Local Highscore Storage]

[Score Pop-up (juice)]
    └──requires──> [Score System]

[Tap Impact Scale (juice)]
    └──requires──> [Tap Registration on Grid Cells]
```

### Dependency Notes

- **Flower Growth Cycle requires Visual Differentiation:** Players cannot play without being able to read state at a glance. Art fidelity of states is a gameplay prerequisite, not decoration.
- **Combo System requires both Correct and Wrong Tap Detection:** The combo break on wrong tap is what gives the combo tension. Without penalty, combo becomes trivial.
- **3-Phase Escalation requires Spawn System parameterization:** Hardcoded spawn logic cannot support three distinct phases. Spawn rate, max simultaneous flowers, and flower cycle speed must be data-driven from the start.
- **Results Screen requires Local Highscore Storage:** The highscore comparison is the emotional payoff of the results screen; implement both together.
- **Juice elements require their parent feature:** Never implement juice before the mechanic it annotates; juice without function is wasted work.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the core loop.

- [ ] 8x8 grid rendering with individual cell tap zones — core interaction surface
- [ ] Flower spawn system with configurable rate (supports 3-phase parameterization)
- [ ] 5 flower types, each with distinct cycle speed and base point value
- [ ] 5 growth states per flower: Bud / Blooming / Full Bloom / Wilting / Dead
- [ ] Tap registration: correct window (Blooming, Full Bloom) vs wrong (Bud, Wilting, Dead)
- [ ] Score delta on correct tap (positive, Full Bloom > Blooming) and wrong tap (negative)
- [ ] Combo counter: increments on correct tap, resets on wrong tap
- [ ] Combo multiplier applied to score on collect
- [ ] 120-second countdown timer
- [ ] 3-phase escalation (spawn rate + cycle speed shift at 40s and 80s marks)
- [ ] Realtime score display
- [ ] Results screen (score, highscore comparison, restart)
- [ ] Local highscore via localStorage
- [ ] Essential juice: tap scale pulse, score float pop-up, combo break flash, timer urgency color

### Add After Validation (v1.x)

Features to add once core loop is confirmed fun.

- [ ] Phase transition visual/audio cue — adds arc without changing mechanics
- [ ] Results screen score count-up animation — improves results screen feel
- [ ] Flower cycle micro-animations (sprite transitions) — investment after art is proven
- [ ] Sound effects (tap, combo, wrong, phase change, game over) — audio doubles perceived quality
- [ ] Screen shake on wrong tap — reinforces penalty, low effort

### Future Consideration (v2+)

Defer until product-market fit is established.

- [ ] Meta-progression / flower unlocks — requires validated replay loop first
- [ ] Online leaderboard — requires backend infra, validated audience first
- [ ] Multiple game modes — requires core mode to be demonstrably strong
- [ ] Daily challenges / seasonal content — requires retention data to justify
- [ ] In-app purchase / monetization hooks — requires audience and retention first
- [ ] FB Instant Games / mobile app packaging — requires stable gameplay first

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Grid tap registration | HIGH | LOW | P1 |
| Flower growth cycle (5 states) | HIGH | MEDIUM | P1 |
| Visual state differentiation | HIGH | MEDIUM | P1 |
| Score system (correct/wrong delta) | HIGH | LOW | P1 |
| Combo system with multiplier | HIGH | LOW | P1 |
| 120s countdown timer | HIGH | LOW | P1 |
| 3-phase spawn escalation | HIGH | MEDIUM | P1 |
| Results screen + local highscore | HIGH | LOW | P1 |
| Tap scale pulse (juice) | MEDIUM | LOW | P1 |
| Score float pop-up (juice) | MEDIUM | LOW | P1 |
| Combo break flash (juice) | MEDIUM | LOW | P1 |
| Timer urgency color change (juice) | MEDIUM | LOW | P1 |
| Phase transition cue (juice) | MEDIUM | LOW | P2 |
| Sound effects | HIGH | MEDIUM | P2 |
| Flower sprite transition animations | MEDIUM | MEDIUM | P2 |
| Results score count-up (juice) | LOW | LOW | P2 |
| Screen shake on wrong tap (juice) | MEDIUM | LOW | P2 |
| Meta-progression / unlocks | HIGH (long-term) | HIGH | P3 |
| Online leaderboard | MEDIUM | HIGH | P3 |
| Multiple game modes | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch — core loop is broken without it
- P2: Should have — add in v1.x once core is validated
- P3: Nice to have — v2+, requires validated audience

---

## Competitor Feature Analysis

Note: Competitor analysis is based on training knowledge of the casual tapping genre (e.g., Tap Titans, Fruit Ninja, Tap My Katamari, Cookie Clicker). Confidence MEDIUM — not verified against current App Store state.

| Feature | Generic Tapper (e.g., Tap Titans) | Fruit Ninja-style | Bloom Tap Approach |
|---------|----------------------------------|-------------------|--------------------|
| Core interaction | Tap anywhere / tap one target | Swipe to hit | Tap specific grid cell at right timing window |
| Scoring depth | Tap volume (DPS) | Accuracy + streak | Timing accuracy + combo chain |
| Session structure | Infinite, idle | Infinite rounds | Fixed 120s round with 3-phase arc |
| Wrong-tap penalty | Rare or none | Miss = no score | Wrong tap = negative score + combo break |
| Progression | Meta-progression central | None (arcade) | v1: score/highscore only; unlocks deferred |
| Grid / spatial | No grid | No grid | 8x8 grid creates scan-and-choose decision layer |
| Depth driver | Character/gear upgrades | Speed mastery | Timing skill + grid scanning + combo management |

Bloom Tap's differentiator is the **intersection of timing skill and spatial scanning** — neither pure idle tapper nor pure reflex game. The combo system adds an accuracy layer that generic tappers lack.

---

## Sources

- PROJECT.md (project requirements and decisions) — PRIMARY
- Training knowledge: Casual mobile game design patterns (Cookie Clicker, Fruit Ninja, Tap Titans, Crossy Road, casual HTML5 genre conventions) — MEDIUM confidence
- Game feel / "juice" principles: Martin Jonasson & Petri Purho "Juice It Or Lose It" GDC talk (2012, still canonical) — HIGH confidence for juice patterns
- Timed round structure: well-established in casual games (Bejeweled Blitz 60s, Zuma, Peggle variants) — HIGH confidence pattern is table stakes

*Note: Web search was unavailable during this research session. Findings reflect training knowledge of the casual game design domain. Recommend verifying competitor App Store feature sets before final roadmap commitment.*

---

*Feature research for: Bloom Tap — HTML5 casual tapping game*
*Researched: 2026-03-13*
