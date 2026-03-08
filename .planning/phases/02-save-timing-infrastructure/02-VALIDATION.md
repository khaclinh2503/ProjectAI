---
phase: 2
slug: save-timing-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x with ts-jest |
| **Config file** | `tests/jest.config.ts` (Wave 0 installs) |
| **Quick run command** | `npx jest --testPathPattern="tests/"` |
| **Full suite command** | `npx jest --coverage` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern="tests/"`
- **After every plan wave:** Run `npx jest --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green + both manual smoke tests verified
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-00-01 | 00 | 0 | TECH-03, TECH-05 | setup | `npx jest --testPathPattern="tests/"` | ❌ W0 | ⬜ pending |
| 2-01-01 | 01 | 1 | TECH-03 | unit | `npx jest tests/timing/TimingService.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 1 | TECH-03 | static | `grep -r "dt\b\|deltaTime\|frame" assets/core/scripts/timing/ --include="*.ts"` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 1 | TECH-05 | unit | `npx jest tests/save/SaveSystem.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 1 | TECH-05 | unit | `npx jest tests/save/LocalStorageSaveBackend.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-03 | 02 | 1 | TECH-05 | structural | `grep -r "localStorage\|FBInstant" assets/ --include="*.ts" \| grep -v "adapters/\|save/"` | ❌ W0 | ⬜ pending |
| 2-02-04 | 02 | 1 | TECH-05 | smoke | Native build: kill app, reopen, verify save persists | Manual | ⬜ pending |
| 2-02-05 | 02 | 1 | TECH-05 | smoke | FB sandbox: close, reopen, verify save persists | Manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `package.json` — add `"test": "jest"` script and devDependencies for `jest`, `ts-jest`, `@types/jest`, `@types/facebook-instant-games`
- [ ] `tests/jest.config.ts` — Jest configuration with ts-jest preset, roots pointing to `tests/`
- [ ] `tests/tsconfig.json` — separate TypeScript config for test files (not extending Cocos Creator's restricted tsconfig)
- [ ] `tests/__mocks__/cc.ts` — minimal mock of `cc` module (sys.localStorage stub)
- [ ] `tests/timing/TimingService.test.ts` — stubs for TECH-03
- [ ] `tests/save/SaveSystem.test.ts` — stubs for TECH-05 (load default, load persisted, update + save trigger)
- [ ] `tests/save/LocalStorageSaveBackend.test.ts` — stubs for TECH-05 (localStorage interactions)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Native build persists across app restarts (localStorage) | TECH-05 | Requires physical iOS/Android device or native build pipeline | Build native target, run app, trigger a save (complete a level), kill app, reopen, verify high score/progress persists |
| FB Instant build persists across sessions (setDataAsync) | TECH-05 | Requires FB Instant Games sandbox environment | Upload to FB Instant sandbox, play through a level, close, reopen Messenger thread, verify game state persisted |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
