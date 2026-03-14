import { describe, it, expect, beforeEach } from 'vitest';
import { ComboSystem } from './ComboSystem';

describe('ComboSystem', () => {
    let combo: ComboSystem;

    beforeEach(() => {
        combo = new ComboSystem();
    });

    describe('initial state', () => {
        it('starts with multiplier === 1', () => {
            expect(combo.multiplier).toBe(1);
        });

        it('starts with tapCount === 0', () => {
            expect(combo.tapCount).toBe(0);
        });
    });

    describe('onCorrectTap', () => {
        it('after 1 correct tap: multiplier === 1.5', () => {
            combo.onCorrectTap();
            expect(combo.multiplier).toBe(1.5);
        });

        it('after 2 correct taps: multiplier === 2.0', () => {
            combo.onCorrectTap();
            combo.onCorrectTap();
            expect(combo.multiplier).toBe(2.0);
        });

        it('increments tapCount on each correct tap', () => {
            combo.onCorrectTap();
            expect(combo.tapCount).toBe(1);
            combo.onCorrectTap();
            expect(combo.tapCount).toBe(2);
        });

        it('after 10 taps: multiplier === 6.0 (10 * 0.5 + 1)', () => {
            for (let i = 0; i < 10; i++) {
                combo.onCorrectTap();
            }
            expect(combo.multiplier).toBeCloseTo(6.0);
        });

        it('tap 10 uses step 0.5 (multiplier increases by 0.5 on tap 10)', () => {
            for (let i = 0; i < 9; i++) {
                combo.onCorrectTap();
            }
            const before = combo.multiplier; // 1 + 9*0.5 = 5.5
            combo.onCorrectTap(); // tap 10, still uses step 0.5
            expect(combo.multiplier).toBeCloseTo(before + 0.5);
        });

        it('tap 11 uses step 0.25 (step halved at tap 10 threshold)', () => {
            for (let i = 0; i < 10; i++) {
                combo.onCorrectTap();
            }
            const before = combo.multiplier; // 6.0
            combo.onCorrectTap(); // tap 11, uses new step 0.25
            expect(combo.multiplier).toBeCloseTo(before + 0.25);
        });

        it('after 11 taps: multiplier === 6.25', () => {
            for (let i = 0; i < 11; i++) {
                combo.onCorrectTap();
            }
            expect(combo.multiplier).toBeCloseTo(6.25);
        });

        it('tap 51 uses step 0.125 (step halved at tap 50 threshold)', () => {
            for (let i = 0; i < 50; i++) {
                combo.onCorrectTap();
            }
            const before = combo.multiplier;
            combo.onCorrectTap(); // tap 51, uses step 0.125
            expect(combo.multiplier).toBeCloseTo(before + 0.125);
        });
    });

    describe('onWrongTap', () => {
        it('after wrong tap: multiplier === 1', () => {
            combo.onCorrectTap();
            combo.onCorrectTap();
            combo.onWrongTap();
            expect(combo.multiplier).toBe(1);
        });

        it('after wrong tap: tapCount === 0', () => {
            combo.onCorrectTap();
            combo.onCorrectTap();
            combo.onWrongTap();
            expect(combo.tapCount).toBe(0);
        });

        it('after wrong tap: applyToScore(100) === 100 (multiplier back to 1x)', () => {
            combo.onCorrectTap();
            combo.onCorrectTap();
            combo.onWrongTap();
            expect(combo.applyToScore(100)).toBe(100);
        });

        it('after reset, step is back to 0.5 (tap 1 after reset: multiplier = 1.5)', () => {
            // Get to step 0.25 territory first
            for (let i = 0; i < 11; i++) {
                combo.onCorrectTap();
            }
            combo.onWrongTap();
            combo.onCorrectTap(); // tap 1 after reset, should use step 0.5
            expect(combo.multiplier).toBeCloseTo(1.5);
        });
    });

    describe('applyToScore', () => {
        it('applyToScore(rawScore) === rawScore * multiplier', () => {
            combo.onCorrectTap(); // multiplier = 1.5
            expect(combo.applyToScore(100)).toBeCloseTo(150);
        });

        it('applyToScore at default multiplier returns raw score', () => {
            expect(combo.applyToScore(200)).toBe(200);
        });

        it('applyToScore after multiple taps multiplies correctly', () => {
            combo.onCorrectTap();
            combo.onCorrectTap(); // multiplier = 2.0
            expect(combo.applyToScore(50)).toBeCloseTo(100);
        });
    });
});
