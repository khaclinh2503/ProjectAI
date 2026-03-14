export enum FlowerTypeId {
    CHERRY = 'CHERRY',
    LOTUS = 'LOTUS',
    CHRYSANTHEMUM = 'CHRYSANTHEMUM',
    ROSE = 'ROSE',
    SUNFLOWER = 'SUNFLOWER',
}

export interface FlowerTypeConfig {
    id: FlowerTypeId;
    /** Total duration of the full flower lifecycle in ms */
    cycleDurationMs: number;
    /** Duration of the BUD state: cycleDurationMs - tapWindowMs - wiltingMs - deadMs */
    budMs: number;
    /** Total tap window duration (BLOOMING + FULL_BLOOM) */
    tapWindowMs: number;
    /** Duration of BLOOMING phase (first 2/3 of tap window) */
    bloomingMs: number;
    /** Duration of FULL_BLOOM phase (last 1/3 of tap window) */
    fullBloomMs: number;
    /** Duration of WILTING state */
    wiltingMs: number;
    /** Duration of DEAD state */
    deadMs: number;
    /** Score at the start of the tap window (beginning of BLOOMING) */
    scoreBloom: number;
    /** Score at the end of the tap window (end of FULL_BLOOM) */
    scoreFull: number;
}

/**
 * Locked flower type configurations.
 * All values are integer milliseconds.
 *
 * SUNFLOWER: bloomingMs=4670, fullBloomMs=2330 (sum=7000 exact).
 * Raw 2/3 split would be 4666.67+2333.33 — rounded to nearest integer
 * while preserving exact tap window sum of 7000ms.
 *
 * budMs derivation: cycleDurationMs - tapWindowMs - wiltingMs - deadMs
 */
export const FLOWER_CONFIGS: Record<FlowerTypeId, FlowerTypeConfig> = {
    [FlowerTypeId.CHERRY]: {
        id: FlowerTypeId.CHERRY,
        cycleDurationMs: 3000,
        budMs: 1350,       // 3000 - 900 - 450 - 300
        tapWindowMs: 900,
        bloomingMs: 600,
        fullBloomMs: 300,
        wiltingMs: 450,
        deadMs: 300,
        scoreBloom: 80,
        scoreFull: 120,
    },
    [FlowerTypeId.LOTUS]: {
        id: FlowerTypeId.LOTUS,
        cycleDurationMs: 4500,
        budMs: 1710,       // 4500 - 1800 - 630 - 360
        tapWindowMs: 1800,
        bloomingMs: 1200,
        fullBloomMs: 600,
        wiltingMs: 630,
        deadMs: 360,
        scoreBloom: 60,
        scoreFull: 90,
    },
    [FlowerTypeId.CHRYSANTHEMUM]: {
        id: FlowerTypeId.CHRYSANTHEMUM,
        cycleDurationMs: 6000,
        budMs: 1800,       // 6000 - 3000 - 780 - 420
        tapWindowMs: 3000,
        bloomingMs: 2000,
        fullBloomMs: 1000,
        wiltingMs: 780,
        deadMs: 420,
        scoreBloom: 40,
        scoreFull: 60,
    },
    [FlowerTypeId.ROSE]: {
        id: FlowerTypeId.ROSE,
        cycleDurationMs: 8000,
        budMs: 1840,       // 8000 - 4800 - 880 - 480
        tapWindowMs: 4800,
        bloomingMs: 3200,
        fullBloomMs: 1600,
        wiltingMs: 880,
        deadMs: 480,
        scoreBloom: 25,
        scoreFull: 40,
    },
    [FlowerTypeId.SUNFLOWER]: {
        id: FlowerTypeId.SUNFLOWER,
        cycleDurationMs: 10000,
        budMs: 1700,       // 10000 - 7000 - 800 - 500
        tapWindowMs: 7000,
        bloomingMs: 4670,  // rounded from 4666.67 to keep sum exact
        fullBloomMs: 2330, // rounded from 2333.33 to keep sum exact (4670+2330=7000)
        wiltingMs: 800,
        deadMs: 500,
        scoreBloom: 15,
        scoreFull: 25,
    },
};
