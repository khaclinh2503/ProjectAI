import { describe, it, expect } from 'vitest';
import { FlowerTypeId, FLOWER_CONFIGS } from './FlowerTypes';

describe('FlowerTypeId', () => {
    it('has all 5 flower type IDs', () => {
        expect(FlowerTypeId.CHERRY).toBeDefined();
        expect(FlowerTypeId.LOTUS).toBeDefined();
        expect(FlowerTypeId.CHRYSANTHEMUM).toBeDefined();
        expect(FlowerTypeId.ROSE).toBeDefined();
        expect(FlowerTypeId.SUNFLOWER).toBeDefined();
    });
});

describe('FLOWER_CONFIGS', () => {
    it('CHERRY has correct cycle duration', () => {
        expect(FLOWER_CONFIGS[FlowerTypeId.CHERRY].cycleDurationMs).toBe(3000);
    });

    it('CHERRY.budMs === 1350', () => {
        expect(FLOWER_CONFIGS[FlowerTypeId.CHERRY].budMs).toBe(1350);
    });

    it('CHERRY.scoreBloom === 80', () => {
        expect(FLOWER_CONFIGS[FlowerTypeId.CHERRY].scoreBloom).toBe(80);
    });

    it('CHERRY.scoreFull === 120', () => {
        expect(FLOWER_CONFIGS[FlowerTypeId.CHERRY].scoreFull).toBe(120);
    });

    it('SUNFLOWER.bloomingMs === 4670', () => {
        expect(FLOWER_CONFIGS[FlowerTypeId.SUNFLOWER].bloomingMs).toBe(4670);
    });

    it('SUNFLOWER.fullBloomMs === 2330', () => {
        expect(FLOWER_CONFIGS[FlowerTypeId.SUNFLOWER].fullBloomMs).toBe(2330);
    });

    it('SUNFLOWER blooming + fullBloom sum = 7000', () => {
        const cfg = FLOWER_CONFIGS[FlowerTypeId.SUNFLOWER];
        expect(cfg.bloomingMs + cfg.fullBloomMs).toBe(7000);
    });

    it('all 5 configs: budMs + tapWindowMs + wiltingMs + deadMs === cycleDurationMs', () => {
        for (const id of Object.values(FlowerTypeId)) {
            const cfg = FLOWER_CONFIGS[id];
            const sum = cfg.budMs + cfg.tapWindowMs + cfg.wiltingMs + cfg.deadMs;
            expect(sum, `${id}: ${cfg.budMs} + ${cfg.tapWindowMs} + ${cfg.wiltingMs} + ${cfg.deadMs} = ${sum}`).toBe(cfg.cycleDurationMs);
        }
    });

    it('FLOWER_CONFIGS has exactly 5 entries', () => {
        expect(Object.keys(FLOWER_CONFIGS).length).toBe(5);
    });
});
