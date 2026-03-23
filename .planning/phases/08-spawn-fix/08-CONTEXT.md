# Phase 8: Spawn Fix — Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Flowers appear on the board the moment the player taps Start — no empty 3-second opening. The initial burst count is configurable from JSON. Countdown overlay (3→2→1) is kept for UX but runs with flowers already visible.

</domain>

<decisions>
## Implementation Decisions

### Countdown behavior
- **D-01:** Keep the 3→2→1 countdown. Spawn the initial burst **immediately when player taps Start** (before countdown begins) — board is populated while countdown runs.
- **D-02:** Input remains locked during countdown (no change from current behavior). Player sees flowers cycling on the board but cannot tap until PLAYING phase begins.

### initialCount field in JSON
- **D-03:** `initialCount` lives in `spawnPhases[0]` in `flowers.json` (alongside `startMs`, `endMs`, `intervalMs`, `maxAlive`, `spawnBatch`, `weights`).
- **D-04:** Only `spawnPhases[0]` needs `initialCount` — other phases don't use it. Schema validation must accept `initialCount` as optional on phases 1 and 2, required on phase 0.

### Initial burst composition
- **D-05:** Initial burst uses `spawnPhases[0]` weights (random weighted selection) — same logic as regular phase 1 spawn. No special "easy flower" bias.
- **D-06:** Initial burst respects `maxAlive` from `spawnPhases[0]` — do not exceed the cap even if `initialCount` is larger.

### Claude's Discretion
- Where in `_onStartTapped()` or a new helper the initial burst call lives
- Whether initial burst is a loop calling existing grid.spawnFlower() or a new SpawnManager method
- Test coverage strategy for the new `initialCount` field in parseGameConfig

</decisions>

<specifics>
## Specific Ideas

- No specific visual references — standard spawn behavior, same as regular spawn cycle
- "Flowers visible while countdown runs" is the observable outcome

</specifics>

<canonical_refs>
## Canonical References

No external specs — requirements are fully captured in decisions above.

### Relevant existing files
- `BloomTap/assets/scripts/GameController.ts` — `_onStartTapped()` (line ~401), `_startCountdown()` (line ~405), `_beginSession()` (line ~423); initial burst call goes in `_onStartTapped()` before `_startCountdown()`
- `BloomTap/assets/scripts/logic/SpawnManager.ts` — `pickFlowerType()` and `getPhaseConfig()` are reusable; `PHASE_CONFIGS` already has `initPhaseConfigs()` override from Phase 7
- `BloomTap/assets/resources/config/flowers.json` — `spawnPhases[0]` needs new `initialCount` field
- `BloomTap/assets/scripts/logic/GameConfig.ts` — `parseGameConfig()` schema validation needs to accept `initialCount` on phase 0

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `grid.spawnFlower(cell, config, nowMs)` + `gridRenderer.setCellTypeId()` pair: already used in `update()` spawn loop — initial burst reuses same pattern
- `spawnManager.pickFlowerType(elapsedMs)`: pass `0` for elapsedMs to get phase 1 weights
- `grid.getRandomEmptyCell()` + `grid.getAliveCount()`: already used, safe to call before PLAYING phase

### Established Patterns
- Spawn loop pattern in `update()` (lines 131–144): `for (let i = 0; i < count; i++) { if (aliveCount >= maxAlive) break; ... }` — initial burst mirrors this loop exactly
- `_nextSpawnMs` is set in `_beginSession()` to ensure regular spawn cycle starts at frame 1 of PLAYING — initial burst does NOT affect this timer

### Integration Points
- `_onStartTapped()` → add initial burst call here (before `_startCountdown()`)
- `BootController` loads config before `GameScene` — `initPhaseConfigs()` will have run by the time `_onStartTapped()` fires, so `PHASE_CONFIGS[0].initialCount` is available

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-spawn-fix*
*Context gathered: 2026-03-21*
