import { StorageService } from './StorageService';

export interface LeaderboardEntry {
    name: string;
    score: number;
    timestamp: number;  // Date.now() at save time (D-02)
}

export class LeaderboardService {
    private static readonly MAX_ENTRIES = 10;
    private static readonly STORAGE_KEY = 'leaderboard';
    private static readonly NAME_KEY = 'playerName';
    private static readonly MAX_NAME_LENGTH = 12;

    /** Returns stored player name, or null if not set. */
    static getPlayerName(): string | null {
        return StorageService.get(LeaderboardService.NAME_KEY);
    }

    /** Saves player name, truncated to 12 chars (D-10). */
    static setPlayerName(name: string): void {
        StorageService.set(
            LeaderboardService.NAME_KEY,
            name.slice(0, LeaderboardService.MAX_NAME_LENGTH)
        );
    }

    /** Returns all leaderboard entries, sorted descending by score. */
    static getEntries(): LeaderboardEntry[] {
        return LeaderboardService._load();
    }

    /**
     * Returns the 1-based rank a score would achieve, or null if it
     * would not qualify for top 10 (D-04).
     * Uses filter-count: count entries with score strictly > target, +1.
     * Correct because D-06 guarantees new entry (newer timestamp) beats same-score entries.
     */
    static getRank(score: number): number | null {
        const entries = LeaderboardService._load();
        if (!LeaderboardService._wouldQualify(score, entries)) return null;
        return entries.filter(e => e.score > score).length + 1;
    }

    /**
     * Inserts a new entry if it qualifies for top 10.
     * Returns achieved rank (1-based) or null if score did not qualify (D-08).
     * List is sorted descending by score, ties broken by newer timestamp first (D-06).
     * Capped at 10 entries (D-07).
     */
    static saveEntry(name: string, score: number): number | null {
        const entries = LeaderboardService._load();
        if (!LeaderboardService._wouldQualify(score, entries)) return null;

        const entry: LeaderboardEntry = {
            name: name.slice(0, LeaderboardService.MAX_NAME_LENGTH),
            score,
            timestamp: Date.now()  // D-02
        };

        entries.push(entry);
        // D-06: descending by score; on tie, newer timestamp first
        entries.sort((a, b) => b.score - a.score || b.timestamp - a.timestamp);
        // D-07: cap at 10
        const capped = entries.slice(0, LeaderboardService.MAX_ENTRIES);

        LeaderboardService._save(capped);

        // Find the rank of the just-inserted entry by identity match
        const rank = capped.findIndex(
            e => e.name === entry.name && e.score === entry.score && e.timestamp === entry.timestamp
        ) + 1;

        return rank > 0 ? rank : null;
    }

    /**
     * Checks whether a score would qualify for the leaderboard.
     * D-05: fewer than 10 entries -> any score qualifies.
     * D-08: score strictly below 10th entry -> does not qualify.
     * Uses >= because equal scores qualify (newer timestamp wins per D-06).
     */
    private static _wouldQualify(score: number, entries: LeaderboardEntry[]): boolean {
        if (entries.length < LeaderboardService.MAX_ENTRIES) return true;
        return score >= entries[entries.length - 1].score;
    }

    /** Loads leaderboard from StorageService. Returns [] on null or corrupted JSON. */
    private static _load(): LeaderboardEntry[] {
        const raw = StorageService.get(LeaderboardService.STORAGE_KEY);
        if (!raw) return [];
        try {
            return JSON.parse(raw) as LeaderboardEntry[];
        } catch {
            return [];
        }
    }

    /** Persists leaderboard entries to StorageService as JSON string (D-09). */
    private static _save(entries: LeaderboardEntry[]): void {
        StorageService.set(LeaderboardService.STORAGE_KEY, JSON.stringify(entries));
    }
}
