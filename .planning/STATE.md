---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Polish & Power-ups
status: unknown
stopped_at: Completed 11-02-PLAN.md
last_updated: "2026-03-24T09:24:32.314Z"
progress:
  total_phases: 6
  completed_phases: 5
  total_plans: 10
  completed_plans: 10
---

# Project State: Bloom Tap

**Last updated:** 2026-03-21
**Session:** Phase 7 Plan 02 complete — BootController wired + init functions added, 171/171 tests passing; human-verify checkpoint approved (all 6 steps passed in Cocos Editor)

---

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** Cảm giác satisfying khi tap đúng thời điểm hoa nở rực rỡ — sự kết hợp giữa phản xạ nhanh và chiến thuật chọn hoa đúng lúc.
**Current focus:** Phase 11 — bug-fixes-and-refactors

---

## Current Position

Phase: 12
Plan: Not started

## Performance Metrics

**Velocity (v1.1):**

- Total plans completed: 1
- Average duration: ~15 min
- Total execution time: ~15 min

*Updated after each plan completion*

---

## Accumulated Context

### Decisions

Recent decisions affecting v1.1 work:

- [v1.1 Arch]: Use `_applyPauseOffset(ms)` centralized pattern — pause, freeze-time, and slow-growth all shift timestamps in one pass; never scatter offset logic across call sites
- [v1.1 Arch Phase 7]: Config loaded via `resources.load()` (async callback in BootController) — `@property JsonAsset` overridden per CONTEXT.md Decision 3 (requires assets/resources/ path)
- [v1.1 Arch]: SLOW_GROWTH applies via spawn-time config copy (new flowers get modified cycleDurationMs) — do NOT mutate live FlowerFSM timestamps
- [v1.1 Arch]: Power-up replacement semantics only — new tap replaces active effect; never stack two effects simultaneously
- [v1.1 Arch]: `director.pause()` confirmed broken (CC bug #11144) — use manual flag + `_applyPauseOffset()` instead
- [07-01 Config]: parseGameConfig accepts unknown (not string) — Cocos JsonAsset.json returns parsed objects; id injected from key at parse time; wrongTapPenalty and spawn weights allow zero via requireNonNegativeNumber
- [07-02 Config]: initFlowerConfigs mutates FLOWER_CONFIGS in place (not reassign) — same reference, test defaults preserved; WRONG_TAP_PENALTY/SESSION_DURATION_MS changed to let for live binding propagation; resources.load path omits .json extension (Cocos requirement)
- [Phase 07-config-infrastructure]: initFlowerConfigs mutates FLOWER_CONFIGS in place (not reassign) — tests import the same object reference and see defaults when init is not called
- [Phase 08-spawn-fix]: initialCount optional in SpawnPhaseConfig — required enforcement by GameConfig parser on phase index 0 only
- [Phase 08-spawn-fix]: _spawnInitialBurst() called before _startCountdown() — flowers appear on board before countdown overlay (D-01)
- [Phase 09-pause-system]: Remove readonly from _spawnTimestamp in FlowerFSM to allow shiftTimestamp() mutation — controlled via public API only
- [Phase 09-pause-system]: SessionPhase.PAUSED as enum value (not boolean flag) — consistent with existing state machine; do NOT call _stopAllJuiceAnimations on pause (resets _urgencyStage); _applyPauseOffset() shifts all timestamps in one pass
- [Phase 09-pause-system]: GridRenderer.freezeAt() added post-UAT — Cocos render loop is independent of update(); flowers kept progressing visually without pinning render timestamp during pause
- [Phase 10-special-flowers]: PowerUpState uses expiry timestamps — isActive = expiry > nowMs; shiftExpiries shifts all 4 fields (3 expiries + lastSpecialSpawnMs) for pause compatibility
- [Phase 10-special-flowers]: applySlowGrowthConfig returns spread+Math.round copy — never mutates live config; powerUpMultiplier defaults to 1 in applyCorrectTap for full backward compatibility
- [Phase 10-special-flowers]: TIME_FREEZE per-frame: sessionStartMs += dt*1000; expiries NOT shifted during normal play (absolute timestamps)
- [Phase 10-special-flowers]: initPowerUpConfig() public on GameController allows BootController to override fallback defaults after JSON load
- [Phase 10-special-flowers]: Special overlay drawn after _paintState in GridRenderer so it renders on top of flower color
- [Phase 10-special-flowers]: PowerUpHUDRenderer reads PowerUpState via tick(powerUpState, nowMs) — pure read, no mutation
- [Phase 10-special-flowers]: BootController.gameController @property added to enable initPowerUpConfig call before scene load
- [Phase 10]: PowerUpState uses expiry timestamps — isActive = activeEffect !== null && nowMs < expiryMs; shiftExpiry shifts expiry for pause compatibility
- [Phase 10]: applySlowGrowthConfig returns spread+Math.round copy — never mutates live config; powerUpMultiplier defaults to 1 in applyCorrectTap for full backward compatibility
- [Phase 10-special-flowers]: TIME_FREEZE advances sessionStartMs BEFORE elapsedMs calculation — timer display freezes correctly
- [Phase 10-special-flowers]: GridRenderer._refreshCellBg uses _lastIsSpecial dirty check — avoids redundant spriteFrame writes each frame
- [Phase 10-special-flowers]: PowerUpHUDRenderer hides immediately on effect expiry (node.active=false, D-16) — no animation
- [Phase 10-special-flowers]: BootController passes powerUps config only when present in JSON — falls back to hardcoded defaults in GameController
- [Phase 11-bug-fixes-and-refactors]: [11-01] applySlowGrowthConfig modifies budMs/tapWindowMs/bloomingMs/fullBloomMs — the fields FlowerFSM.getState() reads
- [Phase 11-bug-fixes-and-refactors]: [11-01] getMilestoneLabel mutates triggered Set; _checkMilestone passes tapCount directly to _playMilestoneCelebration since tapCount IS the threshold when label is returned
- [Phase 11]: Score float count-up tween targets plain JS object {value} — Cocos tween supports any object with numeric properties; runs parallel to position/opacity tweens with no conflict
- [Phase 11]: Score float ×N suffix replaced with count-up animation (base → final over 0.4s cubicOut) after human verification — more satisfying visual of real-time multiplication

### Tech Debt Carried Forward (from v1.0)

1. JuiceHelpers.getUrgencyStage() / getMilestoneLabel() unused — addressed by FIX-03 in Phase 11
2. HUD-03: comboLabel shows tapCount not multiplier.toFixed(1) — addressed by FIX-01 in Phase 11
3. Phase 3 missing VERIFICATION.md (covered by human checkpoint)
4. All 6 v1.0 VALIDATION.md files in draft state

### Blockers/Concerns

- [Phase 9]: Cocos `schedule()`/`unschedule()` behavior during pause is MEDIUM confidence — verify empirically that `this.unschedule(blinkCallback)` stops urgency blink without deactivating the game node
- [Phase 10]: TIME_FREEZE per-frame rolling offset is novel in this codebase — recommend proof-of-concept before full SPECIAL-03 implementation
- [Phase 12]: Layer vs replace decision for Sprite + Graphics must be made before any SpriteFrames are wired — undefined draw order if both exist on same node

---

## Session Continuity

Last session: 2026-03-23T16:27:38.542Z
Stopped at: Completed 11-02-PLAN.md
Resume file: None

---

*State initialized: 2026-03-13*
*Last updated: 2026-03-21 after 07-01 plan execution*
