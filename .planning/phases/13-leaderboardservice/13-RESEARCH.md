# Phase 13: LeaderboardService - Research

**Researched:** 2026-03-25
**Domain:** Pure TypeScript logic service — leaderboard data model, sorting/capping algorithm, localStorage persistence via StorageService
**Confidence:** HIGH

## Summary

Phase 13 delivers two pure-logic services with zero Cocos Creator dependencies: player name persistence and a ranked top-10 leaderboard. The domain is entirely within the project's established `logic/` tier. All algorithms (insert, sort, cap, getRank) are straightforward array operations on a 10-element max list. No external libraries are needed.

The existing `StorageService.ts` is the only external integration point. All state is serialized as JSON strings under two keys: `playerName` and `leaderboard`. The test infrastructure (Vitest 3.2.4, jsdom for localStorage) is already installed and configured. The `@vitest-environment jsdom` per-file docblock pattern is already proven in `StorageService.test.ts`.

The key design decision resolved here: `getRank` should use the simplified filter-count approach — count entries with score strictly greater than the target, add 1. This avoids timestamp identity fragility that arises when simulating insertion with a dummy entry. It is correct because D-06 guarantees the new entry (newer timestamp) sorts above all existing entries with the same score, meaning only strictly-higher-score entries rank above it.

**Primary recommendation:** Implement `LeaderboardService` as a static-method class in `BloomTap/assets/scripts/logic/LeaderboardService.ts`, co-located with `LeaderboardService.test.ts`, following the exact same static-class pattern used by `StorageService`. Use filter-count for `getRank`. Return `number | null` from both `saveEntry` and `getRank`.

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
| PLAYER-01 | Player name (max 12 chars) saved to and retrieved from localStorage via StorageService; key `playerName` | StorageService.set/get('playerName') confirmed working; jsdom environment enables localStorage in tests; truncation via `name.slice(0, 12)` |
| LB-01 | Top-10 leaderboard data model with rank, name, score — persisted via localStorage | `{ name, score, timestamp }` entry shape (D-01/D-02); JSON-serialized array under 'leaderboard' key (D-09) |
| LB-02 | Score auto-saved to leaderboard if qualifies for top 10; results screen displays rank | saveEntry algorithm (insert → sort → cap per D-06/D-07/D-08) and getRank via filter-count (correct for D-04/D-05/D-06) fully specified |
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
**When to use:** Always — matches `StorageService` static pattern in this codebase.
**Example:**
```typescript
// Pattern from StorageService.ts
export class LeaderboardService {
    private static readonly MAX_ENTRIES = 10;
    private static readonly STORAGE_KEY = 'leaderboard';
    private static readonly NAME_KEY = 'playerName';
    private static readonly MAX_NAME_LENGTH = 12;

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
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LeaderboardService } from './LeaderboardService';
import type { LeaderboardEntry } from './LeaderboardService';

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
    const raw = StorageService.get(LeaderboardService.STORAGE_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw) as LeaderboardEntry[];
    } catch {
        return [];  // corrupted data — silent fallback
    }
}
```

### Pattern 4: Insert-sort-cap algorithm

**What:** Standard array approach for maintaining a sorted, capped leaderboard.
**When to use:** Inside `saveEntry`.
```typescript
// 1. Load current entries
// 2. Check qualification (_wouldQualify helper)
// 3. Push new entry
// 4. Sort descending by score; on tie, higher timestamp first (D-06)
// 5. Slice to 10 entries (D-07)
// 6. Persist
entries.sort((a, b) => b.score - a.score || b.timestamp - a.timestamp);
const capped = entries.slice(0, LeaderboardService.MAX_ENTRIES);
```

### Pattern 5: getRank via filter-count (preferred approach)

**What:** Count entries with score strictly greater than target. Result is `higherCount + 1`. Avoids timestamp identity fragility from simulation approaches.
**When to use:** Inside `getRank`.
```typescript
static getRank(score: number): number | null {
    const entries = LeaderboardService._load();
    if (!LeaderboardService._wouldQualify(score, entries)) return null;
    const higherCount = entries.filter(e => e.score > score).length;
    return higherCount + 1;
}
```
**Why correct:** Per D-06, new entries (newer timestamp) sort above same-score existing entries. Therefore only strictly-higher-score entries are ranked above the new entry.

### Pattern 6: Shared _wouldQualify helper

**What:** Extract qualification logic into a private helper to keep `saveEntry` and `getRank` consistent.
**When to use:** Always — prevents the two methods drifting in their boundary handling.
```typescript
private static _wouldQualify(score: number, entries: LeaderboardEntry[]): boolean {
    if (entries.length < LeaderboardService.MAX_ENTRIES) return true;  // D-05
    // D-08: "strictly below" disqualifies. Equal scores qualify (timestamp tiebreak per D-06)
    return score >= entries[entries.length - 1].score;
}
```
**Critical:** Use `>=` (not `>`). A score equal to the 10th entry qualifies — the new entry has a newer timestamp and will displace the old 10th.

### Anti-Patterns to Avoid

- **Importing from 'cc':** Any `import { ... } from 'cc'` in LeaderboardService.ts violates the 0-cc-imports constraint and breaks Vitest.
- **Storing leaderboard as multiple keys:** D-09 is explicit — one key for the whole array as JSON.
- **Not wrapping JSON.parse in try/catch:** Corrupted localStorage data would throw and crash the service.
- **Using `>` instead of `>=` in _wouldQualify:** Incorrectly rejects equal-to-10th scores, breaking tie-at-boundary behavior.
- **Simulating getRank insertion with a dummy entry:** Finding rank by inserting `{ name: '', score, timestamp: Date.now() }` and searching for it is fragile when Date.now is mocked. Use filter-count instead.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| localStorage access | Custom wrapper | StorageService (existing) | Already handles bloomtap_ prefix, silent-fail, null return |
| JSON serialization | Custom encoder | JSON.stringify / JSON.parse | Sufficient for flat `{ name, score, timestamp }` objects |
| Sort with tiebreaker | Custom sort | Array.prototype.sort with compound comparator | `(a, b) => b.score - a.score \|\| b.timestamp - a.timestamp` covers D-06 exactly |
| Date mocking in tests | Custom clock | `vi.spyOn(Date, 'now').mockReturnValueOnce(n)` | Vitest built-in; already used in project |

**Key insight:** The leaderboard is a max-10 array. All algorithms are O(10) — no performance optimization needed. Simplicity beats cleverness.

---

## Common Pitfalls

### Pitfall 1: Test isolation — localStorage leaks between tests

**What goes wrong:** A test sets leaderboard data, the next test reads stale data.
**Why it happens:** jsdom's localStorage persists across tests in the same file unless cleared.
**How to avoid:** Add top-level `beforeEach(() => { localStorage.clear(); })` — exact same pattern as `StorageService.test.ts`.
**Warning signs:** Tests pass in isolation but fail when run together.

### Pitfall 2: getRank on empty leaderboard crashes

**What goes wrong:** Accessing `entries[9]` on a list with fewer than 10 entries returns undefined, causing comparison errors in `_wouldQualify`.
**Why it happens:** D-05 says "any score qualifies when fewer than 10 entries" — but code that accesses `entries[9].score` throws.
**How to avoid:** `_wouldQualify` checks `entries.length < MAX_ENTRIES` first and returns true immediately. The cap entry is only accessed when the board is full.
**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'score')`.

### Pitfall 3: Wrong boundary condition in _wouldQualify

**What goes wrong:** Using `score > entries[9].score` (strict greater-than) causes equal-to-10th scores to be rejected. The tie-at-boundary test case fails.
**Why it happens:** D-08 says "strictly below" disqualifies — `<` disqualifies, `>=` qualifies.
**How to avoid:** Use `score >= entries[entries.length - 1].score`.
**Warning signs:** `saveEntry('Tie', 50)` returns null when 10th entry also has score 50.

### Pitfall 4: Inconsistency between saveEntry and getRank qualification logic

**What goes wrong:** saveEntry inserts an entry that getRank said would not qualify, or vice versa.
**Why it happens:** The two methods implement qualification logic independently and drift.
**How to avoid:** Both methods call the same `_wouldQualify(score, entries)` helper.

### Pitfall 5: Player name not truncated before storage

**What goes wrong:** Names longer than 12 chars are stored without enforcement, violating D-10.
**Why it happens:** Easy to forget the constraint.
**How to avoid:** `setPlayerName` applies `name.slice(0, MAX_NAME_LENGTH)` before calling StorageService.set. Truncation (not rejection) matches the silent-fail philosophy of the tier.

### Pitfall 6: Missing `// @vitest-environment jsdom` directive

**What goes wrong:** `ReferenceError: localStorage is not defined` in tests, even though jsdom is installed.
**Why it happens:** `vitest.config.ts` sets `environment: 'node'` globally. localStorage does not exist in Node.
**How to avoid:** Always put `// @vitest-environment jsdom` as line 1 of any test file that uses StorageService.
**Warning signs:** The error appears at the first test that triggers a StorageService call.

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

### Full implementation skeleton

```typescript
// Source: Design derived from StorageService.ts pattern + 13-CONTEXT.md decisions
import { StorageService } from './StorageService';

export interface LeaderboardEntry {
    name: string;
    score: number;
    timestamp: number;
}

export class LeaderboardService {
    private static readonly MAX_ENTRIES = 10;
    private static readonly STORAGE_KEY = 'leaderboard';
    private static readonly NAME_KEY = 'playerName';
    private static readonly MAX_NAME_LENGTH = 12;

    static getPlayerName(): string | null {
        return StorageService.get(LeaderboardService.NAME_KEY);
    }

    static setPlayerName(name: string): void {
        StorageService.set(
            LeaderboardService.NAME_KEY,
            name.slice(0, LeaderboardService.MAX_NAME_LENGTH)  // D-10
        );
    }

    static getEntries(): LeaderboardEntry[] {
        return LeaderboardService._load();
    }

    static getRank(score: number): number | null {
        const entries = LeaderboardService._load();
        if (!LeaderboardService._wouldQualify(score, entries)) return null;
        // Count entries strictly higher than score (D-06: new entry beats same-score entries)
        return entries.filter(e => e.score > score).length + 1;
    }

    static saveEntry(name: string, score: number): number | null {
        const entries = LeaderboardService._load();
        if (!LeaderboardService._wouldQualify(score, entries)) return null;  // D-08
        const entry: LeaderboardEntry = {
            name: name.slice(0, LeaderboardService.MAX_NAME_LENGTH),
            score,
            timestamp: Date.now()  // D-02
        };
        entries.push(entry);
        entries.sort((a, b) => b.score - a.score || b.timestamp - a.timestamp);  // D-06
        const capped = entries.slice(0, LeaderboardService.MAX_ENTRIES);  // D-07
        LeaderboardService._save(capped);
        const rank = capped.findIndex(
            e => e.name === entry.name && e.score === entry.score && e.timestamp === entry.timestamp
        ) + 1;
        return rank;
    }

    private static _wouldQualify(score: number, entries: LeaderboardEntry[]): boolean {
        if (entries.length < LeaderboardService.MAX_ENTRIES) return true;  // D-05
        return score >= entries[entries.length - 1].score;  // D-08: >= qualifies (equal ties resolved by timestamp)
    }

    private static _load(): LeaderboardEntry[] {
        const raw = StorageService.get(LeaderboardService.STORAGE_KEY);
        if (!raw) return [];
        try {
            return JSON.parse(raw) as LeaderboardEntry[];
        } catch {
            return [];
        }
    }

    private static _save(entries: LeaderboardEntry[]): void {
        StorageService.set(LeaderboardService.STORAGE_KEY, JSON.stringify(entries));
    }
}
```

### Date.now mocking for timestamp tiebreak tests

```typescript
// Source: vi.spyOn pattern from StorageService.test.ts
import { vi } from 'vitest';

vi.spyOn(Date, 'now').mockReturnValueOnce(1000);
LeaderboardService.saveEntry('A', 100);
vi.spyOn(Date, 'now').mockReturnValueOnce(2000);
LeaderboardService.saveEntry('B', 100);
// B has higher timestamp → sorts above A (D-06)
const entries = LeaderboardService.getEntries();
expect(entries[0].name).toBe('B');
```

### Fill-board helper for full-leaderboard tests

```typescript
function fillBoard(baseScore = 100, step = 10): void {
    for (let i = 0; i < 10; i++) {
        LeaderboardService.saveEntry(`P${i}`, baseScore - i * step);
    }
}
// Creates entries: 100, 90, 80, 70, 60, 50, 40, 30, 20, 10
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mutable class instances | Static-method classes for logic tier | v1.0 architecture | All logic files in project use static classes |
| `@property JsonAsset` for config | `resources.load()` async | Phase 7 | Not relevant to this phase |

No deprecated approaches relevant to this phase.

---

## Open Questions

1. **saveEntry return value (discretion area)**
   - What we know: CONTEXT.md leaves this to Claude's discretion.
   - Recommendation: Return `number | null` (achieved rank or null). Allows Phase 15 (results screen) to call `saveEntry` and get the rank in one operation, without a second `getRank` call.

2. **Player name: truncation vs rejection (discretion area)**
   - What we know: D-10 says "truncate or reject — planner decides".
   - Recommendation: Truncate silently using `name.slice(0, 12)`. Consistent with silent-fail philosophy. Rejection would require UI error handling not yet designed.

3. **StorageService.get('leaderboard') returning null (discretion area)**
   - What we know: Returns null when key has never been written, or when localStorage throws.
   - Recommendation: Treat null as empty array in `_load()`. Already shown in code example above.

All three are fully resolved by the recommendations above. No blocking unknowns remain.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Vitest | All unit tests | Yes | 3.2.4 (installed) | — |
| jsdom | localStorage in tests | Yes | ^29.0.0 (installed) | — |
| Node.js | Test runner | Yes | Project standard | — |
| StorageService.ts | Persistence layer | Yes | Exists at logic/StorageService.ts | — |

No missing dependencies. No fallbacks needed.

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
| PLAYER-01 | setPlayerName saves under bloomtap_playerName; getPlayerName retrieves; names > 12 chars truncated | unit | `npx vitest run BloomTap/assets/scripts/logic/LeaderboardService.test.ts` | ❌ Wave 0 |
| LB-01 | getEntries returns [] when nothing stored; returns sorted descending array; handles corrupted JSON | unit | same | ❌ Wave 0 |
| LB-02 (insert) | saveEntry inserts qualifying score, list sorted descending, capped at 10; returns achieved rank | unit | same | ❌ Wave 0 |
| LB-02 (no-insert) | saveEntry with score strictly below 10th returns null and does not alter board | unit | same | ❌ Wave 0 |
| LB-02 (getRank) | getRank returns 1-based rank for qualifying score; null for non-qualifying | unit | same | ❌ Wave 0 |
| LB-02 (boundary) | Score equal to 10th entry qualifies (newer timestamp displaces old 10th); score below does not | unit | same | ❌ Wave 0 |
| LB-02 (tiebreak) | Two same-score entries: newer timestamp sorts first | unit | same | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run BloomTap/assets/scripts/logic/LeaderboardService.test.ts`
- **Per wave merge:** `npm run test:run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `BloomTap/assets/scripts/logic/LeaderboardService.ts` — implementation file (new)
- [ ] `BloomTap/assets/scripts/logic/LeaderboardService.test.ts` — test file covering all requirement behaviors (new)

Both files are created in Wave 1 Task 1 (stub + tests, RED) and Task 2 (implementation, GREEN). Existing vitest.config.ts and jsdom setup require no changes.

---

## Sources

### Primary (HIGH confidence)

- Direct code read: `BloomTap/assets/scripts/logic/StorageService.ts` — confirmed API: `static get(key): string | null`, `static set(key, value): void`; bloomtap_ prefix; silent-fail
- Direct code read: `BloomTap/assets/scripts/logic/StorageService.test.ts` — confirmed `@vitest-environment jsdom` pattern; `beforeEach localStorage.clear()`; `vi.spyOn` usage
- Direct code read: `vitest.config.ts` — confirmed `environment: 'node'` default; `include` glob covers `logic/**/*.test.ts`
- Direct code read: `package.json` — confirmed `vitest@^3.2.4`, `jsdom@^29.0.0` installed; test scripts confirmed
- Direct code read: `.planning/phases/13-leaderboardservice/13-CONTEXT.md` — all locked decisions D-01 through D-10
- Direct code read: `.planning/phases/13-leaderboardservice/13-01-PLAN.md` — confirmed implementation approach; simplified getRank design verified correct

### Secondary (MEDIUM confidence)

None required — all findings sourced directly from project code.

### Tertiary (LOW confidence)

None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — directly verified from package.json and existing test files
- Architecture: HIGH — directly verified from StorageService.ts pattern and all existing logic/ test files
- Pitfalls: HIGH — derived from locked decisions in CONTEXT.md and examination of boundary conditions
- Algorithm correctness: HIGH — all sorting/capping rules fully specified by D-06 through D-08; filter-count getRank verified correct against D-06

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable — no external dependencies, all code is in-project)
