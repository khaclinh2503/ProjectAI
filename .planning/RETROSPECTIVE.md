# Retrospective

Living retrospective across all milestones. Most recent at top.

---

## Milestone: v1.0 MVP

**Shipped:** 2026-03-16
**Phases:** 6 | **Plans:** 18 | **Timeline:** 9 days (2026-03-07 → 2026-03-16)

### What Was Built

- Phase 1: Cocos Creator scaffold, TypeScript strict, mobile web build template
- Phase 2: Pure logic tier (FlowerFSM, Grid, ComboSystem, SpawnManager) — all TDD, no browser
- Phase 3: GridRenderer with 64 pooled nodes, tap dispatch, 5-state visual rendering, human verification
- Phase 4: 120s session loop, 3-phase escalation, HUD, SessionPhase state machine, human verification
- Phase 5: JuiceHelpers pure functions + full juice layer (pulse, float, flash, milestone, urgency), human verification
- Phase 6: StorageService + GameState stats extension + results screen, human verification

### What Worked

- **TDD-first for pure logic tier** — FlowerFSM, Grid, ComboSystem, SpawnManager all built with tests before any canvas work. Prevented a class of logic bugs that would have been painful to debug in Cocos runtime.
- **Object pool mandate from Phase 3** — Pre-allocating all 64 cell nodes AND the 8 score float labels in Phase 5 meant zero GC pauses during gameplay. Correct architectural decision made early.
- **Timestamp-based FSM** — Architectural decision in Phase 2 (no delta accumulation) eliminated timer drift entirely. Simple and correct.
- **Pure logic / renderer separation** — The cc-free logic tier let Vitest run everything in Node. 150 tests passing gave confidence to build fast in later phases.
- **Human verification checkpoints in 03-03, 04-04, 05-02, 06-03** — Caught real bugs (node layer 2D/3D mismatch, dead flower not cleared, score float anchor issue, GridContainer y-offset) that static analysis never would have.
- **StorageService abstraction** — Anticipating FB Instant Games port without over-engineering: one thin wrapper with bloomtap_ prefix and silent-fail. Clean.

### What Was Inefficient

- **JuiceHelpers inlining** — Plan 05-00 designed getUrgencyStage() and getMilestoneLabel() as pure helpers to be imported by GameController. Phase 05-02 execution reimplemented them inline instead. The tests for the helpers became dead code. Should have been caught in verification.
- **Phase 3 VERIFICATION.md never written** — Phase 3 is the only phase without a VERIFICATION.md. The human checkpoint (03-03-SUMMARY) covers the content, but the process gap will require a manual note at every future audit.
- **VALIDATION.md files all in draft** — Nyquist sign-off process was defined but never executed for any phase. All 6 VALIDATION.md files remain draft. Either the process should be run, or it should be explicitly opted out per phase.
- **ROADMAP.md staleness** — Phase 3 (4/4 plans done) and Phase 4 (4/4 plans done) were marked "In Progress" in ROADMAP.md progress table throughout the entire run, because they weren't checked off after each plan. SUMMARY counts and VERIFICATION evidence were accurate but the ROADMAP table was stale. Slightly confusing during audit.

### Patterns Established

- **Wave 0 = pure TypeScript gate** — Each phase that touched Cocos also included a "00" plan to write the pure logic first (GameState in Phase 3, JuiceHelpers in Phase 5). This kept the testable surface growing with every phase.
- **Human checkpoint as last plan** — Phases 3, 4, 5, 6 all ended with an explicit human-verification plan. This was the right call — each one caught real bugs.
- **`_stopAllJuiceAnimations()` on both beginSession and triggerGameOver** — Pattern for cleanup: call explicitly from both entry points so blink state never leaks across sessions.
- **Flag-based input gate** — `_inputEnabled` boolean flag checked at top of `_onCellTapped()` — simpler and safer than add/remove listener around session phases.

### Key Lessons

1. **Write the helpers, import the helpers.** If Plan 00 specifies helper functions for GameController to import, make sure Phase 02 actually imports them. The dead-code JuiceHelpers functions should have been a verification failure.
2. **ROADMAP progress table needs updating after each SUMMARY commit.** The stale "In Progress" state for Phases 3 and 4 was confusing. Either automate it or add it to the SUMMARY commit checklist.
3. **Nyquist sign-off should be a hard gate or explicitly opted out.** Having 6 draft VALIDATION.md files going into milestone audit created noise. Either run `/gsd:validate-phase` or mark `nyquist_compliant: skipped` with a reason.
4. **Cocos node layer mismatch is a common gotcha.** `new Node()` defaults to 3D layer (1073741824); Cocos 2D camera only renders layer 33554432. Always set `cellNode.layer = this.node.layer` when programmatically creating nodes.
5. **Read-then-collect ordering is critical in FlowerFSM.** Must read `getScore(nowMs)` and `getState(nowMs)` BEFORE calling `collect()`. This timestamp-ordering was correctly handled but is a pitfall worth calling out for future flower-type mechanics.

### Cost Observations

- Model: Claude Sonnet 4.6 throughout
- Sessions: ~9 (one per day over 9 days)
- Notable: Pure logic tier (Phases 1–2) completed on day 1. Phases 3–6 (renderer + runtime) averaged ~2 days each. Human verification checkpoints added ~30 min each but caught meaningful bugs every time.

---

## Cross-Milestone Trends

| Milestone | Phases | Plans | Timeline | Tests | Blockers |
|-----------|--------|-------|----------|-------|---------|
| v1.0 MVP | 6 | 18 | 9 days | 150/150 | 0 |

| Pattern | First seen | Confidence |
|---------|-----------|------------|
| TDD gate (Wave 0 pure TypeScript) | v1.0 Phase 2 | High — repeat in every renderer phase |
| Human verification as final plan | v1.0 Phase 3 | High — caught bugs every time |
| Object pool mandate pre-Phase 3 | v1.0 Phase 2 decision | High |
| StorageService abstraction over raw localStorage | v1.0 Phase 6 | High — FB port path clear |
