---
phase: 14-lobby-leaderboard-ui
verified: 2026-04-02T22:30:00Z
status: passed
score: 10/10 must-haves verified
re_verification: false
---

# Phase 14: Lobby & Leaderboard UI Verification Report

**Phase Goal:** Players see a lobby on boot, can enter their name on first run, and can view the top-10 leaderboard
**Verified:** 2026-04-02T22:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | LobbyController class exists with @ccclass decorator and all @property bindings for scene nodes | VERIFIED | `LobbyController.ts` line 24: `@ccclass('LobbyController')`, 11 @property fields confirmed |
| 2 | LobbyController checks getPlayerName() in onLoad and activates/deactivates name overlay accordingly | VERIFIED | `onLoad()` line 69: `const name = LeaderboardService.getPlayerName()` with branch for null vs. existing name |
| 3 | LobbyController wires 5 button click handlers: Choi Ngay loads GameScene, BXH loads LeaderboardScene, 3 others show toast | VERIFIED | Lines 91-95: all 5 buttons wired; `_onChoiNgay` → `director.loadScene('GameScene')`, `_onBXH` → `director.loadScene('LeaderboardScene')`, 3 others → `_showToast` |
| 4 | LobbyController implements name confirm flow: setPlayerName, update greeting, fade overlay out | VERIFIED | `_confirmName()` lines 116-143: trims, calls `LeaderboardService.setPlayerName(name)`, updates greeting label, UIOpacity tween fade |
| 5 | LobbyController implements EditBox reactive validation: Bat Dau button disabled when empty, enabled when >=1 char | VERIFIED | `_onNameChanged()` lines 105-110: checks `string.length >= 1`, sets `btnBatDau.interactable = hasText` |
| 6 | LobbyController implements interruptible toast animation with Tween.stopAllByTarget | VERIFIED | `_showToast()` lines 167-188: `Tween.stopAllByTarget(uiOp)` called before every tween start; `.isValid` guard in callback |
| 7 | LeaderboardController class exists with @ccclass decorator, reads getEntries() in onLoad | VERIFIED | `LeaderboardController.ts` line 22: `@ccclass('LeaderboardController')`, `onLoad()` line 54: calls `_renderEntries()` which reads `LeaderboardService.getEntries()` |
| 8 | LeaderboardController renders up to 10 rows with rank/name/score, hides unused rows | VERIFIED | `_renderEntries()` lines 63-92: loop `for (let i = 0; i < 10; i++)`, sets `row.active = true/false`, uses `getChildByName('RankLabel/NameLabel/ScoreLabel')` |
| 9 | LeaderboardController shows empty state label when no entries | VERIFIED | Line 68-70: `emptyStateLabel.node.active = !hasEntries` |
| 10 | LeaderboardController Back button loads LobbyScene | VERIFIED | `_onBack()` line 99: `director.loadScene('LobbyScene')` |

**Score:** 10/10 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `BloomTap/assets/scripts/LobbyController.ts` | Lobby scene controller with name input, buttons, toast | VERIFIED | 191 lines; substantive implementation; `import { LeaderboardService }` wired; committed c67f557 |
| `BloomTap/assets/scripts/LeaderboardController.ts` | Leaderboard scene controller with row rendering | VERIFIED | 101 lines; substantive implementation; `import { LeaderboardService }` wired; committed 36d873c |
| `BloomTap/assets/scene/LobbyScene.scene` | Lobby scene file with all nodes and @property wiring | VERIFIED | File exists; JSON contains 6 `cc.Button`, 12 `cc.Label`, 1 `cc.EditBox`, 2 `cc.UIOpacity`; LobbyController UUID `4d74d...` attached |
| `BloomTap/assets/scene/LeaderboardScene.scene` | Leaderboard scene file with rows and @property wiring | VERIFIED | File exists; JSON contains 33 `cc.Label`, 1 `cc.Button`, 1 LeaderboardController UUID `dd12b...` attached; 10x RankLabel/NameLabel/ScoreLabel triplets confirmed |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `LobbyController.ts` | `LeaderboardService.ts` | `import { LeaderboardService }` | WIRED | Line 2: import present; `getPlayerName()` called in `onLoad`, `setPlayerName()` called in `_confirmName()` |
| `LeaderboardController.ts` | `LeaderboardService.ts` | `import { LeaderboardService }` | WIRED | Line 2: import present; `getEntries()` called in `_renderEntries()` |
| `LobbyScene.scene` | `LobbyController.ts` | @property bindings in Cocos Inspector | WIRED | All 11 property names confirmed in scene JSON: titleLabel, greetingLabel, btnChoiNgay, btnVuonHoa, btnTuiDo, btnBXH, btnSetting, nameInputOverlay, nameEditBox, btnBatDau, toastLabel; component UUID matches `LobbyController.ts.meta` |
| `LeaderboardScene.scene` | `LeaderboardController.ts` | @property bindings in Cocos Inspector | WIRED | Properties confirmed: btnBack, rows, emptyStateLabel; 10 RankLabel/NameLabel/ScoreLabel triplets present; component UUID matches `LeaderboardController.ts.meta` |
| `BootController.ts` | `LobbyScene` | `director.loadScene('LobbyScene')` | WIRED | `BootController.ts` line 38: `director.loadScene('LobbyScene')` confirmed (patched from GameScene in commit aff389e) |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `LobbyController.ts` — greetingLabel | `name` from `getPlayerName()` | `LeaderboardService.getPlayerName()` → `StorageService.get('playerName')` → localStorage | Yes — reads live localStorage value | FLOWING |
| `LeaderboardController.ts` — rows | `entries` from `getEntries()` | `LeaderboardService.getEntries()` → `_load()` → `StorageService.get('leaderboard')` → JSON.parse | Yes — reads live localStorage array | FLOWING |
| `LeaderboardController.ts` — emptyStateLabel | `hasEntries` from `entries.length > 0` | Derived from same `getEntries()` call above | Yes — conditional on real data | FLOWING |

---

### Behavioral Spot-Checks

Phase 14 controllers are Cocos runtime components (require Cocos Editor runtime). Automated curl/node checks are not applicable for Cocos scene controllers. Behavioral verification was completed by human play-test (Plan 02 Task 2).

| Behavior | Method | Result | Status |
|----------|--------|--------|--------|
| Test suite — zero regressions | `npm run test:run` | 262 tests passed, 12 test files | PASS |
| LeaderboardService.getEntries() returns real data | Unit test in LeaderboardService.test.ts | 18 tests passed covering insert/sort/cap/rank | PASS |
| Cocos Preview — all 9 checklist items | Human play-test (Plan 02 Task 2) | All 9 items approved by user | PASS (human-verified) |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| LOBBY-01 | 14-01-PLAN, 14-02-PLAN | Lobby screen with 5 buttons; Vuon Hoa/Tui Do/Setting show "Sap ra mat" | SATISFIED | 5 buttons wired in LobbyScene; 3 toast-showing buttons confirmed in controller; human-verified SC-1 and SC-2 |
| PLAYER-01 (UI side) | 14-01-PLAN, 14-02-PLAN | Name input on first run; persists to localStorage; shown on lobby | SATISFIED | Name overlay on first run (null guard in onLoad); `setPlayerName()` persists via StorageService; greeting label updated; human-verified SC-3 and SC-4 |
| LB-01 (display side) | 14-01-PLAN, 14-02-PLAN | Leaderboard top-10 display: rank, name, score; empty state handled | SATISFIED | LeaderboardController renders up to 10 rows via `getEntries()`; empty state label toggle implemented; human-verified SC-5 |

**ORPHANED requirements check:** REQUIREMENTS.md maps LOBBY-02 and LB-02 to Phase 15, not Phase 14. No orphaned requirements for this phase.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | — | — | — |

No anti-patterns detected. Specifically verified:
- No `TODO/FIXME/PLACEHOLDER` comments in either controller
- No `return null` / `return {}` / `return []` stub implementations
- No hardcoded empty state as rendering output — both controllers read live data from LeaderboardService
- All tween calls preceded by `Tween.stopAllByTarget` (lines 134, 174 in LobbyController)
- All `.call()` callbacks guarded with `.isValid` checks (lines 139, 186)
- No direct StorageService calls in controllers — all data access via LeaderboardService (Don't Hand-Roll rule respected)

---

### Human Verification Required

All items were completed and approved by the user during Plan 02 Task 2 (play-test in Cocos Preview). The following 9 checklist items all passed:

1. Name overlay appears on first run (clear localStorage, reopen LobbyScene)
2. Bat Dau button disabled when EditBox empty, enabled when >=1 char
3. Confirming name: overlay fades out, greeting label updates
4. 5 lobby buttons present and functional
5. Toast for Vuon Hoa, Tui Do, Setting (no scene change, no crash)
6. BXH navigates to LeaderboardScene
7. LeaderboardScene shows entries or empty state
8. Back button returns to LobbyScene
9. Player name persists across page reload

**All 9 items: APPROVED by user on 2026-04-02**

Notable issues found and fixed during play-test (documented in 14-02-SUMMARY.md):
- BootController was loading GameScene instead of LobbyScene — fixed in commit aff389e
- NameInputOverlay missing Layer=UI_2D — fixed via Editor Inspector (scene file in aff389e)
- NameInputOverlay missing UIOpacity component — fixed via Editor Inspector (scene file in aff389e)

---

### Gaps Summary

No gaps. All must-haves from both plan files are verified against the actual codebase.

---

## Commit Verification

| Commit | Task | Status |
|--------|------|--------|
| `c67f557` | feat(14-01): implement LobbyController | EXISTS |
| `36d873c` | feat(14-01): implement LeaderboardController | EXISTS |
| `aff389e` | feat(14-02): wire LobbyScene and LeaderboardScene with controller bindings | EXISTS |

---

_Verified: 2026-04-02T22:30:00Z_
_Verifier: Claude (gsd-verifier)_
