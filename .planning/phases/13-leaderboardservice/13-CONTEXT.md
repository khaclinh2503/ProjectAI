# Phase 13: LeaderboardService - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Pure logic tier only — no UI, zero cc imports. Delivers:
1. Player name storage/retrieval via StorageService (`bloomtap_playerName` key, max 12 chars)
2. Leaderboard data model — top-10 ranked entries, sorted descending
3. `LeaderboardService.saveEntry(name, score)` — inserts new entry, keeps list sorted and capped at 10
4. `LeaderboardService.getRank(score)` — returns the rank a score would achieve before insertion
5. Full Vitest unit test coverage; no Cocos Creator dependencies

Does NOT cover: any UI rendering, scene integration, or automatic post-game save hook (those are Phase 15).

</domain>

<decisions>
## Implementation Decisions

### Entry data model
- **D-01:** Each leaderboard entry stores `{ name: string, score: number, timestamp: number }` — three fields, no more.
- **D-02:** `timestamp` is Unix epoch in milliseconds (Date.now()) recorded at the time of save. Used to distinguish entries with identical scores and for potential future display.

### Same-player dedup
- **D-03:** No dedup by player name — **all play sessions are kept**. The leaderboard represents the top 10 *plays* (lượt chơi), not top 10 *players*. One player can occupy multiple slots if they score highly multiple times.

### getRank boundary behavior
- **D-04:** When a score would not qualify for top 10 (leaderboard is full and score ≤ lowest entry), `getRank(score)` signals "10+" — meaning outside the ranked window. Planner decides the concrete return type (e.g., `null` with caller rendering "10+", or a sentinel value) — the user-visible result on the results screen must read "10+".
- **D-05:** When the leaderboard has fewer than 10 entries, any score qualifies. `getRank` returns the 1-based rank it would occupy.

### Leaderboard sorting and cap
- **D-06:** List is always kept sorted descending by score. On ties, the newer entry (higher timestamp) sorts higher.
- **D-07:** Cap is exactly 10 entries. After inserting a qualifying entry, if length exceeds 10, the last entry (lowest score) is dropped.
- **D-08:** A score strictly below the 10th entry's score does not alter the leaderboard (not inserted, not stored).

### Storage
- **D-09:** Leaderboard persisted as a single JSON-serialized array under `StorageService.set('leaderboard', ...)` / `StorageService.get('leaderboard')`. One key for the whole array.
- **D-10:** Player name persisted under `StorageService.set('playerName', ...)`. Max 12-char constraint enforced at the service layer (truncate or reject — planner decides).

### Claude's Discretion
- Exact return type for `getRank` when out of range (`null`, `undefined`, or number > 10) — caller must render "10+" regardless.
- Whether `saveEntry` returns the achieved rank or void.
- Whether `StorageService.get('leaderboard')` returning null is treated as empty array at parse time.
- Player name truncation vs rejection strategy.

</decisions>

<specifics>
## Specific Ideas

- "Top 10 lượt chơi, không phải top 10 người" — the leaderboard is a play history scoreboard, not a per-player best-score board.
- "Thêm thông tin về thời gian người chơi khi đạt điểm để phân biệt" — timestamp is the user's explicit request, not just a technical nicety. It should be present in every entry.
- Results screen should display "10+" (not blank, not a number > 10) when the score didn't qualify.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Player Identity (PLAYER-01), §Leaderboard (LB-01, LB-02) — acceptance criteria for name storage and leaderboard behavior
- `.planning/ROADMAP.md` §Phase 13 — success criteria SC-1 through SC-5

### Architecture
- `BloomTap/assets/scripts/logic/StorageService.ts` — reuse directly; `bloomtap_` prefix, static methods, silent-fail pattern; keys for this phase: `playerName`, `leaderboard`
- `.planning/STATE.md` §v1.2 Architecture Notes — confirms 0 cc imports constraint and key names

### No external specs
No ADRs or design docs beyond the above — requirements are fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StorageService.ts` (pure TS, no cc): `StorageService.set(key, value)` / `StorageService.get(key)` — use directly for both `playerName` and `leaderboard` persistence. Already handles silent-fail and `bloomtap_` prefix.

### Established Patterns
- Pure logic files live in `BloomTap/assets/scripts/logic/` — `LeaderboardService.ts` goes here.
- Co-located test files: `LeaderboardService.test.ts` in the same directory.
- Static method pattern (no instantiation) used by `StorageService`, `ComboSystem`, etc. — follow the same pattern.
- No cc imports in any `logic/` file — enforced by architecture constraint.

### Integration Points
- Phase 14 (Lobby & Leaderboard UI): `LeaderboardService.getEntries()` will be called by a Cocos renderer component to display the top-10 list.
- Phase 15 (Scene Flow Wiring): `LeaderboardService.saveEntry()` will be called from `GameController` on game end; `LeaderboardService.getRank()` will be called by the results screen renderer.

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 13-leaderboardservice*
*Context gathered: 2026-03-25*
