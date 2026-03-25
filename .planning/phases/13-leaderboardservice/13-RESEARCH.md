# Phase 13: LeaderboardService - Research

**Researched:** 2026-03-25
**Domain:** Pure TypeScript logic service — leaderboard data model, sorting/capping algorithm, localStorage persistence via StorageService
**Confidence:** HIGH

## Summary

Phase 13 delivers two pure-logic services with zero Cocos Creator dependencies: player name persistence and a ranked top-10 leaderboard. The domain is entirely within the project's established `logic/` tier. All algorithms (insert, sort, cap, getRank) are straightforward array operations on a 10-element max list. No external libraries are needed.

The existing `StorageService.ts` is the only external integration point. All state is serialized as JSON strings under two keys: `playerName` and `leaderboard`. The test infrastructure (Vitest 3.2.4, jsdom for localStorage) is already installed and configured. The `@vitest-environment jsdom` per-file docblock pattern is already proven in `StorageService.test.ts`.

The sole design subtlety is `getRank()` boundary behavior: the planner must commit to a concrete return type for "out-of-range" (null is recommended — callers render "10+" in UI; null is idiomatic TypeScript for "no rank achieved"). All other decisions are fully locked in CONTEXT.md.

**Primary recommendation:** Implement `LeaderboardService` as a static-method class in `BloomTap/assets/scripts/logic/LeaderboardService.ts`, co-located with `LeaderboardService.test.ts`, following the exact same static-class pattern used by `StorageService` and `ComboSystem`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Entry data model**
- D-01: Each leaderboard entry stores `{ name: string, score: number, timestamp: number }` — three fields, no more.
- D-02: `timestamp` is Unix epoch milliseconds (Date.now()) recorded at time of save. Used to distinguish identical scores.

**Same-player dedup**
- D-03: No dedup by player name. The leaderboard is top-10 *plays* (lượt chơi), not top-10 players. One player can hold multiple slots.

**getRank boundary behavior**
- D-04: When a score would not qualify for top 10 (leaderboard full and score <= lowest entry), `getRank(score)` signals "10+". Planner decides concrete return type (null recommended); caller renders "10+".
- D-05: When leaderboard has fewer than 10 entries, any score qualifies. `getRank` returns 1-based rank it would occupy.

**Leaderboard sorting and cap**
- D-06: Always sorted descending by score. On ties, newer entry (higher timestamp) sorts higher.
- D-07: Cap is exactly 10. After inserting a qualifying entry, if length exceeds 10, the last entry (lowest score) is dropped.
- D-08: A score strictly below the 10th entry's score does not alter the leaderboard (not inserted, not stored).

**Storage**
- D-09: Leaderboard persisted as JSON-serialized array under `StorageService.set('leaderboard', ...)` / `StorageService.get('leaderboard')`.
- D-10: Player name persisted under `StorageService.set('playerName', ...)`. Max 12-char constraint enforced at the service layer.

### Claude's Discretion

- Exact return type for `getRank` when out of range (`null`, `undefined`, or number > 10) — caller must render "10+" regardless.
- Whether `saveEntry` returns the achieved rank or void.
- Whether `StorageService.get('leaderboard')` returning null is treated as empty array at parse time.
- Player name truncation vs rejection strategy.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLAYER-01 (storage side) | Player name (max 12 chars) saved to and retrieved from localStorage via StorageService | StorageService.set/get('playerName') confirmed working; jsdom environment enables localStorage in tests |
| LB-01 (data model) | Top-10 leaderboard data model with rank, name, score — persisted via localStorage | `{ name, score, timestamp }` entry shape; JSON serialized array under 'leaderboard' key |
| LB-02 (save logic) | Score auto-saved to leaderboard if qualifies for top 10; results screen displays rank | saveEntry algorithm (insert → sort → cap) and getRank algorithm fully specified by D-04 through D-08 |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | Project default (Cocos bundled) | Implementation language | All logic tier files use TypeScript |
| Vitest | 3.2.4 (installed) | Unit test runner | Project-standard — all existing tests use Vitest |
| jsdom | 29.0.0 (installed) | localStorage in test environment | StorageService.test.ts already uses `@vitest-environment jsdom` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| StorageService (internal) | n/a | Reads/writes bloomtap_ prefixed localStorage keys | All persistence in this phase routes through it |

No new npm packages needed. All dependencies are already installed.

**Installation:** None required.

**Version verification:** Confirmed installed: `vitest@3.2.4`, `jsdom@^29.0.0` (from `package.json`).

---

## Architecture Patterns

### Recommended Project Structure

```
BloomTap/assets/scripts/logic/
├── LeaderboardService.ts       # new — static class, no cc imports
├── LeaderboardService.test.ts  # new — co-located, @vitest-environment jsdom
├── StorageService.ts           # existing — reuse directly
└── ... (other existing logic files)
```

### Pattern 1: Static Class (established project pattern)

**What:** All public API is static methods on a class. No instantiation required.
**When to use:** Always — matches `StorageService`, `ComboSystem` static patterns in this codebase.
**Example:**
```typescript
// Pattern from StorageService.ts
export class LeaderboardService {
    static getEntries(): LeaderboardEntry[] { ... }
    static saveEntry(name: string, score: number): number | null { ... }
    static getRank(score: number): number | null { ... }
    static getPlayerName(): string | null { ... }
    static setPlayerName(name: string): void { ... }
}
```

### Pattern 2: Per-file jsdom environment for localStorage tests

**What:** Add `// @vitest-environment jsdom` at top of test file to enable `localStorage` in Vitest node environment.
**When to use:** Any test file that calls `StorageService.get/set` or directly accesses `localStorage`.
**Example:**
```typescript
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { LeaderboardService } from './LeaderboardService';

describe('LeaderboardService', () => {
    beforeEach(() => {
        localStorage.clear();
    });
    // ...
});
```
Source: Confirmed pattern in `StorageService.test.ts`.

### Pattern 3: Null-safe JSON parse for StorageService.get

**What:** `StorageService.get` returns `string | null`. When the key has never been written, it returns null. The leaderboard parse must handle this.
**When to use:** Every time reading the leaderboard from storage.
**Example:**
```typescript
private static _load(): LeaderboardEntry[] {
    const raw = StorageService.get('leaderboard');
    if (!raw) return [];
    try {
        return JSON.parse(raw) as LeaderboardEntry[];
    } catch {
        return [];
    }
}
```

### Pattern 4: Insert-sort-cap algorithm

**What:** Standard immutable-array approach for maintaining a sorted, capped leaderboard.
**When to use:** Inside `saveEntry`.
```typescript
// 1. Load current entries
// 2. Check qualification (D-08: skip if full and score <= last entry score)
// 3. Push new entry
// 4. Sort descending by score; on tie, higher timestamp first (D-06)
// 5. Slice to 10 entries (D-07)
// 6. Persist
entries.sort((a, b) => b.score - a.score || b.timestamp - a.timestamp);
entries = entries.slice(0, 10);
```

### Anti-Patterns to Avoid

- **Importing from 'cc':** Any `import { ... } from 'cc'` in LeaderboardService.ts violates the 0-cc-imports constraint and breaks Vitest (Cocos modules are not available in Node test environment).
- **Mutating the stored array in-place before sorting:** Makes test isolation unreliable. Always sort a fresh copy.
- **Storing leaderboard as multiple keys:** D-09 is explicit — one key for the whole array as JSON.
- **Not wrapping JSON.parse in try/catch:** Corrupted localStorage data (rare but real) would throw and crash the service.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| localStorage access | Custom wrapper | StorageService (existing) | Already handles bloomtap_ prefix, silent-fail, null return |
| JSON serialization | Custom encoder | JSON.stringify / JSON.parse | Sufficient for flat `{ name, score, timestamp }` objects |
| Sort with tiebreaker | Custom sort | Array.prototype.sort with compound comparator | `(a, b) => b.score - a.score \|\| b.timestamp - a.timestamp` covers D-06 exactly |

**Key insight:** The leaderboard is a max-10 array. All algorithms are O(10) — no performance optimization needed. Simplicity beats cleverness here.

---

## Common Pitfalls

### Pitfall 1: Test isolation — localStorage leaks between tests

**What goes wrong:** A test sets leaderboard data, the next test reads stale data.
**Why it happens:** jsdom's localStorage persists across tests in the same file unless cleared.
**How to avoid:** Add `beforeEach(() => { localStorage.clear(); })` in test file — exact same pattern as `StorageService.test.ts`.
**Warning signs:** Tests pass in isolation but fail when run together.

### Pitfall 2: getRank called on empty leaderboard

**What goes wrong:** Accessing `entries[9]` on a list with fewer than 10 entries returns undefined, causing comparison errors.
**Why it happens:** D-05 says "any score qualifies when fewer than 10 entries" — but code that checks `entries[9].score` will throw.
**How to avoid:** Check `entries.length < 10` before accessing the cap entry. If fewer than 10, proceed directly to rank calculation.
**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'score')` in tests with empty leaderboard.

### Pitfall 3: getRank boundary — score equal to 10th entry

**What goes wrong:** D-08 says "strictly below" does not alter the leaderboard. A score exactly equal to the 10th entry DOES qualify (it ties for 10th place, timestamp makes it sort above the old 10th entry which is then dropped).
**Why it happens:** Off-by-one in the qualification check: `score < entries[9].score` should disqualify, but `score === entries[9].score` qualifies (the new entry has a newer timestamp, sorts higher due to D-06).
**How to avoid:** Qualification condition is `entries.length < 10 || score > entries[entries.length - 1].score` — equal scores DO qualify because the tiebreaker (timestamp) will determine final position. Wait — re-read D-08: "A score strictly below the 10th entry's score does not alter the leaderboard." Equal score at position 10 means the new entry ties with 10th and has newer timestamp, so it displaces the old 10th. The condition to SKIP insertion is `score < entries[9].score` (strictly less than). Equal scores proceed to insert.
**Warning signs:** getRank and saveEntry behaving inconsistently at the boundary score value.

### Pitfall 4: Inconsistency between saveEntry qualification and getRank result

**What goes wrong:** saveEntry inserts an entry that getRank says would not qualify, or vice versa.
**Why it happens:** The two methods implement the same qualification logic independently and drift.
**How to avoid:** Extract a private `_wouldQualify(score, entries): boolean` helper used by both methods, or ensure getRank and saveEntry use identical boundary logic.

### Pitfall 5: Player name not truncated before storage

**What goes wrong:** Names longer than 12 chars are stored without enforcement.
**Why it happens:** D-10 says "Max 12-char constraint enforced at the service layer" — easy to forget.
**How to avoid:** `setPlayerName(name: string)` should apply `name.slice(0, 12)` before calling `StorageService.set`. This is the simplest strategy (truncation over rejection), matching the silent-fail philosophy of the rest of the tier.

---

## Code Examples

### Entry type definition
```typescript
// No external import needed — plain TypeScript interface
export interface LeaderboardEntry {
    name: string;
    score: number;
    timestamp: number;  // Date.now() at save time (D-02)
}
```

### getRank implementation sketch
```typescript
// Returns 1-based rank, or null if score does not qualify (D-04, D-05)
static getRank(score: number): number | null {
    const entries = LeaderboardService._load();
    // When fewer than 10 entries, any score qualifies (D-05)
    if (entries.length < 10 || score > entries[entries.length - 1].score) {
        // Simulate insertion to find rank
        const simulated = [...entries, { name: '', score, timestamp: Date.now() }];
        simulated.sort((a, b) => b.score - a.score || b.timestamp - a.timestamp);
        const rank = simulated.findIndex(e => e.score === score) + 1;
        return rank;
    }
    // Ties at position 10: new entry has newer timestamp, qualifies
    if (score === entries[entries.length - 1].score) {
        return 10;  // displaces old 10th entry
    }
    return null;  // does not qualify — caller renders "10+"
}
```

### saveEntry implementation sketch
```typescript
// Returns achieved rank (or null if not inserted)
static saveEntry(name: string, score: number): number | null {
    const entries = LeaderboardService._load();
    const rank = LeaderboardService.getRank(score);
    if (rank === null) return null;  // does not qualify (D-08)
    entries.push({ name: name.slice(0, 12), score, timestamp: Date.now() });
    entries.sort((a, b) => b.score - a.score || b.timestamp - a.timestamp);
    const capped = entries.slice(0, 10);  // (D-07)
    StorageService.set('leaderboard', JSON.stringify(capped));
    return rank;
}
```

### setPlayerName truncation pattern
```typescript
static setPlayerName(name: string): void {
    StorageService.set('playerName', name.slice(0, 12));  // D-10
}

static getPlayerName(): string | null {
    return StorageService.get('playerName');
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mutable class instances | Static-method classes for logic tier | v1.0 architecture | All logic files in project use static classes — no change needed |
| `@property JsonAsset` for config | `resources.load()` async | Phase 7 | Not relevant to this phase |

No deprecated approaches relevant to this phase.

---

## Open Questions

1. **getRank tie-at-position-10 edge case**
   - What we know: D-06 says newer timestamp sorts higher on tie; D-08 says strictly-below-10th does not qualify
   - What's unclear: Does a score exactly equal to the 10th entry qualify? Answer from the decision logic: YES — the new entry has a newer timestamp and will sort above the old 10th, displacing it. The condition that disqualifies is strictly `score < entries[9].score`.
   - Recommendation: Planner should document this explicitly in the plan and add a dedicated test case for this boundary.

2. **saveEntry return value**
   - What we know: CONTEXT.md leaves this to Claude's discretion
   - Recommendation: Return `number | null` (achieved rank or null). This is the most useful signature for Phase 15 (results screen needs the rank without calling getRank a second time).

3. **getRank rank calculation for tie scenarios**
   - What we know: Multiple existing entries may share the same score as the new entry
   - What's unclear: Which rank does the new entry get when there are score ties among existing entries?
   - Recommendation: Simulate insertion with current `Date.now()` timestamp (newest), sort, find index. The new entry always sorts above existing entries with the same score (newer timestamp), so it takes the highest available rank among the tied group.

---

## Environment Availability

Step 2.6: No new external dependencies. All tools already verified installed.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Vitest | All unit tests | Yes | 3.2.4 | — |
| jsdom | localStorage in tests | Yes | ^29.0.0 | — |
| Node.js | Test runner | Yes | Project standard | — |

No missing dependencies.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run BloomTap/assets/scripts/logic/LeaderboardService.test.ts` |
| Full suite command | `npm run test:run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAYER-01 | setPlayerName saves name; getPlayerName retrieves it; max 12 chars truncated | unit | `npx vitest run BloomTap/assets/scripts/logic/LeaderboardService.test.ts` | No — Wave 0 |
| LB-01 | getEntries returns sorted array from storage; empty when nothing stored | unit | `npx vitest run BloomTap/assets/scripts/logic/LeaderboardService.test.ts` | No — Wave 0 |
| LB-02 (insert) | saveEntry inserts qualifying score, list stays sorted descending, capped at 10 | unit | `npx vitest run BloomTap/assets/scripts/logic/LeaderboardService.test.ts` | No — Wave 0 |
| LB-02 (no-insert) | saveEntry with score below 10th entry does not alter leaderboard | unit | `npx vitest run BloomTap/assets/scripts/logic/LeaderboardService.test.ts` | No — Wave 0 |
| LB-02 (getRank) | getRank returns 1-based rank for qualifying score; null for non-qualifying | unit | `npx vitest run BloomTap/assets/scripts/logic/LeaderboardService.test.ts` | No — Wave 0 |
| LB-02 (boundary) | Score equal to 10th entry qualifies (tie broken by timestamp); score strictly below 10th does not | unit | `npx vitest run BloomTap/assets/scripts/logic/LeaderboardService.test.ts` | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run BloomTap/assets/scripts/logic/LeaderboardService.test.ts`
- **Per wave merge:** `npm run test:run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `BloomTap/assets/scripts/logic/LeaderboardService.ts` — implementation file (new)
- [ ] `BloomTap/assets/scripts/logic/LeaderboardService.test.ts` — test file covering all 6 requirement behaviors above (new)

Both files must be created as part of Wave 1 (there is no existing infrastructure to create here — vitest.config.ts and jsdom are already set up).

---

## Sources

### Primary (HIGH confidence)

- Direct code read: `BloomTap/assets/scripts/logic/StorageService.ts` — confirmed API: `static get(key): string | null`, `static set(key, value): void`; bloomtap_ prefix; silent-fail
- Direct code read: `BloomTap/assets/scripts/logic/StorageService.test.ts` — confirmed `@vitest-environment jsdom` pattern; `beforeEach localStorage.clear()`
- Direct code read: `BloomTap/assets/scripts/logic/ComboSystem.ts` — confirmed static-class pattern not used here (ComboSystem is instantiated), but `StorageService` is static — confirmed static service pattern
- Direct code read: `vitest.config.ts` — confirmed `environment: 'node'` default; `include` glob covers `logic/**/*.test.ts`
- Direct code read: `package.json` — confirmed `vitest@^3.2.4`, `jsdom@^29.0.0` installed; no TypeScript compiler dependency needed (vitest handles TS via vite)
- Direct code read: `.planning/phases/13-leaderboardservice/13-CONTEXT.md` — all locked decisions D-01 through D-10

### Secondary (MEDIUM confidence)

None required — all findings sourced directly from project code.

### Tertiary (LOW confidence)

None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — directly verified from package.json and existing test files
- Architecture: HIGH — directly verified from StorageService.ts, ComboSystem.ts, existing test patterns
- Pitfalls: HIGH — derived from locked decisions in CONTEXT.md and examination of jsdom/localStorage test patterns already in use
- Algorithm correctness: HIGH — all sorting/capping rules fully specified by D-06 through D-08

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable — no external dependencies, all code is in-project)
