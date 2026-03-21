import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameState, WRONG_TAP_PENALTY, SESSION_DURATION_MS } from './GameState';
import { ComboSystem } from './ComboSystem';

describe('GameState', () => {
    let state: GameState;
    let combo: ComboSystem;

    beforeEach(() => {
        state = new GameState();
        combo = new ComboSystem();
    });

    describe('constants', () => {
        it('WRONG_TAP_PENALTY equals 10', () => {
            expect(WRONG_TAP_PENALTY).toBe(10);
        });
    });

    describe('initial state', () => {
        it('score starts at 0', () => {
            expect(state.score).toBe(0);
        });
    });

    describe('reset()', () => {
        it('zeroes score after modification', () => {
            state.applyCorrectTap(80, combo);
            state.reset();
            expect(state.score).toBe(0);
        });

        it('sets sessionStartMs to approximately performance.now()', () => {
            const before = performance.now();
            state.reset();
            const after = performance.now();
            expect(state.sessionStartMs).toBeGreaterThanOrEqual(before);
            expect(state.sessionStartMs).toBeLessThanOrEqual(after);
        });
    });

    describe('applyCorrectTap()', () => {
        // GAME-01: correct tap with rawScore=80, multiplier=1 → score=80
        it('GAME-01: applyCorrectTap(80, combo) with multiplier=1 → score=80', () => {
            // combo starts with multiplier=1
            expect(combo.multiplier).toBe(1);
            state.applyCorrectTap(80, combo);
            expect(state.score).toBe(80);
        });

        // GAME-02: FULL_BLOOM score (120) > BLOOMING score (80)
        it('GAME-02: FULL_BLOOM rawScore(120) produces higher score than BLOOMING rawScore(80)', () => {
            const stateBloom = new GameState();
            const comboBloom = new ComboSystem();
            stateBloom.applyCorrectTap(80, comboBloom);

            const stateFull = new GameState();
            const comboFull = new ComboSystem();
            stateFull.applyCorrectTap(120, comboFull);

            expect(stateFull.score).toBeGreaterThan(stateBloom.score);
        });

        it('increments combo after correct tap', () => {
            state.applyCorrectTap(80, combo);
            // multiplier starts at 1, after onCorrectTap() it becomes 1.5
            expect(combo.multiplier).toBe(1.5);
        });

        it('applies Math.round to avoid floating-point issues', () => {
            // First tap: score = round(80 * 1) = 80, multiplier becomes 1.5
            state.applyCorrectTap(80, combo);
            expect(state.score).toBe(80);

            // Second tap: score = 80 + round(80 * 1.5) = 80 + 120 = 200, multiplier becomes 2
            state.applyCorrectTap(80, combo);
            expect(state.score).toBe(200);
        });

        it('multiple correct taps accumulate: 2 taps with rising multiplier → score > 160', () => {
            state.applyCorrectTap(80, combo); // round(80*1) = 80
            state.applyCorrectTap(80, combo); // round(80*1.5) = 120 → total 200
            expect(state.score).toBeGreaterThan(160);
        });
    });

    describe('applyWrongTap()', () => {
        // GAME-03: wrong tap reduces score by WRONG_TAP_PENALTY, multiplier resets to 1
        it('GAME-03: applyWrongTap decreases score by 10', () => {
            state.applyCorrectTap(80, combo); // score = 80
            state.applyWrongTap(combo);
            expect(state.score).toBe(80 - WRONG_TAP_PENALTY);
        });

        it('GAME-03: applyWrongTap resets combo.multiplier to 1', () => {
            state.applyCorrectTap(80, combo); // multiplier becomes 1.5
            state.applyWrongTap(combo);
            expect(combo.multiplier).toBe(1);
        });

        it('score can go negative (no floor at 0)', () => {
            state.applyWrongTap(combo); // score 0 - 10 = -10
            expect(state.score).toBe(-10);
        });

        it('score decreases by exactly WRONG_TAP_PENALTY (10)', () => {
            state.applyWrongTap(combo);
            expect(state.score).toBe(-10);
        });
    });

    describe('getElapsedMs()', () => {
        it('returns a non-negative value after reset', () => {
            state.reset();
            const elapsed = state.getElapsedMs();
            expect(elapsed).toBeGreaterThanOrEqual(0);
        });

        it('returns performance.now() - sessionStartMs', () => {
            const fixedStart = 1000;
            const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(fixedStart);
            state.reset();
            nowSpy.mockReturnValue(fixedStart + 500);
            const elapsed = state.getElapsedMs();
            expect(elapsed).toBe(500);
            nowSpy.mockRestore();
        });
    });

    describe('isGameOver()', () => {
        it('returns false when elapsed < 120_000ms', () => {
            const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(0);
            state.reset(); // sessionStartMs = 0
            nowSpy.mockRestore();
            expect(state.isGameOver(119_999)).toBe(false);
        });

        it('returns true at exactly 120_000ms elapsed', () => {
            const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(0);
            state.reset();
            nowSpy.mockRestore();
            expect(state.isGameOver(120_000)).toBe(true);
        });

        it('returns true after 120_000ms elapsed', () => {
            const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(0);
            state.reset();
            nowSpy.mockRestore();
            expect(state.isGameOver(121_000)).toBe(true);
        });

        it('SESSION_DURATION_MS equals 120_000', () => {
            expect(SESSION_DURATION_MS).toBe(120_000);
        });
    });

    describe('Phase 6 stats', () => {
        it('correctTaps starts at 0', () => {
            expect(state.correctTaps).toBe(0);
        });

        it('applyCorrectTap increments correctTaps', () => {
            state.applyCorrectTap(80, combo);
            expect(state.correctTaps).toBe(1);
        });

        it('applyWrongTap increments wrongTaps', () => {
            state.applyWrongTap(combo);
            expect(state.wrongTaps).toBe(1);
        });

        it('peakStreak tracks highest combo.tapCount after onCorrectTap', () => {
            state.applyCorrectTap(80, combo); // tapCount becomes 1
            state.applyCorrectTap(80, combo); // tapCount becomes 2
            state.applyCorrectTap(80, combo); // tapCount becomes 3
            expect(state.peakStreak).toBe(3);
        });

        it('peakStreak does not decrease after wrong tap', () => {
            state.applyCorrectTap(80, combo); // tapCount 1
            state.applyCorrectTap(80, combo); // tapCount 2
            state.applyWrongTap(combo);       // tapCount resets to 0
            expect(state.peakStreak).toBe(2);
        });

        it('reset() zeroes correctTaps, wrongTaps, peakStreak', () => {
            state.applyCorrectTap(80, combo);
            state.applyWrongTap(combo);
            state.reset();
            expect(state.correctTaps).toBe(0);
            expect(state.wrongTaps).toBe(0);
            expect(state.peakStreak).toBe(0);
        });
    });
});

describe('applyCorrectTap with powerUpMultiplier', () => {
    it('applyCorrectTap(100, combo) with no powerUpMultiplier works as before (backward compatible)', () => {
        const state = new GameState();
        const combo = new ComboSystem();
        // combo.multiplier = 1 by default
        state.applyCorrectTap(100, combo);
        expect(state.score).toBe(100); // Math.round(100 * 1 * 1) = 100
    });

    it('applyCorrectTap(100, combo, 3) applies Math.round(100 * 1 * 3) = 300 to score', () => {
        const state = new GameState();
        const combo = new ComboSystem();
        // combo.multiplier = 1 by default, powerUpMultiplier = 3
        state.applyCorrectTap(100, combo, 3);
        expect(state.score).toBe(300); // Math.round(100 * 1 * 3) = 300
    });
});
