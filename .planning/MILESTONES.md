# Milestones

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
