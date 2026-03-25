// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LeaderboardService } from './LeaderboardService';
import type { LeaderboardEntry } from './LeaderboardService';
import * as fs from 'fs';
import * as path from 'path';

beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
});

function fillBoard(baseScore = 100, step = 10): void {
    for (let i = 0; i < 10; i++) {
        vi.spyOn(Date, 'now').mockReturnValueOnce((i + 1) * 1000);
        LeaderboardService.saveEntry(`P${i}`, baseScore - i * step);
    }
}
// Creates: P0=100, P1=90, P2=80, ..., P9=10

describe('Player Name (PLAYER-01)', () => {
    it('getPlayerName returns null when no name stored', () => {
        expect(LeaderboardService.getPlayerName()).toBeNull();
    });

    it('setPlayerName then getPlayerName round-trips', () => {
        LeaderboardService.setPlayerName('Alice');
        expect(LeaderboardService.getPlayerName()).toBe('Alice');
    });

    it('setPlayerName truncates names longer than 12 chars', () => {
        LeaderboardService.setPlayerName('VeryLongNameHere');
        expect(LeaderboardService.getPlayerName()).toBe('VeryLongName');
    });

    it('setPlayerName persists under bloomtap_playerName key', () => {
        LeaderboardService.setPlayerName('Bob');
        expect(localStorage.getItem('bloomtap_playerName')).toBe('Bob');
    });
});

describe('getEntries (LB-01)', () => {
    it('returns empty array when nothing stored', () => {
        expect(LeaderboardService.getEntries()).toEqual([]);
    });

    it('returns empty array when stored JSON is corrupted', () => {
        localStorage.setItem('bloomtap_leaderboard', 'not-json');
        expect(LeaderboardService.getEntries()).toEqual([]);
    });

    it('returns entries sorted descending by score', () => {
        vi.spyOn(Date, 'now').mockReturnValueOnce(1000);
        LeaderboardService.saveEntry('A', 50);
        vi.spyOn(Date, 'now').mockReturnValueOnce(2000);
        LeaderboardService.saveEntry('B', 100);
        vi.spyOn(Date, 'now').mockReturnValueOnce(3000);
        LeaderboardService.saveEntry('C', 75);

        const entries = LeaderboardService.getEntries();
        expect(entries.map((e: LeaderboardEntry) => e.score)).toEqual([100, 75, 50]);
    });
});

describe('saveEntry (LB-02)', () => {
    it('returns rank 1 on empty board', () => {
        vi.spyOn(Date, 'now').mockReturnValue(1000);
        expect(LeaderboardService.saveEntry('A', 100)).toBe(1);
    });

    it('returns correct rank for 2nd place', () => {
        vi.spyOn(Date, 'now').mockReturnValueOnce(1000);
        LeaderboardService.saveEntry('A', 200);
        vi.spyOn(Date, 'now').mockReturnValueOnce(2000);
        const rank = LeaderboardService.saveEntry('B', 100);
        expect(rank).toBe(2);
    });

    it('caps at 10 entries', () => {
        fillBoard();
        vi.spyOn(Date, 'now').mockReturnValueOnce(11000);
        LeaderboardService.saveEntry('New', 55);
        expect(LeaderboardService.getEntries().length).toBe(10);
        const entries = LeaderboardService.getEntries();
        // Score 55 displaces 10th entry (score 10); 'New' should be in the board
        expect(entries.some((e: LeaderboardEntry) => e.name === 'New')).toBe(true);
        // The lowest score on the capped board should be > 10 (old 10th was dropped)
        expect(entries[entries.length - 1].score).toBeGreaterThan(10);
    });

    it('rejects score strictly below 10th', () => {
        fillBoard();
        vi.spyOn(Date, 'now').mockReturnValueOnce(11000);
        const result = LeaderboardService.saveEntry('Low', 5);
        expect(result).toBeNull();
        expect(LeaderboardService.getEntries().length).toBe(10);
    });

    it('equal-to-10th qualifies and displaces', () => {
        fillBoard(); // 10th has score 10
        vi.spyOn(Date, 'now').mockReturnValueOnce(11000);
        const result = LeaderboardService.saveEntry('Tie', 10);
        expect(result).not.toBeNull();
        const entries = LeaderboardService.getEntries();
        expect(entries.length).toBe(10);
        expect(entries.some((e: LeaderboardEntry) => e.name === 'Tie')).toBe(true);
    });
});

describe('timestamp tiebreak (D-06)', () => {
    it('newer timestamp sorts above same score', () => {
        vi.spyOn(Date, 'now').mockReturnValueOnce(1000);
        LeaderboardService.saveEntry('Old', 100);
        vi.spyOn(Date, 'now').mockReturnValueOnce(2000);
        LeaderboardService.saveEntry('New', 100);
        expect(LeaderboardService.getEntries()[0].name).toBe('New');
    });
});

describe('getRank (LB-02)', () => {
    it('returns 1 on empty board for any score', () => {
        expect(LeaderboardService.getRank(50)).toBe(1);
    });

    it('returns correct rank for mid-range score', () => {
        vi.spyOn(Date, 'now').mockReturnValueOnce(1000);
        LeaderboardService.saveEntry('A', 100);
        vi.spyOn(Date, 'now').mockReturnValueOnce(2000);
        LeaderboardService.saveEntry('B', 80);
        vi.spyOn(Date, 'now').mockReturnValueOnce(3000);
        LeaderboardService.saveEntry('C', 60);
        vi.spyOn(Date, 'now').mockReturnValueOnce(4000);
        LeaderboardService.saveEntry('D', 40);

        expect(LeaderboardService.getRank(70)).toBe(3);
    });

    it('returns null when board full and score below lowest', () => {
        fillBoard();
        expect(LeaderboardService.getRank(5)).toBeNull();
    });

    it('returns 1 for highest score', () => {
        vi.spyOn(Date, 'now').mockReturnValueOnce(1000);
        LeaderboardService.saveEntry('A', 100);
        vi.spyOn(Date, 'now').mockReturnValueOnce(2000);
        LeaderboardService.saveEntry('B', 80);
        vi.spyOn(Date, 'now').mockReturnValueOnce(3000);
        LeaderboardService.saveEntry('C', 60);

        expect(LeaderboardService.getRank(200)).toBe(1);
    });
});

describe('zero cc imports', () => {
    it('LeaderboardService.ts has no cc imports', () => {
        const filePath = path.resolve(__dirname, 'LeaderboardService.ts');
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content).not.toMatch(/from ['"]cc['"]/);
    });
});
