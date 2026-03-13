---
phase: 1
slug: project-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (installed in Wave 0 of this phase) |
| **Config file** | `vitest.config.ts` — Wave 0 creates this |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build` + manual browser smoke test
- **Before `/gsd:verify-work`:** Build must exit 0 AND manual checklist complete
- **Max feedback latency:** ~5 seconds (build) + manual check

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | FOUND-01 | build | `npm run build` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | FOUND-01 | build | `npm run build` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | FOUND-02 | build + manual | `npm run build` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 1 | FOUND-03 | build + manual | `npm run build` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — stub config for Phase 2 test infrastructure
- [ ] `package.json` with `"test": "vitest run"` script
- [ ] No unit test files needed in Phase 1 (no pure logic to test yet)

*Note: Phase 1 has no unit-testable logic. FOUND-01/02/03 are environment/browser-behaviour requirements. Automated gate = `npm run build` exits 0.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Canvas fills viewport without blur on high-DPI screens | FOUND-02 | Requires real device or DevTools DPR emulation | Open Chrome DevTools → Toggle device → set DPR to 3 → confirm canvas is sharp, no blurriness |
| Touch fires `pointerdown` without page scroll | FOUND-03 | Requires mobile touch event simulation | Open DevTools → Enable touch emulation → tap canvas → confirm no scroll, no "Added non-passive event listener" warning in console |
| BootScene "Tap to Start" → fade → GameScene | FOUND-01 | Visual/interaction confirmation | Load `npm run dev` → verify splash text renders → tap → verify fade out → fade in → GameScene placeholder visible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
