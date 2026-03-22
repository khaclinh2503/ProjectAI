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
    it('starts with activeEffect=null', () => {
        const state = new PowerUpState();
        expect(state.activeEffect).toBeNull();
    });

    it('starts with expiryMs=0', () => {
        const state = new PowerUpState();
        expect(state.expiryMs).toBe(0);
    });
});

describe('PowerUpState.isActive()', () => {
    it('returns false when no effect active', () => {
        const state = new PowerUpState();
        expect(state.isActive(0)).toBe(false);
    });

    it('returns true when nowMs < expiryMs and activeEffect is set', () => {
        const state = new PowerUpState();
        state.activate(EffectType.SCORE_MULTIPLIER, 1000, 6000);
        // expiryMs = 7000, nowMs = 5000 => active
        expect(state.isActive(5000)).toBe(true);
    });

    it('returns false when nowMs >= expiryMs (expired)', () => {
        const state = new PowerUpState();
        state.activate(EffectType.SCORE_MULTIPLIER, 1000, 6000);
        // expiryMs = 7000, nowMs = 7000 => not active (expired)
        expect(state.isActive(7000)).toBe(false);
    });

    it('returns false when nowMs > expiryMs', () => {
        const state = new PowerUpState();
        state.activate(EffectType.TIME_FREEZE, 1000, 5000);
        // expiryMs = 6000, nowMs = 8000 => expired
        expect(state.isActive(8000)).toBe(false);
    });
});

describe('PowerUpState.activate()', () => {
    it('activate(SCORE_MULTIPLIER, 1000, 6000) sets activeEffect and expiryMs=7000', () => {
        const state = new PowerUpState();
        state.activate(EffectType.SCORE_MULTIPLIER, 1000, 6000);
        expect(state.activeEffect).toBe(EffectType.SCORE_MULTIPLIER);
        expect(state.expiryMs).toBe(7000);
    });

    it('activate() with different effect REPLACES active effect (D-05 replacement semantics)', () => {
        const state = new PowerUpState();
        state.activate(EffectType.SCORE_MULTIPLIER, 0, 6000);
        // Now activate a different effect
        state.activate(EffectType.TIME_FREEZE, 2000, 5000);
        expect(state.activeEffect).toBe(EffectType.TIME_FREEZE);
        expect(state.expiryMs).toBe(7000); // 2000 + 5000
    });

    it('activate() with same effect RESETS the timer (D-06)', () => {
        const state = new PowerUpState();
        state.activate(EffectType.SCORE_MULTIPLIER, 0, 6000);
        // expiryMs = 6000
        // Re-activate same effect at nowMs=3000 with 6000 duration
        state.activate(EffectType.SCORE_MULTIPLIER, 3000, 6000);
        expect(state.activeEffect).toBe(EffectType.SCORE_MULTIPLIER);
        expect(state.expiryMs).toBe(9000); // 3000 + 6000
    });
});

describe('PowerUpState.tick()', () => {
    it('clears activeEffect to null when nowMs >= expiryMs', () => {
        const state = new PowerUpState();
        state.activate(EffectType.SLOW_GROWTH, 0, 8000);
        // expiryMs = 8000
        state.tick(8000); // nowMs >= expiryMs
        expect(state.activeEffect).toBeNull();
        expect(state.expiryMs).toBe(0);
    });

    it('does nothing when nowMs < expiryMs', () => {
        const state = new PowerUpState();
        state.activate(EffectType.SLOW_GROWTH, 0, 8000);
        state.tick(7999); // not expired yet
        expect(state.activeEffect).toBe(EffectType.SLOW_GROWTH);
        expect(state.expiryMs).toBe(8000);
    });
});

describe('PowerUpState.shiftExpiry()', () => {
    it('shiftExpiry(500) adds 500 to expiryMs when effect active', () => {
        const state = new PowerUpState();
        state.activate(EffectType.TIME_FREEZE, 0, 5000);
        // expiryMs = 5000
        state.shiftExpiry(500);
        expect(state.expiryMs).toBe(5500);
    });

    it('shiftExpiry(500) does nothing when no effect active', () => {
        const state = new PowerUpState();
        state.shiftExpiry(500);
        expect(state.expiryMs).toBe(0);
        expect(state.activeEffect).toBeNull();
    });
});

describe('PowerUpState.getRemainingMs()', () => {
    it('returns expiryMs - nowMs when active', () => {
        const state = new PowerUpState();
        state.activate(EffectType.SCORE_MULTIPLIER, 0, 6000);
        expect(state.getRemainingMs(2000)).toBe(4000); // 6000 - 2000
    });

    it('returns 0 when not active', () => {
        const state = new PowerUpState();
        expect(state.getRemainingMs(1000)).toBe(0);
    });

    it('returns 0 when expired', () => {
        const state = new PowerUpState();
        state.activate(EffectType.SCORE_MULTIPLIER, 0, 6000);
        expect(state.getRemainingMs(7000)).toBe(0); // not active (isActive returns false)
    });
});

describe('PowerUpState.reset()', () => {
    it('clears activeEffect to null and expiryMs to 0', () => {
        const state = new PowerUpState();
        state.activate(EffectType.SLOW_GROWTH, 0, 8000);
        state.reset();
        expect(state.activeEffect).toBeNull();
        expect(state.expiryMs).toBe(0);
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
        expect(result.cycleDurationMs).toBe(6000); // Math.round(3000 * 2.0)
    });

    it('does NOT mutate the original config object', () => {
        applySlowGrowthConfig(baseConfig, 2.0);
        expect(baseConfig.cycleDurationMs).toBe(3000);
    });

    it('preserves all other fields (id, budMs, scoreBloom, etc.)', () => {
        const result = applySlowGrowthConfig(baseConfig, 2.0);
        expect(result.id).toBe(FlowerTypeId.CHERRY);
        expect(result.budMs).toBe(1350);
        expect(result.tapWindowMs).toBe(900);
        expect(result.bloomingMs).toBe(600);
        expect(result.fullBloomMs).toBe(300);
        expect(result.wiltingMs).toBe(450);
        expect(result.deadMs).toBe(300);
        expect(result.scoreBloom).toBe(80);
        expect(result.scoreFull).toBe(120);
    });

    it('applies Math.round to cycleDurationMs (non-integer factor)', () => {
        const result = applySlowGrowthConfig(baseConfig, 1.5);
        // Math.round(3000 * 1.5) = Math.round(4500) = 4500
        expect(result.cycleDurationMs).toBe(4500);
    });

    it('returns a different object reference (not a mutation)', () => {
        const result = applySlowGrowthConfig(baseConfig, 2.0);
        expect(result).not.toBe(baseConfig);
    });
});
