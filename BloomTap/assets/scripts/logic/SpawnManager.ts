/**
 * SpawnManager — pure TypeScript, no 'cc' imports.
 *
 * Provides phase-table-driven spawn configuration and weighted random flower type selection.
 * Phase boundaries: Phase 1 (0-39999ms), Phase 2 (40000-79999ms), Phase 3 (80000-119999ms).
 * At or beyond 120000ms, returns Phase 3 config as a defensive fallback.
 */
import { FlowerTypeId } from './FlowerTypes';

export interface SpawnPhaseConfig {
    startMs: number;
    endMs: number;
    intervalMs: number;
    maxAlive: number;
    spawnBatch: number;
    weights: Record<FlowerTypeId, number>;
}

let PHASE_CONFIGS: SpawnPhaseConfig[] = [
    {
        startMs: 0,
        endMs: 40000,
        intervalMs: 3000,
        maxAlive: 8,
        spawnBatch: 3,
        weights: {
            [FlowerTypeId.SUNFLOWER]: 35,
            [FlowerTypeId.ROSE]: 30,
            [FlowerTypeId.CHRYSANTHEMUM]: 20,
            [FlowerTypeId.LOTUS]: 10,
            [FlowerTypeId.CHERRY]: 5,
        },
    },
    {
        startMs: 40000,
        endMs: 80000,
        intervalMs: 2000,
        maxAlive: 16,
        spawnBatch: 4,
        weights: {
            [FlowerTypeId.SUNFLOWER]: 15,
            [FlowerTypeId.ROSE]: 20,
            [FlowerTypeId.CHRYSANTHEMUM]: 30,
            [FlowerTypeId.LOTUS]: 20,
            [FlowerTypeId.CHERRY]: 15,
        },
    },
    {
        startMs: 80000,
        endMs: 120000,
        intervalMs: 1000,
        maxAlive: 28,
        spawnBatch: 5,
        weights: {
            [FlowerTypeId.SUNFLOWER]: 5,
            [FlowerTypeId.ROSE]: 10,
            [FlowerTypeId.CHRYSANTHEMUM]: 20,
            [FlowerTypeId.LOTUS]: 30,
            [FlowerTypeId.CHERRY]: 35,
        },
    },
];

/**
 * Overrides PHASE_CONFIGS with runtime values from JSON config.
 * SpawnManager methods reference PHASE_CONFIGS by closure and will use the new data.
 * When not called (e.g. in tests), hardcoded defaults remain.
 */
export function initPhaseConfigs(configs: SpawnPhaseConfig[]): void {
    PHASE_CONFIGS = configs;
}

export class SpawnManager {
    /**
     * Returns the spawn phase configuration for the given elapsed time.
     * If elapsedMs >= 120000 (session end), returns Phase 3 config as defensive fallback.
     * @param elapsedMs - Milliseconds elapsed since session start
     */
    getPhaseConfig(elapsedMs: number): SpawnPhaseConfig {
        for (const config of PHASE_CONFIGS) {
            if (elapsedMs >= config.startMs && elapsedMs < config.endMs) {
                return config;
            }
        }
        // Defensive fallback: at or beyond 120000ms — return last phase config
        return PHASE_CONFIGS[PHASE_CONFIGS.length - 1];
    }

    /**
     * Returns a weighted random FlowerTypeId for the given elapsed time.
     * Uses the weight table from the active phase config.
     * @param elapsedMs - Milliseconds elapsed since session start
     */
    pickFlowerType(elapsedMs: number): FlowerTypeId {
        const config = this.getPhaseConfig(elapsedMs);
        const entries = Object.entries(config.weights) as [FlowerTypeId, number][];

        // Calculate total weight
        let total = 0;
        for (const [, weight] of entries) {
            total += weight;
        }

        // Draw a random value in [0, total)
        let rand = Math.random() * total;

        // Decrement rand by each weight; return first FlowerTypeId where rand <= 0
        for (const [typeId, weight] of entries) {
            rand -= weight;
            if (rand <= 0) {
                return typeId;
            }
        }

        // Failsafe: return last entry (should not be reached in practice)
        return entries[entries.length - 1][0];
    }
}
