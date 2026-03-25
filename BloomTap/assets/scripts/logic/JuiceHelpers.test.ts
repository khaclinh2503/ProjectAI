// BloomTap/assets/scripts/logic/JuiceHelpers.test.ts
import { describe, it, expect } from 'vitest';
import {
    getFloatLabelString,
    getFloatFontSize,
    getFloatDuration,
    getUrgencyStage,
    getMilestoneLabel,
    MILESTONE_THRESHOLDS,
    getScoreFlashColor,
    getComboStartScale,
} from './JuiceHelpers';

describe('getFloatLabelString', () => {
    it('returns the raw string for negative amounts', () => {
        expect(getFloatLabelString(-30)).toBe('-30');
    });
    it('returns "+N" for positive amounts', () => {
        expect(getFloatLabelString(120)).toBe('+120');
    });
    it('returns "+0" for zero', () => {
        expect(getFloatLabelString(0)).toBe('+0');
    });
    it('handles large positive amounts', () => {
        expect(getFloatLabelString(500)).toBe('+500');
    });
});

describe('getFloatFontSize', () => {
    it('returns 32 for rawScore=0 (wrong tap base)', () => {
        expect(getFloatFontSize(0)).toBe(32);
    });
    it('returns 32 for rawScore=15 (SUNFLOWER BLOOMING start)', () => {
        expect(getFloatFontSize(15)).toBe(32);
    });
    it('returns 38 for rawScore=40 (CHRYSANTHEMUM BLOOMING / ROSE full bloom)', () => {
        expect(getFloatFontSize(40)).toBe(38);
    });
    it('returns 42 for rawScore=60 (LOTUS BLOOMING / CHRYSANTHEMUM full bloom)', () => {
        expect(getFloatFontSize(60)).toBe(42);
    });
    it('returns 47 for rawScore=80 (CHERRY BLOOMING start)', () => {
        expect(getFloatFontSize(80)).toBe(47);
    });
    it('returns 56 for rawScore=120 (CHERRY full bloom — max)', () => {
        expect(getFloatFontSize(120)).toBe(56);
    });
    it('caps at 56 for rawScore above 120', () => {
        expect(getFloatFontSize(200)).toBe(56);
    });
});

describe('getFloatDuration', () => {
    it('returns 0.4s at multiplier 1', () => {
        expect(getFloatDuration(1)).toBeCloseTo(0.4);
    });
    it('returns 0.8s at multiplier 5', () => {
        expect(getFloatDuration(5)).toBeCloseTo(0.8);
    });
    it('caps at 1.0s at multiplier 7 (formula hits cap exactly)', () => {
        expect(getFloatDuration(7)).toBeCloseTo(1.0);
    });
    it('caps at 1.0s when multiplier is very high (10)', () => {
        expect(getFloatDuration(10)).toBeCloseTo(1.0);
    });
});

describe('getUrgencyStage', () => {
    it('returns 0 (normal) when > 60s remaining', () => {
        expect(getUrgencyStage(61)).toBe(0);
    });
    it('returns 1 (yellow) at exactly 60s remaining', () => {
        expect(getUrgencyStage(60)).toBe(1);
    });
    it('returns 1 (yellow) between 31-60s', () => {
        expect(getUrgencyStage(31)).toBe(1);
    });
    it('returns 2 (orange) at exactly 30s remaining', () => {
        expect(getUrgencyStage(30)).toBe(2);
    });
    it('returns 2 (orange) between 11-30s', () => {
        expect(getUrgencyStage(11)).toBe(2);
    });
    it('returns 3 (red+blink) at exactly 10s remaining', () => {
        expect(getUrgencyStage(10)).toBe(3);
    });
    it('returns 3 (red+blink) below 10s', () => {
        expect(getUrgencyStage(5)).toBe(3);
    });
    it('returns 3 (red+blink) at 0s', () => {
        expect(getUrgencyStage(0)).toBe(3);
    });
});

describe('getMilestoneLabel', () => {
    it('returns label string for first x10', () => {
        const triggered = new Set<number>();
        expect(getMilestoneLabel(10, triggered)).toBe('COMBO x10!');
    });
    it('adds the threshold to the triggered Set', () => {
        const triggered = new Set<number>();
        getMilestoneLabel(10, triggered);
        expect(triggered.has(10)).toBe(true);
    });
    it('returns null if x10 already triggered', () => {
        const triggered = new Set<number>([10]);
        expect(getMilestoneLabel(10, triggered)).toBeNull();
    });
    it('returns label for x25', () => {
        const triggered = new Set<number>();
        expect(getMilestoneLabel(25, triggered)).toBe('COMBO x25!');
    });
    it('returns label for x50', () => {
        const triggered = new Set<number>();
        expect(getMilestoneLabel(50, triggered)).toBe('COMBO x50!');
    });
    it('returns null for non-milestone tapCount (5)', () => {
        const triggered = new Set<number>();
        expect(getMilestoneLabel(5, triggered)).toBeNull();
    });
    it('returns null for non-milestone tapCount (100)', () => {
        const triggered = new Set<number>();
        expect(getMilestoneLabel(100, triggered)).toBeNull();
    });
});

describe('MILESTONE_THRESHOLDS', () => {
    it('contains exactly [10, 25, 50]', () => {
        expect(MILESTONE_THRESHOLDS).toEqual([10, 25, 50]);
    });
});

describe('getScoreFlashColor', () => {
    it('returns white {r:255,g:255,b:255} for delta 0 (no score)', () => {
        expect(getScoreFlashColor(0)).toEqual({ r: 255, g: 255, b: 255 });
    });
    it('returns white for delta 30 (below 50 threshold)', () => {
        expect(getScoreFlashColor(30)).toEqual({ r: 255, g: 255, b: 255 });
    });
    it('returns yellow {r:255,g:220,b:60} for delta 50 (at 50 threshold)', () => {
        expect(getScoreFlashColor(50)).toEqual({ r: 255, g: 220, b: 60 });
    });
    it('returns yellow for delta 75 (50-99 range)', () => {
        expect(getScoreFlashColor(75)).toEqual({ r: 255, g: 220, b: 60 });
    });
    it('returns orange {r:255,g:160,b:0} for delta 100 (at 100 threshold)', () => {
        expect(getScoreFlashColor(100)).toEqual({ r: 255, g: 160, b: 0 });
    });
    it('returns orange for delta 250 (above 100)', () => {
        expect(getScoreFlashColor(250)).toEqual({ r: 255, g: 160, b: 0 });
    });
});

describe('getComboStartScale', () => {
    it('returns 1.0 for streak 0 (no punch-in)', () => {
        expect(getComboStartScale(0)).toBe(1.0);
    });
    it('returns 1.0 for streak 1 (no punch-in)', () => {
        expect(getComboStartScale(1)).toBe(1.0);
    });
    it('returns 1.5 for streak 2 (minimum punch-in scale)', () => {
        expect(getComboStartScale(2)).toBe(1.5);
    });
    it('returns approximately 2.0625 for streak 5', () => {
        expect(getComboStartScale(5)).toBeCloseTo(2.0625, 4);
    });
    it('returns 3.0 for streak 10 (max before clamp)', () => {
        expect(getComboStartScale(10)).toBeCloseTo(3.0, 4);
    });
    it('returns 3.0 for streak 15 (clamped at max)', () => {
        expect(getComboStartScale(15)).toBe(3.0);
    });
});
