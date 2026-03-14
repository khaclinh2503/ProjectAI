import { describe, it, expect } from 'vitest';
import { FlowerFSM } from './FlowerFSM';
import { FlowerState } from './FlowerState';
import { FlowerTypeId, FLOWER_CONFIGS } from './FlowerTypes';

const cherryConfig = FLOWER_CONFIGS[FlowerTypeId.CHERRY];
// CHERRY: budMs=1350, tapWindowMs=900 (bloomingMs=600, fullBloomMs=300), wiltingMs=450, deadMs=300
// With spawnTimestamp=0:
//   BUD: 0 to 1349ms
//   BLOOMING: 1350 to 1349+600=1949ms
//   FULL_BLOOM: 1950 to 1350+900-1=2249ms
//   WILTING: 2250 to 2699ms
//   DEAD: 2700ms+

describe('FlowerFSM state transitions (CHERRY, spawnTimestamp=0)', () => {
    it('getState(999) === BUD (before tap window)', () => {
        const fsm = new FlowerFSM(0, cherryConfig);
        expect(fsm.getState(999)).toBe(FlowerState.BUD);
    });

    it('getState(1350) === BLOOMING (at budMs boundary)', () => {
        const fsm = new FlowerFSM(0, cherryConfig);
        expect(fsm.getState(1350)).toBe(FlowerState.BLOOMING);
    });

    it('getState(1350 + 600) === FULL_BLOOM (at bloomingMs boundary)', () => {
        const fsm = new FlowerFSM(0, cherryConfig);
        expect(fsm.getState(1350 + 600)).toBe(FlowerState.FULL_BLOOM);
    });

    it('getState(1350 + 900) === WILTING (after tap window)', () => {
        const fsm = new FlowerFSM(0, cherryConfig);
        expect(fsm.getState(1350 + 900)).toBe(FlowerState.WILTING);
    });

    it('getState(1350 + 900 + 450) === DEAD (after wilting)', () => {
        const fsm = new FlowerFSM(0, cherryConfig);
        expect(fsm.getState(1350 + 900 + 450)).toBe(FlowerState.DEAD);
    });

    it('After collect(): getState(any) === COLLECTED', () => {
        const fsm = new FlowerFSM(0, cherryConfig);
        fsm.collect();
        expect(fsm.getState(999)).toBe(FlowerState.COLLECTED);
        expect(fsm.getState(1350)).toBe(FlowerState.COLLECTED);
        expect(fsm.getState(5000)).toBe(FlowerState.COLLECTED);
    });
});

describe('FlowerFSM score calculation (CHERRY, spawnTimestamp=0)', () => {
    it('getScore(nowMs in BUD) === null', () => {
        const fsm = new FlowerFSM(0, cherryConfig);
        expect(fsm.getScore(999)).toBeNull();
    });

    it('getScore(1350) === 80 (scoreBloom at t=0 of tap window)', () => {
        const fsm = new FlowerFSM(0, cherryConfig);
        expect(fsm.getScore(1350)).toBe(80);
    });

    it('getScore(1350 + 900) is approximately 120 (scoreFull at end)', () => {
        const fsm = new FlowerFSM(0, cherryConfig);
        expect(fsm.getScore(1350 + 900)).toBeCloseTo(120, 0);
    });

    it('getScore returns value between scoreBloom and scoreFull during BLOOMING', () => {
        const fsm = new FlowerFSM(0, cherryConfig);
        const score = fsm.getScore(1350 + 300); // midpoint
        expect(score).not.toBeNull();
        expect(score!).toBeGreaterThanOrEqual(cherryConfig.scoreBloom);
        expect(score!).toBeLessThanOrEqual(cherryConfig.scoreFull);
    });

    it('getScore(nowMs in WILTING) === null', () => {
        const fsm = new FlowerFSM(0, cherryConfig);
        expect(fsm.getScore(1350 + 900 + 100)).toBeNull();
    });
});
