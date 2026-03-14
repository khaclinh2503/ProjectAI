---
phase: 2
slug: core-game-logic
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Config file** | `vitest.config.ts` at project root — Wave 0 installs |
| **Quick run command** | `npm run test:run` |
| **Full suite command** | `npm run test:run -- --coverage` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run`
- **After every plan wave:** Run `npm run test:run -- --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 0 | — | setup | `node --version` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 0 | — | setup | `npm run test:run` (must pass 0 tests) | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | FLOW-01 | unit | `npm run test:run -- FlowerTypes.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | FLOW-02, FLOW-03 | unit | `npm run test:run -- FlowerFSM.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-05 | 01 | 1 | GRID-01, GRID-02 | unit | `npm run test:run -- Grid.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | — | unit | `npm run test:run -- ComboSystem.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 2 | FLOW-04 | unit | `npm run test:run -- SpawnManager.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — create at project root with `environment: 'node'`, `globals: true`
- [ ] `tsconfig.test.json` — create at project root, extends base tsconfig, adds `vitest/globals` types only
- [ ] `package.json` test scripts — add `"test": "vitest"`, `"test:run": "vitest run"`, `"test:coverage": "vitest run --coverage"` without removing existing scripts
- [ ] `npm install -D vitest` — install at project root after verifying Node >= 18
- [ ] `assets/scripts/logic/FlowerTypes.test.ts` — stub (all 5 configs exist, correct shapes)
- [ ] `assets/scripts/logic/FlowerFSM.test.ts` — stub (BUD/BLOOMING/FULL_BLOOM/WILTING/DEAD per timestamp, collect(), getScore())
- [ ] `assets/scripts/logic/Grid.test.ts` — stub (64 cells, getRandomEmptyCell, spawnFlower, clearCell)
- [ ] `assets/scripts/logic/ComboSystem.test.ts` — stub (increment, reset, step halving)
- [ ] `assets/scripts/logic/SpawnManager.test.ts` — stub (getPhaseConfig for 3 ranges, 120s boundary, pickFlowerType)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GRID-02 visual scaling | GRID-02 | Grid scaling is Phase 3 renderer concern; data model only tested in Phase 2 | Verify in Phase 3 after renderer connects |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
