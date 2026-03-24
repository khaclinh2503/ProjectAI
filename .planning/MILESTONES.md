# Milestones

## v1.1 Polish & Power-ups (Shipped: 2026-03-24)

**Phases completed:** 5 phases, 10 plans, 14 tasks

**Key accomplishments:**

- Pure TypeScript parseGameConfig() function with two validation helpers and 19 Vitest tests, backed by flowers.json and settings.json migrated from hardcoded FLOWER_CONFIGS/PHASE_CONFIGS constants
- Wired parseGameConfig() into BootController with sequential resources.load(), init functions added to FlowerTypes/SpawnManager/GameState, and error popup with Reload on parse failure — 171 tests unchanged
- One-liner:
- One-liner:
- Full pause/resume system wired into GameController — SessionPhase.PAUSED, freeze/restore urgency blink, 3-2-1 resume countdown, _applyPauseOffset() timestamp shift, and GridRenderer.freezeAt() for visual freeze during pause.
- One-liner:
- One-liner:
- PowerUpHUDRenderer component wired into GameController (per-frame tick + icon/arc render) and BootController loads powerUps config from JSON.
- One-liner:
- One-liner:

---

## v1.0 MVP (Shipped: 2026-03-16)

**Phases completed:** 6 phases, 18 plans
**Timeline:** 2026-03-07 → 2026-03-16 (9 days)
**Codebase:** ~1,700 LOC TypeScript (game) + ~1,150 LOC tests | 150/150 tests passing
**Git:** 116 commits · 137 files · 24,758 insertions

**Key accomplishments:**

- Cocos Creator 3.8.8 project scaffolded: TypeScript strict, portrait 720x1280, touch-action:none build template
- Pure logic tier: FlowerFSM, Grid (64 cells), ComboSystem, SpawnManager — 5 flower types, timestamp-based FSM, zero cc imports
- 64-cell GridRenderer: pre-allocated pooled nodes, 5-state color rendering, per-frame state polling — zero GC during gameplay
- 120s session loop: 3-phase spawn escalation (3000/2000/1000ms interval), SessionPhase state machine, countdown HUD, input gating
- Juice layer: tap pulse, score float pool (8 slots), red flash overlay, combo break blink, milestone celebration (x10/x25/x50), 3-stage timer urgency
- Results screen: StorageService (localStorage + bloomtap_ prefix), highscore persistence, NEW BEST! scale-pop animation, accuracy + bestCombo stats

**Tech decisions:**

- Timestamp-based state derivation over delta accumulation (prevents drift over 120s)
- Object pools for all 64 flower nodes AND 8 score float labels
- StorageService abstraction enables clean FB Instant Games swap path
- Pure logic tier testable in Node via Vitest — no browser required

**Tech debt carried forward:**

- JuiceHelpers.getUrgencyStage() / getMilestoneLabel() unused at runtime (inlined in GameController)
- HUD-03: comboLabel shows tapCount not multiplier.toFixed(1) (scoring correct; display discrepancy)
- Phase 3 missing VERIFICATION.md (covered by 03-03-SUMMARY human checkpoint PASSED)
- All 6 VALIDATION.md files remain in draft/nyquist_compliant:false state

**Archive:** .planning/milestones/v1.0-ROADMAP.md · .planning/milestones/v1.0-REQUIREMENTS.md

---
