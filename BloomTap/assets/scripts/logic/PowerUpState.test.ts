import { describe, it, expect } from 'vitest';
import { EffectType, PowerUpState, applySlowGrowthConfig } from './PowerUpState';
import { FlowerTypeId } from './FlowerTypes';

describe('EffectType enum', () => {
    it('has SCORE_MULTIPLIER value', () => {
        expect(EffectType.SCORE_MULTIPLIER).toBe('SCORE_MULTIPLIER');
    });

    it('has TIME_FREEZE value', () => {
        expect(EffectType.TIME_FREEZE).toBe('TIME_FREEZE');
    });

    it('has SLOW_GROWTH value', () => {
        expect(EffectType.SLOW_GROWTH).toBe('SLOW_GROWTH');
    });
});

describe('PowerUpState initial state', () => {
    it('starts with no active effects', () => {
        const state = new PowerUpState();
        expect(state.isAnyActive(0)).toBe(false);
        expect(state.getActiveEffects(0)).toEqual([]);
    });
});

describe('PowerUpState.isEffectActive()', () => {
    it('returns false when no effect active', () => {
        const state = new PowerUpState();
        expect(state.isEffectActive(EffectType.SCORE_MULTIPLIER, 0)).toBe(false);
    });

    it('returns true when effect is active and not expired', () => {
        const state = new PowerUpState();
        state.activate(EffectType.SCORE_MULTIPLIER, 1000, 6000);
        expect(state.isEffectActive(EffectType.SCORE_MULTIPLIER, 5000)).toBe(true);
    });

    it('returns false when effect has expired (nowMs >= expiryMs)', () => {
        const state = new PowerUpState();
        state.activate(EffectType.SCORE_MULTIPLIER, 1000, 6000);
        expect(state.isEffectActive(EffectType.SCORE_MULTIPLIER, 7000)).toBe(false);
    });

    it('returns false for a different effect that was not activated', () => {
        const state = new PowerUpState();
        state.activate(EffectType.SCORE_MULTIPLIER, 0, 5000);
        expect(state.isEffectActive(EffectType.TIME_FREEZE, 1000)).toBe(false);
    });
});

describe('PowerUpState.isAnyActive()', () => {
    it('returns false when no effects active', () => {
        const state = new PowerUpState();
        expect(state.isAnyActive(0)).toBe(false);
    });

    it('returns true when at least one effect is active', () => {
        const state = new PowerUpState();
        state.activate(EffectType.TIME_FREEZE, 0, 5000);
        expect(state.isAnyActive(1000)).toBe(true);
    });

    it('returns false when all effects have expired', () => {
        const state = new PowerUpState();
        state.activate(EffectType.TIME_FREEZE, 0, 5000);
        expect(state.isAnyActive(6000)).toBe(false);
    });
});

describe('PowerUpState.activate() — stacking and replacement', () => {
    it('activate(SCORE_MULTIPLIER) sets that effect active', () => {
        const state = new PowerUpState();
        state.activate(EffectType.SCORE_MULTIPLIER, 1000, 6000);
        expect(state.isEffectActive(EffectType.SCORE_MULTIPLIER, 5000)).toBe(true);
    });

    it('different effect types STACK — both remain active simultaneously', () => {
        const state = new PowerUpState();
        state.activate(EffectType.SCORE_MULTIPLIER, 0, 6000);
        state.activate(EffectType.TIME_FREEZE, 2000, 5000);
        // Both active at nowMs=3000
        expect(state.isEffectActive(EffectType.SCORE_MULTIPLIER, 3000)).toBe(true);
        expect(state.isEffectActive(EffectType.TIME_FREEZE, 3000)).toBe(true);
        expect(state.getActiveEffects(3000).length).toBe(2);
    });

    it('same effect type REPLACES its timer (refreshes duration)', () => {
        const state = new PowerUpState();
        state.activate(EffectType.SCORE_MULTIPLIER, 0, 6000);
        // expiryMs = 6000 — then re-activate at nowMs=3000 with 6000 duration
        state.activate(EffectType.SCORE_MULTIPLIER, 3000, 6000);
        expect(state.isEffectActive(EffectType.SCORE_MULTIPLIER, 3000)).toBe(true);
        expect(state.getRemainingMs(EffectType.SCORE_MULTIPLIER, 3000)).toBe(6000);
    });

    it('all three effects can be active at once', () => {
        const state = new PowerUpState();
        state.activate(EffectType.SCORE_MULTIPLIER, 0, 10000);
        state.activate(EffectType.TIME_FREEZE, 0, 10000);
        state.activate(EffectType.SLOW_GROWTH, 0, 10000);
        expect(state.getActiveEffects(5000).length).toBe(3);
        expect(state.isAnyActive(5000)).toBe(true);
    });
});

describe('PowerUpState.tick()', () => {
    it('removes expired effects, keeps non-expired', () => {
        const state = new PowerUpState();
        state.activate(EffectType.SCORE_MULTIPLIER, 0, 5000); // expires at 5000
        state.activate(EffectType.TIME_FREEZE, 0, 10000);     // expires at 10000
        state.tick(6000);
        expect(state.isEffectActive(EffectType.SCORE_MULTIPLIER, 6000)).toBe(false);
        expect(state.isEffectActive(EffectType.TIME_FREEZE, 6000)).toBe(true);
    });

    it('clears effect exactly at expiryMs (nowMs >= expiryMs)', () => {
        const state = new PowerUpState();
        state.activate(EffectType.SLOW_GROWTH, 0, 8000);
        state.tick(8000);
        expect(state.isEffectActive(EffectType.SLOW_GROWTH, 8000)).toBe(false);
    });

    it('does nothing when no effects active', () => {
        const state = new PowerUpState();
        state.tick(1000);
        expect(state.isAnyActive(1000)).toBe(false);
    });
});

describe('PowerUpState.shiftExpiry()', () => {
    it('shifts all active effects forward by deltaMs', () => {
        const state = new PowerUpState();
        state.activate(EffectType.TIME_FREEZE, 0, 5000);     // expiry 5000
        state.activate(EffectType.SLOW_GROWTH, 0, 8000);     // expiry 8000
        state.shiftExpiry(500);
        expect(state.getRemainingMs(EffectType.TIME_FREEZE, 0)).toBe(5500);
        expect(state.getRemainingMs(EffectType.SLOW_GROWTH, 0)).toBe(8500);
    });

    it('does nothing when no effects active', () => {
        const state = new PowerUpState();
        state.shiftExpiry(500);
        expect(state.isAnyActive(0)).toBe(false);
    });
});

describe('PowerUpState.getRemainingMs()', () => {
    it('returns remaining ms for the specific effect', () => {
        const state = new PowerUpState();
        state.activate(EffectType.SCORE_MULTIPLIER, 0, 6000);
        expect(state.getRemainingMs(EffectType.SCORE_MULTIPLIER, 2000)).toBe(4000);
    });

    it('returns 0 when effect not active', () => {
        const state = new PowerUpState();
        expect(state.getRemainingMs(EffectType.TIME_FREEZE, 1000)).toBe(0);
    });

    it('returns 0 when effect expired', () => {
        const state = new PowerUpState();
        state.activate(EffectType.SCORE_MULTIPLIER, 0, 6000);
        expect(state.getRemainingMs(EffectType.SCORE_MULTIPLIER, 7000)).toBe(0);
    });
});

describe('PowerUpState.getActiveEffects()', () => {
    it('returns empty array when none active', () => {
        const state = new PowerUpState();
        expect(state.getActiveEffects(0)).toEqual([]);
    });

    it('returns only non-expired effects', () => {
        const state = new PowerUpState();
        state.activate(EffectType.SCORE_MULTIPLIER, 0, 3000); // expires at 3000
        state.activate(EffectType.TIME_FREEZE, 0, 8000);      // expires at 8000
        const active = state.getActiveEffects(5000);
        expect(active).toContain(EffectType.TIME_FREEZE);
        expect(active).not.toContain(EffectType.SCORE_MULTIPLIER);
    });
});

describe('PowerUpState.reset()', () => {
    it('clears all active effects', () => {
        const state = new PowerUpState();
        state.activate(EffectType.SCORE_MULTIPLIER, 0, 8000);
        state.activate(EffectType.TIME_FREEZE, 0, 8000);
        state.reset();
        expect(state.isAnyActive(1000)).toBe(false);
        expect(state.getActiveEffects(1000)).toEqual([]);
    });
});

describe('applySlowGrowthConfig()', () => {
    const baseConfig = {
        id: FlowerTypeId.CHERRY,
        cycleDurationMs: 3000,
        budMs: 1350,
        tapWindowMs: 900,
        bloomingMs: 600,
        fullBloomMs: 300,
        wiltingMs: 450,
        deadMs: 300,
        scoreBloom: 80,
        scoreFull: 120,
    };

    it('returns new object with cycleDurationMs doubled (factor=2.0)', () => {
        const result = applySlowGrowthConfig(baseConfig, 2.0);
        expect(result.cycleDurationMs).toBe(6000);
    });

    it('does NOT mutate the original config object', () => {
        applySlowGrowthConfig(baseConfig, 2.0);
        expect(baseConfig.cycleDurationMs).toBe(3000);
    });

    it('preserves all other fields', () => {
        const result = applySlowGrowthConfig(baseConfig, 2.0);
        expect(result.id).toBe(FlowerTypeId.CHERRY);
        expect(result.budMs).toBe(1350);
        expect(result.scoreBloom).toBe(80);
        expect(result.scoreFull).toBe(120);
    });

    it('applies Math.round to cycleDurationMs (non-integer factor)', () => {
        const result = applySlowGrowthConfig(baseConfig, 1.5);
        expect(result.cycleDurationMs).toBe(4500);
    });

    it('returns a different object reference (not a mutation)', () => {
        const result = applySlowGrowthConfig(baseConfig, 2.0);
        expect(result).not.toBe(baseConfig);
    });
});
