---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 04-session-loop
current_plan: 04-03 complete — ready for 04-04
status: planning
stopped_at: Completed 06-03-PLAN.md
last_updated: "2026-03-16T16:00:02.374Z"
progress:
  total_phases: 6
  completed_phases: 6
  total_plans: 18
  completed_plans: 18
  percent: 92
---

# Project State: Bloom Tap

**Last updated:** 2026-03-13
**Session:** Roadmap creation

---

## Project Reference

**Core value:** Cảm giác satisfying khi tap đúng thời điểm hoa nở rực rỡ — sự kết hợp giữa phản xạ nhanh và chiến thuật chọn hoa đúng lúc.

**What this is:** 120-second casual tapping game on an 8x8 grid. Flowers bloom through 5 states; players tap at the right moment to score. Wrong taps deduct points. Combo multiplier rewards accurate streaks. Three difficulty phases drive the emotional arc.

**Platform v1:** Web + Mobile — Cocos Creator + TypeScript (web export cho v1, mobile native export cho v2)

---

## Current Position

**Current phase:** 04-session-loop
**Current plan:** 04-03 complete — ready for 04-04
**Status:** Ready to plan

```
Progress: [█████████░] 92%
           |___________|___________|___________|___________|___________|
           Foundation  CoreLogic   Renderer    Session     Juice       Results
```

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases total | 6 |
| Phases complete | 0 |
| Requirements total (v1) | 29 |
| Requirements mapped | 29 |
| Requirements complete | 0 |
| Plans created | 0 |
| Plans complete | 0 |

---
| Phase 01-project-foundation P01 | 15 | 2 tasks | 5 files |
| Phase 02-core-game-logic P01 | 4 | 3 tasks | 11 files |
| Phase 02-core-game-logic P02 | 3min | 2 tasks | 4 files |
| Phase 03-renderer-and-input P00 | 3 | 1 tasks | 2 files |
| Phase 03-renderer-and-input P01 | 2 | 2 tasks | 3 files |
| Phase 03-renderer-and-input P02 | 269 | 2 tasks | 4 files |
| Phase 04 P01 | 5 | 2 tasks | 4 files |
| Phase 04-session-loop-and-scoring P02 | 8 | 2 tasks | 2 files |
| Phase 04-session-loop-and-scoring P03 | 8 | 1 tasks | 1 files |
| Phase 05-juice-and-polish P00 | 5 | 1 tasks | 2 files |
| Phase 05-juice-and-polish P01 | 25 | 3 tasks | 4 files |
| Phase 05-juice-and-polish P05-02 | 6 | 3 tasks | 2 files |
| Phase 06-results-and-persistence P01 | 2 | 2 tasks | 4 files |
| Phase 06-results-and-persistence P02 | 8 | 2 tasks | 2 files |
| Phase 06-results-and-persistence P03 | 5 | 2 tasks | 0 files |

## Key Decisions (Accumulated)

| Decision | Rationale | Phase |
|----------|-----------|-------|
| Cocos Creator + TypeScript | Mobile-native export (iOS/Android built-in) without Capacitor; TypeScript first-class; can still export web | Phase 1 |
| tsconfig extends ./temp/ not ./tmp/ | Cocos Creator 3.8.8 uses temp/ directory for tsconfig.cocos.json; plan had wrong path from older version docs | Phase 1 |
| BloomTap/ subfolder as project root | Cocos Creator creates its own subfolder; nested .git removed for unified repo tracking | Phase 1 |
| Pure logic tier before rendering | FlowerFSM, Grid, ComboSystem testable without browser; prevents logic-in-renderer | Phase 2 |
| Timestamp-based state derivation | Prevents timer drift over 120s session; must be architected in Phase 2, cannot retrofit | Phase 2 |
| Object pools for all 64 flower slots | Prevents GC spikes during Phase 3 heavy spawning; must be in Phase 3 before load testing | Phase 3 |
| StorageService abstraction over localStorage | Enables clean FB Instant Games swap later; implement at Phase 6, not retrofitted | Phase 6 |
| Juice deferred to Phase 5 | Juice without stable mechanics is wasted work; every effect has a parent mechanic | Phase 5 |
| FB Instant Games deferred to post-v1 | Different init architecture; isolated swap if codebase structured correctly | Post-v1 |
| build-templates/ at BloomTap/ (Cocos project root) | Cocos Creator reads build-templates relative to project.json location, not workspace root | Phase 1 |
| director.loadScene in onLoad() for BootController | Fires before first render — no delay, no dependency on other components | Phase 1 |
| npm project root at workspace root (not BloomTap/) | BloomTap/package.json is Cocos Creator metadata file, not npm package | Phase 2 |
| getScore() uses inclusive tap window [0, tapWindowMs] | Plan test requires getScore(budMs+tapWindowMs) ≈ scoreFull; getState() returns WILTING at that point, so score must compute independently | Phase 2 |
| tsconfig.test.json standalone (no Cocos extends) | Extending Cocos tsconfig causes cc virtual module resolution errors in Vitest/Node | Phase 2 |
| ComboSystem._step as mutable instance variable | Resets to 0.5 on onWrongTap(); computing step from tapCount range breaks after reset (RESEARCH.md Pitfall 4) | Phase 2 |
| PHASE_CONFIGS as module-level constant in SpawnManager | Immutable, shared, initialized once — not a class field that could be mutated or re-instantiated | Phase 2 |
| getPhaseConfig fallback at >= 120000ms returns Phase 3 | Session loop calls at exact boundary; defensive fallback prevents crash at session end | Phase 2 |
| ComboSystem passed per-method to GameState (not constructor injection) | GameController owns combo instance; test isolation — pass fresh ComboSystem per test case without resetting | Phase 3 |
| Score can go negative (no floor at 0 on wrong-tap) | Intentional game design per plan spec: applyWrongTap subtracts penalty without floor | Phase 3 |
| Math.round() on rawScore * multiplier delta | Prevents float accumulation (e.g., 80*1.5=119.9999 → rounds to 120) in score display | Phase 3 |
| type-only import for GameController in GridRenderer | Avoids circular runtime dependency while preserving compile-time type safety; actual instance arrives via init() | Phase 3 |
| FlowerColors.ts as neutral flash-color module | Prevents circular dep: GridRenderer and GameController both import CORRECT_FLASH_YELLOW/WHITE/WRONG_FLASH_COLOR from it | Phase 3 |
| isGameOver uses inclusive boundary (>=) | Session ends at exactly 120_000ms elapsed, matching plan spec and getPhaseConfig fallback pattern | Phase 4 |
| clearAll() iterates _cells directly | Avoids readonly cast on getCells(); consistent with existing clearCell() pattern | Phase 4 |
| SessionPhase enum at module scope (not class field) | Accessible in scheduleOnce arrow closures without 'this' binding issues | Phase 4 |
| Input gate uses flag pattern not listener add/remove | Avoids duplicate TOUCH_START listener risk on repeat sessions; listeners registered once in _buildCellViews() | Phase 4 |
| Button @property refs target Button-component-node (not Label child) | GameController.onLoad() registers CLICK via node.on(Button.EventType.CLICK) — the node bearing cc.Button is what resolves the event | Phase 4 |
| WRONG_TAP_DISPLAY_PENALTY = -10 (not -30) | Verified against actual GameState.WRONG_TAP_PENALTY = 10; plan's example used wrong value | Phase 5 |
| Timer urgency stage transitions are instant | No color tween between stages per CONTEXT.md; blink interval 250ms; scale factors 1.0x/1.2x/1.4x/1.6x | Phase 5 |
| jsdom devDependency added at Phase 6 | Required by vitest for localStorage in jsdom environment override (// @vitest-environment jsdom header in test files) | Phase 6 |
| peakStreak captured AFTER combo.onCorrectTap() | tapCount is incremented inside onCorrectTap(); must capture peak after the call so count reflects the new tap | Phase 6 |

---

## Architecture Notes

- **FlowerFSM:** Per-cell state machine, 5 states, timing via `performance.now()` spawn timestamp — NOT delta accumulation
- **Grid:** Flat 64-cell array owning FlowerFSM instances; provides random empty cell picker
- **SpawnManager:** Phase-table-driven; reads elapsed time to select active phase config
- **ComboSystem:** Streak counter with multiplier lookup; resets on wrong tap
- **GameState:** Session state (score, timer, phase, combo); fresh instance per game start
- **Renderer:** Read-only consumer of state; never mutates
- **InputHandler:** Translates touch/pointer events to (row, col) grid coords; no game rule knowledge
- **AnimationSystem:** Pooled short-lived effects (tap pulse, score float, combo flash)

---

## Critical Pitfalls (Must Not Repeat)

1. **Touch on `touchend`/`click` instead of `pointerdown`** — 100-300ms latency on mobile; invalidates all timing balance
2. **Delta-time accumulation for flower timers** — drifts ±50ms over 120s; use timestamp-based derivation
3. **Creating/destroying Node objects in hot loop** — GC spikes in Phase 3; pre-create all 64 slots at init
4. **DPR not handled** — blurry on all Retina/high-DPI devices; Cocos Creator handles this natively via design resolution
5. **Missing touch-action: none on web canvas** — viewport scroll instead of tap registration on mobile web export
6. **AudioContext before user gesture** — silent on iOS Safari; "Tap to Start" splash must unlock audio before game loop

---

## Accumulated TODOs

- [ ] Verify Cocos Creator stable version trước khi tạo project (research cần xác nhận version)
- [ ] Verify FB SDK version (research used 7.1) và bundle size limit trước FB port phase
- [ ] Physical device test for flower state visual differentiation at 375px viewport (iPhone SE) — cannot validate until Phase 3
- [ ] Phase timing balance (40s/80s/120s boundaries and spawn rate deltas) — validate via playtesting in Phase 4

---

## Blockers

None currently.

---

## Session Continuity

Last session: 2026-03-16T16:00:02.370Z
Stopped at: Completed 06-03-PLAN.md
Resume file: None

Phase 3 complete: All 4 plans executed (03-00 through 03-03). 64-cell grid renders, touch input wired, tap dispatch functional, 5 flower states visually distinct. Ready to plan Phase 4 (Session Loop).

---

*State initialized: 2026-03-13*
*Last updated: 2026-03-14 after Phase 2 planning*
