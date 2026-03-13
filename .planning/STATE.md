# Project State: Bloom Tap

**Last updated:** 2026-03-13
**Session:** Roadmap creation

---

## Project Reference

**Core value:** Cảm giác satisfying khi tap đúng thời điểm hoa nở rực rỡ — sự kết hợp giữa phản xạ nhanh và chiến thuật chọn hoa đúng lúc.

**What this is:** 120-second casual tapping game on an 8x8 grid. Flowers bloom through 5 states; players tap at the right moment to score. Wrong taps deduct points. Combo multiplier rewards accurate streaks. Three difficulty phases drive the emotional arc.

**Platform v1:** Web (HTML5) — Phaser 3 + TypeScript + Vite

---

## Current Position

**Current phase:** None started (roadmap just created)
**Current plan:** None
**Status:** Ready to begin Phase 1

```
Progress: [ ] Phase 1  [ ] Phase 2  [ ] Phase 3  [ ] Phase 4  [ ] Phase 5  [ ] Phase 6
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

## Key Decisions (Accumulated)

| Decision | Rationale | Phase |
|----------|-----------|-------|
| Phaser 3 + TypeScript + Vite | Community standard for HTML5 casual; official TS types; fastest dev loop | Phase 1 |
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
- **InputHandler:** Translates `pointerdown` canvas coords to (row, col); no game rule knowledge
- **AnimationSystem:** Pooled short-lived effects (tap pulse, score float, combo flash)

---

## Critical Pitfalls (Must Not Repeat)

1. **Touch on `touchend`/`click` instead of `pointerdown`** — 100-300ms latency on mobile; invalidates all timing balance
2. **Delta-time accumulation for flower timers** — drifts ±50ms over 120s; use timestamp-based derivation
3. **Creating/destroying Phaser GameObjects in hot loop** — GC spikes in Phase 3; pre-create all 64 slots at init
4. **DPR not set at game creation** — blurry on all Retina/high-DPI devices; requires coordinate system recalc to fix later
5. **Missing `touch-action: none` on canvas** — viewport scroll instead of tap registration on mobile
6. **AudioContext before user gesture** — silent on iOS Safari; "Tap to Start" splash must unlock audio before game loop

---

## Accumulated TODOs

- [ ] Verify current Phaser stable version before `npm install` (research used 3.87.x, may be outdated)
- [ ] Verify FB SDK version (research used 7.1) and 200KB bundle limit before FB port phase
- [ ] Physical device test for flower state visual differentiation at 375px viewport (iPhone SE) — cannot validate until Phase 3
- [ ] Phase timing balance (40s/80s/120s boundaries and spawn rate deltas) — validate via playtesting in Phase 4

---

## Blockers

None currently.

---

## Session Continuity

To resume: run `/gsd:plan-phase 1` to begin planning Phase 1 (Project Foundation).

Phase 1 requirements: FOUND-01 (Phaser 3 + TS + Vite scaffold), FOUND-02 (mobile canvas DPR scaling), FOUND-03 (touch input non-scrolling pointerdown).

Phase 1 success criteria: project boots, canvas fills mobile viewport without blur, touch fires on pointerdown without scrolling page.

---

*State initialized: 2026-03-13*
*Last updated: 2026-03-13 after roadmap creation*
