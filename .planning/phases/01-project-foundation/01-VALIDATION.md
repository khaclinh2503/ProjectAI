---
phase: 1
slug: project-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Shell scripts + Cocos Creator build CLI (no unit test framework in Phase 1 — pure infrastructure) |
| **Config file** | `scripts/validate-build.sh` — Wave 0 creates this |
| **Quick run command** | `bash scripts/validate-build.sh --quick` |
| **Full suite command** | `bash scripts/validate-build.sh --full` |
| **Estimated runtime** | ~30 seconds (quick), ~5 min (full — includes build) |

---

## Sampling Rate

- **After every task commit:** Run `bash scripts/validate-build.sh --quick`
- **After every plan wave:** Run `bash scripts/validate-build.sh --full`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds (quick), 300 seconds (full)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 1-01-01 | 01-01 | 1 | TECH-01/02 | manual | Device build check | ⬜ pending |
| 1-01-02 | 01-01 | 1 | TECH-04 | automated | `bash scripts/validate-build.sh --bundle-size` | ⬜ pending |
| 1-02-01 | 01-02 | 2 | TECH-04 | automated | `bash scripts/validate-build.sh --bundle-size` | ⬜ pending |
| 1-02-02 | 01-02 | 2 | TECH-01/02/04 | automated | `grep -r "FBInstant\." assets/ \| grep -v "adapters/"` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/validate-build.sh` — build validation script with `--quick`, `--full`, `--bundle-size` modes
- [ ] `scripts/check-adapters.sh` — grep check: no direct SDK imports outside `assets/scripts/adapters/`

*Wave 0 creates the validation tooling before any implementation begins.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Blank scene deploys to iOS/Android device | TECH-01 | Requires physical device or simulator | Build from Creator → deploy via Xcode/Android Studio → confirm blank scene renders |
| FB Instant Games bundle runs in browser | TECH-02 | Requires FB developer portal upload or local mock | Build fb-instant-games target → serve locally → confirm initializeAsync resolves |
| Initial payload < 5 MB | TECH-04 | Size measurement after build | Run `bash scripts/validate-build.sh --bundle-size` after FB Instant Games build |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 300s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
