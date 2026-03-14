---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: None started (roadmap just created)
current_plan: None
status: Ready to begin Phase 1
stopped_at: Completed 01-01-PLAN.md — Phase 1 Plan 01 done
last_updated: "2026-03-14T04:15:29.714Z"
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 4
  completed_plans: 1
  percent: 25
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

**Current phase:** 01-project-foundation
**Current plan:** Plan 01 complete — Plan 02 next
**Status:** Phase 1 in progress (1/2 plans complete)

```
Progress: [███░░░░░░░] 25%
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

Last session: 2026-03-14T04:15:29.711Z
Stopped at: Completed 01-01-PLAN.md — Phase 1 Plan 01 done
Resume file: None

Phase 1 Plan 01 complete. Phase 1 Plan 02 next: `/gsd:execute-phase 1`
Phase 2 ready after Phase 1 complete: `/gsd:execute-phase 2`

---

*State initialized: 2026-03-13*
*Last updated: 2026-03-14 after Phase 2 planning*
