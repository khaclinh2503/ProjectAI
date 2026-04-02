---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: complete
stopped_at: Completed 14-02-PLAN.md
last_updated: "2026-04-02T00:00:00Z"
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 3
  completed_plans: 3
---

# Project State: Bloom Tap

**Last updated:** 2026-03-25
**Session:** v1.2 roadmap created — Phases 13–15 defined; ready to plan Phase 13

---

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-25)

**Core value:** Cảm giác satisfying khi tap đúng thời điểm hoa nở rực rỡ — sự kết hợp giữa phản xạ nhanh và chiến thuật chọn hoa đúng lúc.
**Current focus:** Phase 14 — lobby-leaderboard-ui

---

## Current Position

Phase: 14 (lobby-leaderboard-ui) — COMPLETE
Plan: 2 of 2 (all plans complete)

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
- [Phase 12-01]: getScoreFlashColor returns plain {r,g,b} object (no cc import) — caller constructs Color; maintains pure logic tier
- [Phase 12-01]: handleWrongTap separates streak>=2 (combo break, strong flash 89/255) from streak<2 (soft red flash 51/255) — no double-fire overlap
- [Phase 12]: [12-02 D-01] All score floats use punch-in + zigzag (not multiplier-only) — human feedback: universal effect feels better; multiplier still gets wider displacement + gold color
- [Phase 12]: [12-02 D-03] Punch-in scale by score: <10 no punch, <100 scale=5, >=100 scale=10 — proportional feedback based on score magnitude
- [Phase 13-leaderboardservice]: getRank uses filter-count approach — avoids timestamp identity fragility; _wouldQualify uses >= for equal-score boundary (D-08); sort: b.score-a.score || b.timestamp-a.timestamp for D-06 tiebreak
- [Phase 14-lobby-leaderboard-ui]: LobbyController checks getPlayerName() in onLoad (not start) to avoid one-frame overlay flicker
- [Phase 14-lobby-leaderboard-ui]: Toast uses Tween.stopAllByTarget for interrupt-and-restart behavior on shared Label node
- [Phase 14-lobby-leaderboard-ui]: LeaderboardController uses @property([Node]) rows array with getChildByName for fixed 10-row display

### v1.2 Architecture Notes

- LeaderboardService must have 0 cc imports — pure logic tier, testable with Vitest
- StorageService already uses bloomtap_ prefix and silent-fail — reuse for bloomtap_playerName and bloomtap_leaderboard keys
- LobbyScene is a new Cocos scene — BootController routes to it before GameScene
- ResultsScreen (existing, inside GameScene) needs rank display added — no new scene required for results
- Name input: use Cocos EditBox component in a modal-style node overlay on LobbyScene

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

Last session: 2026-04-02T00:00:00Z
Stopped at: Completed 14-02-PLAN.md
Resume file: None

---

*State initialized: 2026-03-13*
*Last updated: 2026-03-25 — v1.2 roadmap defined; total_phases set to 3*
