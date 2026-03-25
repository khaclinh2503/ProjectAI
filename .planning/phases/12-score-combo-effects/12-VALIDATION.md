---
phase: 12
slug: score-combo-effects
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.2.4 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test:run -- --reporter=verbose` |
| **Full suite command** | `npm run test:run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run`
- **After every plan wave:** Run `npm run test:run` + human verify in Cocos Editor
- **Before `/gsd:verify-work`:** Full suite must be green + all manual criteria confirmed
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 0 | JUICE-02, JUICE-03 | unit | `npm run test:run -- JuiceHelpers` | ❌ Wave 0 | ⬜ pending |
| 12-01-02 | 01 | 1 | JUICE-02 | manual | Human verify in Cocos Editor | N/A | ⬜ pending |
| 12-01-03 | 01 | 1 | JUICE-03 | manual | Human verify in Cocos Editor | N/A | ⬜ pending |
| 12-02-01 | 02 | 2 | JUICE-04 | manual | Human verify in Cocos Editor | N/A | ⬜ pending |
| 12-02-02 | 02 | 2 | JUICE-04 | manual | Regression check in Cocos Editor | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `BloomTap/assets/scripts/logic/JuiceHelpers.ts` — add `getScoreFlashColor(scoreDelta: number): {r: number, g: number, b: number}` (plain object, no 'cc' import)
- [ ] `BloomTap/assets/scripts/logic/JuiceHelpers.ts` — add `getComboStartScale(streak: number): number`
- [ ] `BloomTap/assets/scripts/logic/JuiceHelpers.test.ts` — add tests for both new helpers

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Score label punches + color flash on score increase | JUICE-02 | Cocos tween/UI not testable in vitest node env | Tap correct flower → observe score label scale up then back + color change |
| Combo punch-in: starts large (streak-proportional) and shrinks in | JUICE-03 | Cocos tween not testable in vitest | Build streak x2, x5, x10 → observe increasing start scale |
| Combo break flash visually stronger than normal wrong tap | JUICE-03 | Visual comparison required | Hit wrong tap with streak ≥2 → compare flash intensity to streak=0 wrong tap |
| Score float with multiplier: gold color + punch-in + zigzag path | JUICE-04 | Animation path not testable in vitest | Activate SCORE_MULTIPLIER power-up → tap correct flowers → observe float behavior |
| Normal float (no multiplier) unchanged: straight up + fade | JUICE-04 | Regression check | Play without power-up → confirm floats still go straight up |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
