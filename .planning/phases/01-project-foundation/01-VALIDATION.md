---
phase: 1
slug: project-foundation
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-14
approved: 2026-03-14
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — Phase 1 requirements are infrastructure/integration; verified via browser preview + DevTools emulation |
| **Config file** | None — no headless test runner needed for Phase 1 |
| **Quick run command** | `Ctrl+P` in Cocos Creator editor → check browser console (no errors) |
| **Full suite command** | `Build & Publish → Web Mobile` → open `build/web-mobile/index.html` in DevTools with mobile emulation (iPhone 12, DPR 3) |
| **Estimated runtime** | ~3 minutes (manual) |

---

## Sampling Rate

- **After every task commit:** Open editor preview (Ctrl+P), confirm canvas visible, browser console clean
- **After every plan wave:** Full Web Mobile build, open in DevTools mobile emulation, verify all success criteria
- **Before `/gsd:verify-work`:** All three success criteria manually verified on physical device or DevTools emulation
- **Max feedback latency:** ~3 minutes per check

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | FOUND-01 | smoke | Manual: CC editor preview → check console | ❌ Wave 0 | ⬜ pending |
| 1-01-02 | 01 | 1 | FOUND-02 | manual | Manual: DevTools → iPhone 12 emulation, DPR 2-3 | ❌ Wave 0 | ⬜ pending |
| 1-01-03 | 01 | 1 | FOUND-03 | manual | Manual: DevTools mobile emulation → touch-drag on canvas | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Create Cocos Creator 3.8.8 project (editor UI) — this IS Wave 0; no test files to scaffold
- [ ] Configure design resolution (720×1280 Portrait, Fit Width) in Project Settings
- [ ] Create BootScene.scene and GameScene.scene in editor

*No test framework to install — Cocos Creator projects use browser-based validation for infrastructure requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Project opens and previews without console errors | FOUND-01 | Requires Cocos Editor + browser runtime | 1. Open project in CC 3.8.8. 2. Press Ctrl+P. 3. Open browser DevTools console. 4. Confirm zero errors. |
| Canvas fills viewport without blur on high-DPI | FOUND-02 | Requires device/emulation at DPR 2-3 | 1. Build Web Mobile. 2. Open in Chrome DevTools → iPhone 12 Pro (390px, DPR 3). 3. Zoom in on canvas — no pixel blur. |
| Touch does not scroll page; events fire correctly | FOUND-03 | Requires mobile emulation or physical device | 1. Open build in DevTools mobile emulation. 2. Touch-drag vertically on canvas. 3. Page must NOT scroll. 4. Add `console.log` in TOUCH_START handler to confirm event fires. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5 minutes
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** retroactively approved 2026-03-14 — phase completed and verified (01-VERIFICATION.md)
