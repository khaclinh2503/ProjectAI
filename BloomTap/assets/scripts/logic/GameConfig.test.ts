import { describe, it, expect } from 'vitest';
import { parseGameConfig, PowerUpsConfig } from './GameConfig';

// ---------------------------------------------------------------------------
// Valid fixture data — mirrors flowers.json and settings.json exactly
// ---------------------------------------------------------------------------

const validFlowersData = {
    flowers: {
        CHERRY: {
            cycleDurationMs: 3000, budMs: 1350, tapWindowMs: 900,
            bloomingMs: 600, fullBloomMs: 300, wiltingMs: 450, deadMs: 300,
            scoreBloom: 80, scoreFull: 120,
        },
        LOTUS: {
            cycleDurationMs: 4500, budMs: 1710, tapWindowMs: 1800,
            bloomingMs: 1200, fullBloomMs: 600, wiltingMs: 630, deadMs: 360,
            scoreBloom: 60, scoreFull: 90,
        },
        CHRYSANTHEMUM: {
            cycleDurationMs: 6000, budMs: 1800, tapWindowMs: 3000,
            bloomingMs: 2000, fullBloomMs: 1000, wiltingMs: 780, deadMs: 420,
            scoreBloom: 40, scoreFull: 60,
        },
        ROSE: {
            cycleDurationMs: 8000, budMs: 1840, tapWindowMs: 4800,
            bloomingMs: 3200, fullBloomMs: 1600, wiltingMs: 880, deadMs: 480,
            scoreBloom: 25, scoreFull: 40,
        },
        SUNFLOWER: {
            cycleDurationMs: 10000, budMs: 1700, tapWindowMs: 7000,
            bloomingMs: 4670, fullBloomMs: 2330, wiltingMs: 800, deadMs: 500,
            scoreBloom: 15, scoreFull: 25,
        },
    },
    spawnPhases: [
        {
            startMs: 0, endMs: 40000, intervalMs: 3000, maxAlive: 8, spawnBatch: 3,
            initialCount: 5,
            weights: { SUNFLOWER: 35, ROSE: 30, CHRYSANTHEMUM: 20, LOTUS: 10, CHERRY: 5 },
        },
        {
            startMs: 40000, endMs: 80000, intervalMs: 2000, maxAlive: 16, spawnBatch: 4,
            weights: { SUNFLOWER: 15, ROSE: 20, CHRYSANTHEMUM: 30, LOTUS: 20, CHERRY: 15 },
        },
        {
            startMs: 80000, endMs: 120000, intervalMs: 1000, maxAlive: 28, spawnBatch: 5,
            weights: { SUNFLOWER: 5, ROSE: 10, CHRYSANTHEMUM: 20, LOTUS: 30, CHERRY: 35 },
        },
    ],
    powerUps: {
        specialChance: 0.08,
        pityWindowMs: 30000,
        scoreMultiplier: {
            durationMs: 6000,
            multiplierByPhase: [2, 3, 5],
        },
        timeFreeze: {
            durationMs: 5000,
        },
        slowGrowth: {
            durationMs: 8000,
            factor: 2.0,
        },
    },
};

const validSettingsData = {
    session: { durationMs: 120000 },
    scoring: { wrongTapPenalty: 10 },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('parseGameConfig', () => {
    // Test 1: valid input does not throw
    it('does not throw when given well-formed flowers and settings data', () => {
        expect(() => parseGameConfig(validFlowersData, validSettingsData)).not.toThrow();
    });

    // Test 2: CHERRY cycleDurationMs
    it('returns flowers.CHERRY.cycleDurationMs === 3000', () => {
        const config = parseGameConfig(validFlowersData, validSettingsData);
        expect(config.flowers.CHERRY.cycleDurationMs).toBe(3000);
    });

    // Test 3: CHERRY scoreFull
    it('returns flowers.CHERRY.scoreFull === 120', () => {
        const config = parseGameConfig(validFlowersData, validSettingsData);
        expect(config.flowers.CHERRY.scoreFull).toBe(120);
    });

    // Test 4: all 5 flower types present
    it('returns all 5 flower type keys', () => {
        const config = parseGameConfig(validFlowersData, validSettingsData);
        expect(Object.keys(config.flowers).sort()).toEqual(
            ['CHERRY', 'CHRYSANTHEMUM', 'LOTUS', 'ROSE', 'SUNFLOWER'],
        );
    });

    // Test 5: 3 spawn phases with correct intervalMs values
    it('returns 3 spawnPhases with intervalMs values 3000, 2000, 1000', () => {
        const config = parseGameConfig(validFlowersData, validSettingsData);
        expect(config.spawnPhases).toHaveLength(3);
        expect(config.spawnPhases[0].intervalMs).toBe(3000);
        expect(config.spawnPhases[1].intervalMs).toBe(2000);
        expect(config.spawnPhases[2].intervalMs).toBe(1000);
    });

    // Test 6: session durationMs
    it('returns settings.session.durationMs === 120000', () => {
        const config = parseGameConfig(validFlowersData, validSettingsData);
        expect(config.settings.session.durationMs).toBe(120000);
    });

    // Test 7: wrongTapPenalty
    it('returns settings.scoring.wrongTapPenalty === 10', () => {
        const config = parseGameConfig(validFlowersData, validSettingsData);
        expect(config.settings.scoring.wrongTapPenalty).toBe(10);
    });

    // Test 8: throws when flowersData is not an object
    it('throws when flowersData is null', () => {
        expect(() => parseGameConfig(null, validSettingsData)).toThrow();
    });

    it('throws when flowersData is a string', () => {
        expect(() => parseGameConfig('{"flowers":{}}', validSettingsData)).toThrow();
    });

    // Test 9: throws when CHERRY.cycleDurationMs is 0
    it('throws when flowers.CHERRY.cycleDurationMs is 0 — error message contains "cycleDurationMs"', () => {
        const badFlowers = {
            ...validFlowersData,
            flowers: {
                ...validFlowersData.flowers,
                CHERRY: { ...validFlowersData.flowers.CHERRY, cycleDurationMs: 0 },
            },
        };
        expect(() => parseGameConfig(badFlowers, validSettingsData)).toThrowError(/cycleDurationMs/);
    });

    // Test 10: throws when CHERRY.cycleDurationMs is NaN
    it('throws when flowers.CHERRY.cycleDurationMs is NaN — error message contains "cycleDurationMs"', () => {
        const badFlowers = {
            ...validFlowersData,
            flowers: {
                ...validFlowersData.flowers,
                CHERRY: { ...validFlowersData.flowers.CHERRY, cycleDurationMs: NaN },
            },
        };
        expect(() => parseGameConfig(badFlowers, validSettingsData)).toThrowError(/cycleDurationMs/);
    });

    // Test 11: throws when a required flower field is missing
    it('throws when a required flower field (scoreBloom) is missing from CHERRY', () => {
        const { scoreBloom: _removed, ...cherryWithout } = validFlowersData.flowers.CHERRY;
        const badFlowers = {
            ...validFlowersData,
            flowers: {
                ...validFlowersData.flowers,
                CHERRY: cherryWithout,
            },
        };
        expect(() => parseGameConfig(badFlowers, validSettingsData)).toThrow();
    });

    // Test 12: throws when wrongTapPenalty is negative
    it('throws when settings.scoring.wrongTapPenalty is negative', () => {
        const badSettings = {
            ...validSettingsData,
            scoring: { wrongTapPenalty: -1 },
        };
        expect(() => parseGameConfig(validFlowersData, badSettings)).toThrow();
    });

    // Test 13: does NOT throw when wrongTapPenalty is 0
    it('does NOT throw when wrongTapPenalty is 0 (zero is valid)', () => {
        const settings = {
            ...validSettingsData,
            scoring: { wrongTapPenalty: 0 },
        };
        expect(() => parseGameConfig(validFlowersData, settings)).not.toThrow();
    });

    // Test 14: does NOT throw when a spawn phase weight is 0
    it('does NOT throw when a spawn phase weight is 0 (zero excludes that type)', () => {
        const flowers = {
            ...validFlowersData,
            spawnPhases: [
                {
                    ...validFlowersData.spawnPhases[0],
                    weights: { ...validFlowersData.spawnPhases[0].weights, CHERRY: 0 },
                },
                ...validFlowersData.spawnPhases.slice(1),
            ],
        };
        expect(() => parseGameConfig(flowers, validSettingsData)).not.toThrow();
    });

    // Test 15: throws when settings.session.durationMs is missing
    it('throws when settings.session.durationMs is missing', () => {
        const badSettings = {
            ...validSettingsData,
            session: {},
        };
        expect(() => parseGameConfig(validFlowersData, badSettings)).toThrow();
    });

    // Test 16: throws when spawnPhases is missing from flowers data
    it('throws when spawnPhases is missing from flowers data', () => {
        const { spawnPhases: _removed, ...flowersWithout } = validFlowersData;
        expect(() => parseGameConfig(flowersWithout, validSettingsData)).toThrow();
    });

    // Test 17: throws when flowers key is missing from flowers data
    it('throws when flowers key is missing from flowers data', () => {
        const { flowers: _removed, ...flowersWithout } = validFlowersData;
        expect(() => parseGameConfig(flowersWithout, validSettingsData)).toThrow();
    });

    // Test 18: each parsed FlowerTypeConfig has id field matching its key
    it('each parsed FlowerTypeConfig has id field matching its key', () => {
        const config = parseGameConfig(validFlowersData, validSettingsData);
        expect(config.flowers.CHERRY.id).toBe('CHERRY');
        expect(config.flowers.LOTUS.id).toBe('LOTUS');
        expect(config.flowers.CHRYSANTHEMUM.id).toBe('CHRYSANTHEMUM');
        expect(config.flowers.ROSE.id).toBe('ROSE');
        expect(config.flowers.SUNFLOWER.id).toBe('SUNFLOWER');
    });
});

describe('initialCount validation', () => {
    // Test 1: valid initialCount on phase 0 is returned
    it('returns spawnPhases[0].initialCount === 5 when initialCount is 5', () => {
        const config = parseGameConfig(validFlowersData, validSettingsData);
        expect(config.spawnPhases[0].initialCount).toBe(5);
    });

    // Test 2: missing initialCount on phase 0 throws
    it('throws when initialCount is missing from spawnPhases[0]', () => {
        const flowersWithout = JSON.parse(JSON.stringify(validFlowersData));
        delete flowersWithout.spawnPhases[0].initialCount;
        expect(() => parseGameConfig(flowersWithout, validSettingsData))
            .toThrowError(/spawnPhases\[0\]\.initialCount must be a number/);
    });

    // Test 3: initialCount === 0 on phase 0 throws
    it('throws when initialCount is 0 on phase 0', () => {
        const flowersZero = JSON.parse(JSON.stringify(validFlowersData));
        flowersZero.spawnPhases[0].initialCount = 0;
        expect(() => parseGameConfig(flowersZero, validSettingsData))
            .toThrowError(/spawnPhases\[0\]\.initialCount must be > 0/);
    });

    // Test 4: initialCount === -1 on phase 0 throws
    it('throws when initialCount is -1 on phase 0', () => {
        const flowersNeg = JSON.parse(JSON.stringify(validFlowersData));
        flowersNeg.spawnPhases[0].initialCount = -1;
        expect(() => parseGameConfig(flowersNeg, validSettingsData))
            .toThrowError(/spawnPhases\[0\]\.initialCount must be > 0/);
    });

    // Test 5: initialCount absent on phases 1 and 2 does NOT throw
    it('does NOT throw when initialCount is absent from spawnPhases[1] and spawnPhases[2]', () => {
        const flowersNoPhase12 = JSON.parse(JSON.stringify(validFlowersData));
        delete flowersNoPhase12.spawnPhases[1].initialCount;
        delete flowersNoPhase12.spawnPhases[2].initialCount;
        expect(() => parseGameConfig(flowersNoPhase12, validSettingsData)).not.toThrow();
    });

    // Test 6: parsed spawnPhases[1] and [2] do NOT have initialCount property
    it('parsed spawnPhases[1] and spawnPhases[2] do NOT have initialCount property (undefined)', () => {
        const config = parseGameConfig(validFlowersData, validSettingsData);
        expect(config.spawnPhases[1].initialCount).toBeUndefined();
        expect(config.spawnPhases[2].initialCount).toBeUndefined();
    });
});

describe('powerUps config parsing', () => {
    it('parseGameConfig with valid powerUps block returns PowerUpsConfig with correct values', () => {
        const config = parseGameConfig(validFlowersData, validSettingsData);
        expect(config.powerUps.specialChance).toBe(0.08);
        expect(config.powerUps.pityWindowMs).toBe(30000);
        expect(config.powerUps.scoreMultiplier.durationMs).toBe(6000);
        expect(config.powerUps.scoreMultiplier.multiplierByPhase).toEqual([2, 3, 5]);
        expect(config.powerUps.timeFreeze.durationMs).toBe(5000);
        expect(config.powerUps.slowGrowth.durationMs).toBe(8000);
        expect(config.powerUps.slowGrowth.factor).toBe(2.0);
    });

    it('parseGameConfig with missing powerUps block throws descriptive error', () => {
        const { powerUps: _removed, ...withoutPowerUps } = validFlowersData;
        expect(() => parseGameConfig(withoutPowerUps, validSettingsData))
            .toThrowError(/powerUps/);
    });

    it('parseGameConfig with specialChance=-1 throws about specialChance', () => {
        const bad = {
            ...validFlowersData,
            powerUps: { ...validFlowersData.powerUps, specialChance: -1 },
        };
        expect(() => parseGameConfig(bad, validSettingsData))
            .toThrowError(/specialChance/);
    });

    it('parseGameConfig with missing multiplierByPhase throws descriptive error', () => {
        const bad = {
            ...validFlowersData,
            powerUps: {
                ...validFlowersData.powerUps,
                scoreMultiplier: { durationMs: 6000 },
            },
        };
        expect(() => parseGameConfig(bad, validSettingsData)).toThrow();
    });

    it('parseGameConfig with multiplierByPhase length !== 3 throws descriptive error', () => {
        const bad = {
            ...validFlowersData,
            powerUps: {
                ...validFlowersData.powerUps,
                scoreMultiplier: {
                    durationMs: 6000,
                    multiplierByPhase: [2, 3],
                },
            },
        };
        expect(() => parseGameConfig(bad, validSettingsData))
            .toThrowError(/multiplierByPhase/);
    });
});
