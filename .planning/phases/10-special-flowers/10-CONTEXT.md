# Phase 10: Special Flowers - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Special power-up flowers appear randomly on the board — tapping one activates one of three timed effects: score multiplier, freeze timer, or slow flower growth. Tapping a new special flower replaces any active effect (replacement semantics, no stacking). Pity mechanic deferred.

</domain>

<decisions>
## Implementation Decisions

### Special flower identity
- **D-01:** Special flower = **cell transformation** — `cell_empty.png` background is replaced by an effect-specific cell sprite. The flower itself (CHERRY, LOTUS, etc.) renders normally on top.
- **D-02:** 3 cell sprites, one per effect type:
  - `cell_fire` → SCORE_MULTIPLIER
  - `cell_freeze` → TIME_FREEZE
  - `cell_grass` → SLOW_GROWTH
- **D-03:** Cell sprite appears at spawn time — visible from BUD state. Player knows which effect they'll receive before tapping.
- **D-04:** `Cell` interface gains `isSpecial: boolean` and `specialEffect: EffectType | null`. Both reset to `false`/`null` in `clearCell()` and `clearAll()`.

### Effect stacking policy
- **D-05:** **Replacement semantics** — tapping a new special flower replaces any currently active effect (regardless of type). Only 1 effect active at a time. (REQUIREMENTS.md §Out-of-Scope: "Multiple simultaneous power-up effects")
- **D-06:** Tapping same effect type while active → resets that effect's timer.

### Tap rules
- **D-07:** Tapping a special flower at correct bloom stage (FULL_BLOOM) → regular score + activates power-up effect.
- **D-08:** Tapping a special flower at wrong state (BUD/BLOOMING/WILTING/DEAD) → same wrong-tap penalty + combo reset as a regular flower. Cell sprite stays visible until flower is cleared.

### Effect: SCORE_MULTIPLIER
- **D-09:** Multiplier scales with spawn phase — Phase 1 → x2, Phase 2 → x3, Phase 3 → x5 (configurable from JSON). Duration ~6s configurable.
- **D-10:** Applied as extra layer: `rawScore * combo.multiplier * powerUpMultiplier`.

### Effect: TIME_FREEZE
- **D-11:** Only the countdown timer freezes — flowers continue cycling normally.
- **D-12:** Implementation: shift `sessionStartMs` each frame while active (rolling offset, consistent with `_applyPauseOffset` pattern). Duration ~5s configurable.

### Effect: SLOW_GROWTH
- **D-13:** Only newly spawned flowers during the effect window receive a modified `cycleDurationMs` (spawn-time config copy). Live flowers are not mutated.
- **D-14:** `slowGrowthFactor` multiplies `cycleDurationMs` at spawn time (e.g. 2.0 = double cycle). Duration ~8s configurable.

### HUD indicator
- **D-15:** When an effect is active, show a single HUD element with: effect icon (cell sprite) + circular countdown timer. Hidden when no effect active.
- **D-16:** When effect expires, HUD hides immediately — no animation.
- **D-17:** Pause freezes effect timer; resume continues from remaining duration.

### Spawning
- **D-18:** Each flower spawn has `specialChance`% probability to be marked special (configurable from JSON, default 8%). Effect type assigned randomly at spawn time.
- **D-19:** Pity mechanic (POLISH-03) is **deferred** — not in Phase 10.

### Claude's Discretion
- Circular timer render technique (ProgressBar vs Graphics arc)
- `PowerUpState` internal data structure
- Exact `specialChance` default value
- TIME_FREEZE rolling offset — `sessionStartMs += deltaPerFrame` each frame while active

</decisions>

<specifics>
## Specific Ideas

- Cell background swap is the visual signal — no separate overlay icon on the flower needed
- `cell_fire`, `cell_freeze`, `cell_grass` sprites already exist in `resources/flowers/` (user-provided)
- Player can read the cell before tapping — strategic choice about whether to tap at FULL_BLOOM

</specifics>

<canonical_refs>
## Canonical References

No external specs — requirements fully captured in decisions above.

### Requirements
- `.planning/REQUIREMENTS.md` §SPECIAL-01 — spawn frequency, visual distinction
- `.planning/REQUIREMENTS.md` §SPECIAL-02 — score multiplier effect
- `.planning/REQUIREMENTS.md` §SPECIAL-03 — freeze timer effect
- `.planning/REQUIREMENTS.md` §SPECIAL-04 — slow growth effect
- `.planning/REQUIREMENTS.md` §Out-of-Scope — "Multiple simultaneous power-up effects: replacement semantics only"

### Key source files
- `BloomTap/assets/scripts/logic/Grid.ts` — `Cell` interface (add `isSpecial`, `specialEffect`), `spawnFlower()`, `clearCell()`, `clearAll()`
- `BloomTap/assets/scripts/logic/GameState.ts` — `sessionStartMs`, `applyCorrectTap()` — TIME_FREEZE shifts `sessionStartMs`; SCORE_MULTIPLIER adds multiplier layer
- `BloomTap/assets/scripts/logic/GameConfig.ts` — `parseGameConfig()` — needs new `powerUps` config section
- `BloomTap/assets/scripts/logic/SpawnManager.ts` — `pickFlowerType()` — special decision happens after this call in GameController
- `BloomTap/assets/scripts/GameController.ts` — `update()`, `_applyPauseOffset()`, `handleCorrectTap()`, spawn loop
- `BloomTap/assets/scripts/GridRenderer.ts` — reads `cell.isSpecial` / `cell.specialEffect` to swap cell background sprite
- `BloomTap/assets/resources/config/flowers.json` — add `powerUps` block

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `_applyPauseOffset(deltaMs)`: shifts `sessionStartMs` + flower timestamps + `_nextSpawnMs` — TIME_FREEZE rolling offset follows same pattern
- `Grid.spawnFlower(cell, config, nowMs)`: accepts `FlowerTypeConfig` — SLOW_GROWTH passes modified config copy with extended `cycleDurationMs`
- `GameState.applyCorrectTap(rawScore, combo)`: `rawScore * combo.multiplier` — SCORE_MULTIPLIER adds `* powerUpMultiplier` layer
- `GridRenderer._buildCellViews()`: already creates `bgNode` with Sprite — needs to swap `spriteFrame` when `cell.isSpecial`
- `GridRenderer._spriteFrames`: existing sprite loading pattern (`_loadAsSpriteFrame`) can load cell sprites

### Established Patterns
- Pure logic tier (no `cc` imports): `PowerUpState` must follow — enables Vitest testing
- Timestamp-based time model: all time derived from `nowMs - sessionStartMs`
- Config-driven via JSON + `parseGameConfig()`: new `powerUps` section follows same `requirePositiveNumber` validation pattern
- `Cell.isSpecial` reset discipline: `clearCell()` and `clearAll()` must reset both flags

### Integration Points
- `update()`: tick `PowerUpState` each frame, apply TIME_FREEZE rolling offset if active
- `handleCorrectTap()`: if `cell.isSpecial`, call `powerUpState.activate(effect, nowMs)` after scoring
- `_applyPauseOffset(deltaMs)`: also shift `powerUpState.expiryMs += deltaMs`
- `GridRenderer.refreshCell()`: swap `bgNode` spriteFrame based on `cell.isSpecial` + `cell.specialEffect`

</code_context>

<deferred>
## Deferred Ideas

- **Pity mechanic (POLISH-03)**: guarantee 1 special every 30s — deferred to Phase 11 or later
- **Tapping special at wrong stage**: currently same penalty as regular wrong tap — could have different feedback in future
- **Effect stacking / 3 simultaneous slots**: explicitly Out of Scope per REQUIREMENTS.md (v2+)

</deferred>

---

*Phase: 10-special-flowers*
*Context gathered: 2026-03-22*
