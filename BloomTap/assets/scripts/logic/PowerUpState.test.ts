import { describe, it, expect } from 'vitest';
import { PowerUpState, SpecialEffectType, applySlowGrowthConfig } from './PowerUpState';
import { FlowerTypeConfig, FlowerTypeId } from './FlowerTypes';

// ---------------------------------------------------------------------------
// Shared base FlowerTypeConfig for applySlowGrowthConfig tests
// ---------------------------------------------------------------------------

const baseConfig: FlowerTypeConfig = {
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

describe('PowerUpState — activate / isActive', () => {
    it('SCORE_MULTIPLIER: activate sets expiry; isActive true before expiry, false at expiry', () => {
        const ps = new PowerUpState();
        ps.activate('SCORE_MULTIPLIER', 1000, 6000, 3);
        // expiry = 1000 + 6000 = 7000
        expect(ps.isActive('SCORE_MULTIPLIER', 6999)).toBe(true);
        expect(ps.isActive('SCORE_MULTIPLIER', 7000)).toBe(false);
    });

    it('TIME_FREEZE: activate sets expiry; isActive true before expiry, false at expiry', () => {
        const ps = new PowerUpState();
        ps.activate('TIME_FREEZE', 1000, 5000);
        // expiry = 1000 + 5000 = 6000
        expect(ps.isActive('TIME_FREEZE', 5999)).toBe(true);
        expect(ps.isActive('TIME_FREEZE', 6000)).toBe(false);
    });

    it('SLOW_GROWTH: activate sets expiry; isActive true before expiry, false at expiry', () => {
        const ps = new PowerUpState();
        ps.activate('SLOW_GROWTH', 1000, 8000);
        // expiry = 1000 + 8000 = 9000
        expect(ps.isActive('SLOW_GROWTH', 8999)).toBe(true);
        expect(ps.isActive('SLOW_GROWTH', 9000)).toBe(false);
    });
});

describe('PowerUpState — D-08: all 3 effects active simultaneously', () => {
    it('D-08: getActiveCount returns 3 when all 3 effects are active', () => {
        const ps = new PowerUpState();
        ps.activate('SCORE_MULTIPLIER', 0, 10000, 2);
        ps.activate('TIME_FREEZE', 0, 10000);
        ps.activate('SLOW_GROWTH', 0, 10000);
        expect(ps.getActiveCount(5000)).toBe(3);
    });
});

describe('PowerUpState — D-09: same-type reactivation resets timer', () => {
    it('D-09: activate same type twice — second activation sets new expiry and multiplier', () => {
        const ps = new PowerUpState();
        ps.activate('SCORE_MULTIPLIER', 1000, 6000, 3);
        // First: expiry = 7000, multiplier = 3
        ps.activate('SCORE_MULTIPLIER', 5000, 6000, 5);
        // Second: expiry = 11000, multiplier = 5
        expect(ps.isActive('SCORE_MULTIPLIER', 10999)).toBe(true);
        expect(ps.isActive('SCORE_MULTIPLIER', 11000)).toBe(false);
        expect(ps.getScoreMultiplier()).toBe(5);
    });
});

describe('PowerUpState — D-10: different-type alongside existing', () => {
    it('D-10: activating TF does not affect SM, both active together', () => {
        const ps = new PowerUpState();
        ps.activate('SCORE_MULTIPLIER', 0, 10000, 2);
        ps.activate('TIME_FREEZE', 0, 10000);
        expect(ps.isActive('SCORE_MULTIPLIER', 5000)).toBe(true);
        expect(ps.isActive('TIME_FREEZE', 5000)).toBe(true);
    });
});

describe('PowerUpState — getScoreMultiplier', () => {
    it('returns stored multiplier value when SCORE_MULTIPLIER is active', () => {
        const ps = new PowerUpState();
        ps.activate('SCORE_MULTIPLIER', 0, 10000, 3);
        expect(ps.getScoreMultiplier()).toBe(3);
    });

    it('returns 1 when SCORE_MULTIPLIER is inactive (never activated)', () => {
        const ps = new PowerUpState();
        expect(ps.getScoreMultiplier()).toBe(1);
    });
});

describe('PowerUpState — getRemaining', () => {
    it('returns (expiry - nowMs) when active', () => {
        const ps = new PowerUpState();
        ps.activate('SCORE_MULTIPLIER', 1000, 6000, 2);
        // expiry = 7000; getRemaining(3000) = 7000 - 3000 = 4000
        expect(ps.getRemaining('SCORE_MULTIPLIER', 3000)).toBe(4000);
    });

    it('returns 0 when expired', () => {
        const ps = new PowerUpState();
        ps.activate('SCORE_MULTIPLIER', 1000, 6000, 2);
        // expiry = 7000; nowMs = 8000 → expired
        expect(ps.getRemaining('SCORE_MULTIPLIER', 8000)).toBe(0);
    });
});

describe('PowerUpState — shiftExpiries', () => {
    it('shifts all 3 expiry fields + lastSpecialSpawnMs by deltaMs', () => {
        const ps = new PowerUpState();
        ps.activate('SCORE_MULTIPLIER', 0, 5000, 2); // expiry = 5000
        ps.activate('TIME_FREEZE', 0, 5000);         // expiry = 5000
        ps.activate('SLOW_GROWTH', 0, 5000);         // expiry = 5000
        ps.recordSpecialSpawn(1000);                   // lastSpecialSpawnMs = 1000

        ps.shiftExpiries(500);

        // All expiries shifted: were active at 5499, now active at 5999
        expect(ps.isActive('SCORE_MULTIPLIER', 5499)).toBe(true);
        expect(ps.isActive('TIME_FREEZE', 5499)).toBe(true);
        expect(ps.isActive('SLOW_GROWTH', 5499)).toBe(true);

        // needsPitySpawn uses lastSpecialSpawnMs — shifted from 1000 to 1500
        // nowMs=31000, pityWindow=30000 → 31000 - 1500 = 29500 < 30000 → false
        expect(ps.needsPitySpawn(31000, 30000)).toBe(false);
    });
});

describe('PowerUpState — needsPitySpawn', () => {
    it('returns true when elapsed since last special spawn >= pityWindowMs (lastSpawn=0)', () => {
        const ps = new PowerUpState();
        // lastSpecialSpawnMs = 0 by default
        // nowMs=31000, pityWindow=30000 → 31000 - 0 = 31000 >= 30000 → true
        expect(ps.needsPitySpawn(31000, 30000)).toBe(true);
    });

    it('returns false when lastSpecialSpawnMs is recent (5000ms ago, pityWindow=30000)', () => {
        const ps = new PowerUpState();
        ps.recordSpecialSpawn(5000);
        // nowMs=31000, pityWindow=30000 → 31000 - 5000 = 26000 < 30000 → false
        expect(ps.needsPitySpawn(31000, 30000)).toBe(false);
    });
});

describe('PowerUpState — recordSpecialSpawn', () => {
    it('updates lastSpecialSpawnMs', () => {
        const ps = new PowerUpState();
        ps.recordSpecialSpawn(5000);
        // After recording at 5000ms, pity won't trigger until 5000+30000=35000
        expect(ps.needsPitySpawn(31000, 30000)).toBe(false);
        expect(ps.needsPitySpawn(35000, 30000)).toBe(true);
    });
});

describe('PowerUpState — reset', () => {
    it('zeros all expiries and sets lastSpecialSpawnMs = sessionStartMs', () => {
        const ps = new PowerUpState();
        ps.activate('SCORE_MULTIPLIER', 0, 10000, 3);
        ps.activate('TIME_FREEZE', 0, 10000);
        ps.activate('SLOW_GROWTH', 0, 10000);

        ps.reset(1000); // sessionStartMs = 1000

        // All effects should be inactive
        expect(ps.isActive('SCORE_MULTIPLIER', 500)).toBe(false);
        expect(ps.isActive('TIME_FREEZE', 500)).toBe(false);
        expect(ps.isActive('SLOW_GROWTH', 500)).toBe(false);

        // lastSpecialSpawnMs = 1000, so pity won't fire immediately
        // nowMs=31000, pityWindow=30000 → 31000 - 1000 = 30000 >= 30000 → true
        expect(ps.needsPitySpawn(31000, 30000)).toBe(true);
        // nowMs=30999, pityWindow=30000 → 30999 - 1000 = 29999 < 30000 → false
        expect(ps.needsPitySpawn(30999, 30000)).toBe(false);
    });

    it('resets _scoreMultiplierValue to 1', () => {
        const ps = new PowerUpState();
        ps.activate('SCORE_MULTIPLIER', 0, 10000, 5);
        ps.reset(0);
        expect(ps.getScoreMultiplier()).toBe(1);
    });
});

describe('applySlowGrowthConfig', () => {
    it('returns config with all 7 duration fields doubled (factor=2.0)', () => {
        const result = applySlowGrowthConfig(baseConfig, 2.0);
        expect(result.cycleDurationMs).toBe(6000);
        expect(result.budMs).toBe(2700);
        expect(result.tapWindowMs).toBe(1800);
        expect(result.bloomingMs).toBe(1200);
        expect(result.fullBloomMs).toBe(600);
        expect(result.wiltingMs).toBe(900);
        expect(result.deadMs).toBe(600);
    });

    it('non-duration fields (id, scoreBloom, scoreFull) are copied unchanged', () => {
        const result = applySlowGrowthConfig(baseConfig, 2.0);
        expect(result.id).toBe(FlowerTypeId.CHERRY);
        expect(result.scoreBloom).toBe(80);
        expect(result.scoreFull).toBe(120);
    });

    it('does NOT mutate the original config object', () => {
        const original = { ...baseConfig };
        applySlowGrowthConfig(baseConfig, 2.0);
        expect(baseConfig.cycleDurationMs).toBe(original.cycleDurationMs);
        expect(baseConfig.budMs).toBe(original.budMs);
    });

    it('applies Math.round to handle non-integer factors', () => {
        // factor=1.5: cycleDurationMs=3000*1.5=4500 (exact); budMs=1350*1.5=2025 (exact)
        const result = applySlowGrowthConfig(baseConfig, 1.5);
        expect(result.cycleDurationMs).toBe(4500);
        expect(result.budMs).toBe(2025);
    });
});
