import { describe, it, expect } from 'vitest';
import { SpawnManager } from './SpawnManager';
import { FlowerTypeId } from './FlowerTypes';

describe('SpawnManager', () => {
    const manager = new SpawnManager();

    // All valid FlowerTypeId values for validation
    const validFlowerTypeIds = new Set<string>(Object.values(FlowerTypeId));

    describe('getPhaseConfig', () => {
        describe('Phase 1 (0ms - 39999ms)', () => {
            it('getPhaseConfig(0): intervalMs === 3000', () => {
                expect(manager.getPhaseConfig(0).intervalMs).toBe(3000);
            });

            it('getPhaseConfig(0): maxAlive === 8', () => {
                expect(manager.getPhaseConfig(0).maxAlive).toBe(8);
            });

            it('getPhaseConfig(20000): intervalMs === 3000 (still Phase 1)', () => {
                expect(manager.getPhaseConfig(20000).intervalMs).toBe(3000);
            });

            it('getPhaseConfig(39999): intervalMs === 3000 (last ms of Phase 1)', () => {
                expect(manager.getPhaseConfig(39999).intervalMs).toBe(3000);
            });
        });

        describe('Phase 2 (40000ms - 79999ms)', () => {
            it('getPhaseConfig(40000): intervalMs === 2000 (Phase 2 starts)', () => {
                expect(manager.getPhaseConfig(40000).intervalMs).toBe(2000);
            });

            it('getPhaseConfig(40000): maxAlive === 16', () => {
                expect(manager.getPhaseConfig(40000).maxAlive).toBe(16);
            });

            it('getPhaseConfig(60000): intervalMs === 2000 (mid Phase 2)', () => {
                expect(manager.getPhaseConfig(60000).intervalMs).toBe(2000);
            });
        });

        describe('Phase 3 (80000ms - 119999ms)', () => {
            it('getPhaseConfig(80000): intervalMs === 1000 (Phase 3 starts)', () => {
                expect(manager.getPhaseConfig(80000).intervalMs).toBe(1000);
            });

            it('getPhaseConfig(80000): maxAlive === 28', () => {
                expect(manager.getPhaseConfig(80000).maxAlive).toBe(28);
            });

            it('getPhaseConfig(119999): intervalMs === 1000 (last ms of Phase 3)', () => {
                expect(manager.getPhaseConfig(119999).intervalMs).toBe(1000);
            });
        });

        describe('Boundary at 120000ms (session end)', () => {
            it('getPhaseConfig(120000): does not throw — returns last config (Phase 3)', () => {
                expect(() => manager.getPhaseConfig(120000)).not.toThrow();
            });

            it('getPhaseConfig(120000): returns Phase 3 config (intervalMs === 1000)', () => {
                expect(manager.getPhaseConfig(120000).intervalMs).toBe(1000);
            });
        });
    });

    describe('pickFlowerType', () => {
        it('pickFlowerType(0) returns a valid FlowerTypeId', () => {
            const result = manager.pickFlowerType(0);
            expect(validFlowerTypeIds.has(result)).toBe(true);
        });

        it('pickFlowerType(40000) returns a valid FlowerTypeId', () => {
            const result = manager.pickFlowerType(40000);
            expect(validFlowerTypeIds.has(result)).toBe(true);
        });

        it('pickFlowerType(80000) returns a valid FlowerTypeId', () => {
            const result = manager.pickFlowerType(80000);
            expect(validFlowerTypeIds.has(result)).toBe(true);
        });

        it('pickFlowerType always returns valid FlowerTypeId across many calls', () => {
            // Run 100 picks across all 3 phases to ensure no invalid value is ever returned
            for (let i = 0; i < 34; i++) {
                expect(validFlowerTypeIds.has(manager.pickFlowerType(0))).toBe(true);
                expect(validFlowerTypeIds.has(manager.pickFlowerType(40000))).toBe(true);
                expect(validFlowerTypeIds.has(manager.pickFlowerType(80000))).toBe(true);
            }
        });
    });

    describe('Phase weight tables', () => {
        it('Phase 1 weights sum to 100', () => {
            const config = manager.getPhaseConfig(0);
            const total = Object.values(config.weights).reduce((sum, w) => sum + w, 0);
            expect(total).toBe(100);
        });

        it('Phase 2 weights sum to 100', () => {
            const config = manager.getPhaseConfig(40000);
            const total = Object.values(config.weights).reduce((sum, w) => sum + w, 0);
            expect(total).toBe(100);
        });

        it('Phase 3 weights sum to 100', () => {
            const config = manager.getPhaseConfig(80000);
            const total = Object.values(config.weights).reduce((sum, w) => sum + w, 0);
            expect(total).toBe(100);
        });

        it('Phase 1 has SUNFLOWER=35, ROSE=30, CHRYSANTHEMUM=20, LOTUS=10, CHERRY=5', () => {
            const w = manager.getPhaseConfig(0).weights;
            expect(w[FlowerTypeId.SUNFLOWER]).toBe(35);
            expect(w[FlowerTypeId.ROSE]).toBe(30);
            expect(w[FlowerTypeId.CHRYSANTHEMUM]).toBe(20);
            expect(w[FlowerTypeId.LOTUS]).toBe(10);
            expect(w[FlowerTypeId.CHERRY]).toBe(5);
        });

        it('Phase 2 has SUNFLOWER=15, ROSE=20, CHRYSANTHEMUM=30, LOTUS=20, CHERRY=15', () => {
            const w = manager.getPhaseConfig(40000).weights;
            expect(w[FlowerTypeId.SUNFLOWER]).toBe(15);
            expect(w[FlowerTypeId.ROSE]).toBe(20);
            expect(w[FlowerTypeId.CHRYSANTHEMUM]).toBe(30);
            expect(w[FlowerTypeId.LOTUS]).toBe(20);
            expect(w[FlowerTypeId.CHERRY]).toBe(15);
        });

        it('Phase 3 has SUNFLOWER=5, ROSE=10, CHRYSANTHEMUM=20, LOTUS=30, CHERRY=35', () => {
            const w = manager.getPhaseConfig(80000).weights;
            expect(w[FlowerTypeId.SUNFLOWER]).toBe(5);
            expect(w[FlowerTypeId.ROSE]).toBe(10);
            expect(w[FlowerTypeId.CHRYSANTHEMUM]).toBe(20);
            expect(w[FlowerTypeId.LOTUS]).toBe(30);
            expect(w[FlowerTypeId.CHERRY]).toBe(35);
        });
    });
});
