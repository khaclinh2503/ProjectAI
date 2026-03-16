// BloomTap/assets/scripts/logic/JuiceHelpers.test.ts
import { describe, it, expect } from 'vitest';
import {
    getFloatLabelString,
    getFloatFontSize,
    getFloatDuration,
    getUrgencyStage,
    getMilestoneLabel,
    MILESTONE_THRESHOLDS,
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
