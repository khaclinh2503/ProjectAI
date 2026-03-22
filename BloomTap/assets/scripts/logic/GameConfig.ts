// GameConfig.ts — NO 'cc' import, pure TypeScript only
import { FlowerTypeId, FlowerTypeConfig } from './FlowerTypes';
import { SpawnPhaseConfig } from './SpawnManager';

export interface PowerUpConfig {
    specialChance: number;
    scoreMultiplier: { durationMs: number; multiplierByPhase: [number, number, number] };
    timeFreeze: { durationMs: number };
    slowGrowth: { durationMs: number; factor: number };
}

export interface GameConfig {
    flowers: Record<FlowerTypeId, FlowerTypeConfig>;
    spawnPhases: SpawnPhaseConfig[];
    settings: {
        session: { durationMs: number };
        scoring: { wrongTapPenalty: number };
    };
    powerUps?: PowerUpConfig;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/** Asserts value at obj[key] is a number, not NaN, and > 0. Throws descriptive Error otherwise. */
function requirePositiveNumber(obj: Record<string, unknown>, key: string, context: string): number {
    const val = obj[key];
    if (typeof val !== 'number' || isNaN(val)) {
        throw new Error(`[GameConfig] ${context}.${key} must be a number, got ${String(val)}`);
    }
    if (val <= 0) {
        throw new Error(`[GameConfig] ${context}.${key} must be > 0, got ${val}`);
    }
    return val;
}

/** Asserts value at obj[key] is a number, not NaN, and >= 0. Throws descriptive Error otherwise. */
function requireNonNegativeNumber(obj: Record<string, unknown>, key: string, context: string): number {
    const val = obj[key];
    if (typeof val !== 'number' || isNaN(val)) {
        throw new Error(`[GameConfig] ${context}.${key} must be a number, got ${String(val)}`);
    }
    if (val < 0) {
        throw new Error(`[GameConfig] ${context}.${key} must be >= 0, got ${val}`);
    }
    return val;
}

// ---------------------------------------------------------------------------
// Parse helpers
// ---------------------------------------------------------------------------

function isRecord(val: unknown): val is Record<string, unknown> {
    return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function parseFlowers(flowersData: unknown): Record<FlowerTypeId, FlowerTypeConfig> {
    if (!isRecord(flowersData)) {
        throw new Error('[GameConfig] flowersData must be a non-null object');
    }

    if (!('flowers' in flowersData)) {
        throw new Error('[GameConfig] flowersData must have a "flowers" key');
    }

    const flowersMap = flowersData['flowers'];
    if (!isRecord(flowersMap)) {
        throw new Error('[GameConfig] flowersData.flowers must be a non-null object');
    }

    const result = {} as Record<FlowerTypeId, FlowerTypeConfig>;

    const allTypeIds = Object.values(FlowerTypeId) as FlowerTypeId[];
    for (const typeId of allTypeIds) {
        const raw = flowersMap[typeId];
        if (!isRecord(raw)) {
            throw new Error(`[GameConfig] flowersData.flowers.${typeId} is missing or not an object`);
        }
        const ctx = `flowers.${typeId}`;
        const cycleDurationMs = requirePositiveNumber(raw, 'cycleDurationMs', ctx);
        const budMs = requirePositiveNumber(raw, 'budMs', ctx);
        const tapWindowMs = requirePositiveNumber(raw, 'tapWindowMs', ctx);
        const bloomingMs = requirePositiveNumber(raw, 'bloomingMs', ctx);
        const fullBloomMs = requirePositiveNumber(raw, 'fullBloomMs', ctx);
        const wiltingMs = requirePositiveNumber(raw, 'wiltingMs', ctx);
        const deadMs = requirePositiveNumber(raw, 'deadMs', ctx);
        const scoreBloom = requirePositiveNumber(raw, 'scoreBloom', ctx);
        const scoreFull = requirePositiveNumber(raw, 'scoreFull', ctx);

        result[typeId] = {
            id: typeId,
            cycleDurationMs,
            budMs,
            tapWindowMs,
            bloomingMs,
            fullBloomMs,
            wiltingMs,
            deadMs,
            scoreBloom,
            scoreFull,
        };
    }

    return result;
}

function parseSpawnPhases(flowersData: unknown): SpawnPhaseConfig[] {
    if (!isRecord(flowersData)) {
        throw new Error('[GameConfig] flowersData must be a non-null object');
    }

    if (!('spawnPhases' in flowersData)) {
        throw new Error('[GameConfig] flowersData must have a "spawnPhases" key');
    }

    const phasesRaw = flowersData['spawnPhases'];
    if (!Array.isArray(phasesRaw)) {
        throw new Error('[GameConfig] flowersData.spawnPhases must be an array');
    }

    return phasesRaw.map((phase: unknown, index: number) => {
        if (!isRecord(phase)) {
            throw new Error(`[GameConfig] spawnPhases[${index}] must be an object`);
        }
        const ctx = `spawnPhases[${index}]`;
        const startMs = requireNonNegativeNumber(phase, 'startMs', ctx);
        const endMs = requirePositiveNumber(phase, 'endMs', ctx);
        const intervalMs = requirePositiveNumber(phase, 'intervalMs', ctx);
        const maxAlive = requirePositiveNumber(phase, 'maxAlive', ctx);
        const spawnBatch = requirePositiveNumber(phase, 'spawnBatch', ctx);

        const weightsRaw = phase['weights'];
        if (!isRecord(weightsRaw)) {
            throw new Error(`[GameConfig] ${ctx}.weights must be a non-null object`);
        }

        const weights = {} as Record<FlowerTypeId, number>;
        for (const [key, val] of Object.entries(weightsRaw)) {
            const weightCtx = `${ctx}.weights`;
            if (typeof val !== 'number' || isNaN(val as number)) {
                throw new Error(`[GameConfig] ${weightCtx}.${key} must be a number, got ${String(val)}`);
            }
            if ((val as number) < 0) {
                throw new Error(`[GameConfig] ${weightCtx}.${key} must be >= 0, got ${val}`);
            }
            weights[key as FlowerTypeId] = val as number;
        }

        const initialCount = index === 0
            ? requirePositiveNumber(phase, 'initialCount', ctx)
            : undefined;

        return { startMs, endMs, intervalMs, maxAlive, spawnBatch, weights, ...(initialCount !== undefined ? { initialCount } : {}) };
    });
}

function parseSettings(settingsData: unknown): GameConfig['settings'] {
    if (!isRecord(settingsData)) {
        throw new Error('[GameConfig] settingsData must be a non-null object');
    }

    const sessionRaw = settingsData['session'];
    if (!isRecord(sessionRaw)) {
        throw new Error('[GameConfig] settingsData.session must be a non-null object');
    }

    const scoringRaw = settingsData['scoring'];
    if (!isRecord(scoringRaw)) {
        throw new Error('[GameConfig] settingsData.scoring must be a non-null object');
    }

    const durationMs = requirePositiveNumber(sessionRaw, 'durationMs', 'settings.session');
    const wrongTapPenalty = requireNonNegativeNumber(scoringRaw, 'wrongTapPenalty', 'settings.scoring');

    return {
        session: { durationMs },
        scoring: { wrongTapPenalty },
    };
}

function parsePowerUps(flowersData: unknown): PowerUpConfig | undefined {
    if (!isRecord(flowersData) || !('powerUps' in flowersData)) return undefined;
    const pu = (flowersData as Record<string, unknown>)['powerUps'];
    if (!isRecord(pu)) throw new Error('[GameConfig] powerUps must be a non-null object');
    const puRec = pu as Record<string, unknown>;
    const specialChance = requirePositiveNumber(puRec, 'specialChance', 'powerUps');
    // validate scoreMultiplier sub-object
    const sm = puRec['scoreMultiplier'];
    if (!isRecord(sm)) throw new Error('[GameConfig] powerUps.scoreMultiplier must be an object');
    const smRec = sm as Record<string, unknown>;
    const smDuration = requirePositiveNumber(smRec, 'durationMs', 'powerUps.scoreMultiplier');
    const mbp = smRec['multiplierByPhase'];
    if (!Array.isArray(mbp) || mbp.length !== 3 || !mbp.every((v: unknown) => typeof v === 'number' && v > 0)) {
        throw new Error('[GameConfig] powerUps.scoreMultiplier.multiplierByPhase must be [number, number, number] > 0');
    }
    // validate timeFreeze sub-object
    const tf = puRec['timeFreeze'];
    if (!isRecord(tf)) throw new Error('[GameConfig] powerUps.timeFreeze must be an object');
    const tfDuration = requirePositiveNumber(tf as Record<string, unknown>, 'durationMs', 'powerUps.timeFreeze');
    // validate slowGrowth sub-object
    const sg = puRec['slowGrowth'];
    if (!isRecord(sg)) throw new Error('[GameConfig] powerUps.slowGrowth must be an object');
    const sgRec = sg as Record<string, unknown>;
    const sgDuration = requirePositiveNumber(sgRec, 'durationMs', 'powerUps.slowGrowth');
    const sgFactor = requirePositiveNumber(sgRec, 'factor', 'powerUps.slowGrowth');
    return {
        specialChance,
        scoreMultiplier: { durationMs: smDuration, multiplierByPhase: mbp as [number, number, number] },
        timeFreeze: { durationMs: tfDuration },
        slowGrowth: { durationMs: sgDuration, factor: sgFactor },
    };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses and validates raw JSON data from flowers.json and settings.json.
 *
 * Both arguments accept `unknown` (not strings) — Cocos's JsonAsset.json
 * already returns parsed objects, so no JSON.parse round-trip is needed.
 *
 * @throws {Error} with a descriptive message on any validation failure.
 */
export function parseGameConfig(flowersData: unknown, settingsData: unknown): GameConfig {
    const flowers = parseFlowers(flowersData);
    const spawnPhases = parseSpawnPhases(flowersData);
    const settings = parseSettings(settingsData);
    const powerUps = parsePowerUps(flowersData);

    return { flowers, spawnPhases, settings, powerUps };
}
