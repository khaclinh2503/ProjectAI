import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameState, WRONG_TAP_PENALTY } from './GameState';
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
            state.reset();
            const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(state.sessionStartMs + 500);
            const elapsed = state.getElapsedMs();
            expect(elapsed).toBe(500);
            nowSpy.mockRestore();
        });
    });
});
