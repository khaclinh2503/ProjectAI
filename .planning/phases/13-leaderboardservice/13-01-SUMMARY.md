---
phase: 13-leaderboardservice
plan: "01"
subsystem: logic
tags: [leaderboard, storage, tdd, pure-logic]
dependency_graph:
  requires:
    - BloomTap/assets/scripts/logic/StorageService.ts
  provides:
    - BloomTap/assets/scripts/logic/LeaderboardService.ts
    - BloomTap/assets/scripts/logic/LeaderboardService.test.ts
  affects:
    - Phase 14 (Leaderboard UI — consumes getEntries())
    - Phase 15 (Scene wiring — calls saveEntry() on game end)
tech_stack:
  added: []
  patterns:
    - Static class pattern (no instantiation, no cc imports)
    - StorageService delegation for all persistence (bloomtap_ prefix)
    - Filter-count approach for getRank (avoids timestamp identity fragility)
    - JSON serialize/deserialize with try/catch for corrupted data resilience
key_files:
  created:
    - BloomTap/assets/scripts/logic/LeaderboardService.ts
    - BloomTap/assets/scripts/logic/LeaderboardService.test.ts
  modified: []
decisions:
  - "getRank uses filter-count (entries.filter(e => e.score > score).length + 1) — avoids timestamp identity issues"
  - "_wouldQualify uses >= (not >) for 10th entry boundary — equal scores qualify per D-08"
  - "Sort comparator: b.score - a.score || b.timestamp - a.timestamp — D-06 tiebreak in one expression"
  - "saveEntry returns rank via findIndex on capped array — avoids double-pass"
metrics:
  duration: "214 seconds (~3.5 minutes)"
  completed_date: "2026-03-25"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
  tests_added: 18
  tests_total: 262
---

# Phase 13 Plan 01: LeaderboardService TDD Summary

**One-liner:** TDD implementation of LeaderboardService — static class with player name storage (12-char truncate) and top-10 leaderboard data model with sorted insertion, cap, and filter-count getRank via StorageService.

## What Was Built

`LeaderboardService.ts` — pure logic static class (zero cc imports) providing:
- `getPlayerName() / setPlayerName(name)` — reads/writes `bloomtap_playerName` via StorageService, truncates at 12 chars
- `getEntries()` — returns sorted descending array from `bloomtap_leaderboard`, returns [] on corrupt/empty
- `saveEntry(name, score)` — inserts qualifying entry, sorts (desc score, newer timestamp wins on tie), caps at 10, returns 1-based rank or null
- `getRank(score)` — returns 1-based rank score would achieve, or null if board full and score < lowest

`LeaderboardService.test.ts` — 18 test cases across 6 describe blocks covering PLAYER-01, LB-01, LB-02, D-06 tiebreak, and zero-cc-imports assertion.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing BloomTap/temp/tsconfig.cocos.json in worktree**
- **Found during:** Task 1 RED — vitest failed to resolve tsconfig extends
- **Issue:** BloomTap/tsconfig.json extends `./temp/tsconfig.cocos.json` which is Cocos-generated and gitignored. Worktree had no temp dir.
- **Fix:** Created minimal `BloomTap/temp/tsconfig.cocos.json` with base TypeScript config (no Cocos-specific type refs). File stays in worktree filesystem, cannot be committed (gitignored).
- **Files modified:** `BloomTap/temp/tsconfig.cocos.json` (worktree-local, not committed)
- **Commit:** N/A (gitignored file)

**2. [Rule 1 - Bug] Test assertion "caps at 10 entries" was incorrect**
- **Found during:** Task 2 GREEN — 1 test still failing after full implementation
- **Issue:** Test asserted `entries[entries.length - 1].score >= 55` but fillBoard creates [100,90,80,70,60,50,40,30,20,10]; inserting 55 produces [100,90,80,70,60,55,50,40,30,20] — last entry is 20, not >= 55.
- **Fix:** Changed assertion to check that 'New' entry is in the board and last entry score > 10 (old 10th dropped).
- **Files modified:** `BloomTap/assets/scripts/logic/LeaderboardService.test.ts`
- **Commit:** 4bec16e (included in feat commit)

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | RED — Failing tests | c54c6e0 | LeaderboardService.ts (stub), LeaderboardService.test.ts |
| 2 | GREEN — Full implementation | 4bec16e | LeaderboardService.ts (full), LeaderboardService.test.ts (fix) |

## Verification Results

- `npx vitest run BloomTap/assets/scripts/logic/LeaderboardService.test.ts` — 18/18 passed
- `npm run test:run` — 262/262 passed (no regressions; was 244 before this plan)
- `grep -c "from 'cc'" LeaderboardService.ts` — 0 (zero cc imports confirmed)
- PLAYER-01: setPlayerName + getPlayerName round-trip confirmed
- LB-01: getEntries returns sorted descending, handles empty/corrupted
- LB-02: saveEntry inserts/caps/rejects correctly, getRank returns correct rank or null
- D-06: Tiebreak — newer timestamp sorts above same score

## Known Stubs

None — all 5 public methods fully implemented and tested.

## Self-Check: PASSED

Files exist:
- BloomTap/assets/scripts/logic/LeaderboardService.ts — FOUND
- BloomTap/assets/scripts/logic/LeaderboardService.test.ts — FOUND

Commits exist:
- c54c6e0 — FOUND (test(13-01): add failing tests for LeaderboardService)
- 4bec16e — FOUND (feat(13-01): implement LeaderboardService)
