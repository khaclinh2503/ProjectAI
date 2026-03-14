/**
 * TapHandler.test.ts
 *
 * Tests the tap method behavior contracts that will be implemented in
 * GameController.handleCorrectTap() and GameController.handleWrongTap().
 *
 * These tests validate the pure logic interaction between FlowerFSM, GameState,
 * and ComboSystem — the three classes that tap methods orchestrate.
 *
 * GameController itself cannot be instantiated in Vitest (Cocos Component),
 * so we test the logic tier that the methods delegate to.
 */
import { describe, it, expect } from 'vitest';
import { FlowerFSM } from './FlowerFSM';
import { GameState, WRONG_TAP_PENALTY } from './GameState';
import { ComboSystem } from './ComboSystem';
import { FlowerState } from './FlowerState';
import { FLOWER_CONFIGS, FlowerTypeId } from './FlowerTypes';

// Helper: create a CHERRY flower at given offset from spawn (puts it in known state)
function makeFlower(spawnTimestamp: number): FlowerFSM {
    return new FlowerFSM(spawnTimestamp, FLOWER_CONFIGS[FlowerTypeId.CHERRY]);
}

// Cherry config: budMs=1350, tapWindowMs=900, scoreBloom=80, scoreFull=120
const CHERRY = FLOWER_CONFIGS[FlowerTypeId.CHERRY];
const budMs = CHERRY.budMs;                          // 1350
const tapWindowMs = CHERRY.tapWindowMs;              // 900
const scoreBloom = CHERRY.scoreBloom;                // 80
const scoreFull = CHERRY.scoreFull;                  // 120

describe('handleCorrectTap behavior (via FlowerFSM + GameState)', () => {
    describe('CRITICAL: getState and getScore must be called BEFORE collect()', () => {
        it('getScore returns null after collect() — confirms ordering requirement', () => {
            const flower = makeFlower(0);
            const nowMs = budMs + 100; // in BLOOMING window

            const scoreBeforeCollect = flower.getScore(nowMs);
            expect(scoreBeforeCollect).not.toBeNull();

            flower.collect();

            const scoreAfterCollect = flower.getScore(nowMs);
            expect(scoreAfterCollect).toBeNull();
        });

        it('getState returns COLLECTED after collect() — confirms ordering requirement', () => {
            const flower = makeFlower(0);
            const nowMs = budMs + 100; // in BLOOMING window

            const stateBeforeCollect = flower.getState(nowMs);
            expect(stateBeforeCollect).toBe(FlowerState.BLOOMING);

            flower.collect();

            const stateAfterCollect = flower.getState(nowMs);
            expect(stateAfterCollect).toBe(FlowerState.COLLECTED);
        });
    });

    describe('BLOOMING tap → CORRECT_FLASH_YELLOW logic', () => {
        it('state is BLOOMING at start of tap window (t=0)', () => {
            const flower = makeFlower(0);
            const nowMs = budMs; // exactly at tap window start
            expect(flower.getState(nowMs)).toBe(FlowerState.BLOOMING);
        });

        it('BLOOMING tap: score increases by rawScore * multiplier (rounded)', () => {
            const flower = makeFlower(0);
            const gameState = new GameState();
            const combo = new ComboSystem();
            const nowMs = budMs + 100; // BLOOMING

            const rawScore = flower.getScore(nowMs) ?? 0;
            flower.collect();
            gameState.applyCorrectTap(rawScore, combo);

            expect(gameState.score).toBeGreaterThanOrEqual(scoreBloom);
            expect(gameState.score).toBeLessThanOrEqual(scoreFull);
        });
    });

    describe('FULL_BLOOM tap → CORRECT_FLASH_WHITE logic', () => {
        it('state is FULL_BLOOM at bloomingMs boundary', () => {
            const flower = makeFlower(0);
            const nowMs = budMs + CHERRY.bloomingMs; // at FULL_BLOOM transition
            expect(flower.getState(nowMs)).toBe(FlowerState.FULL_BLOOM);
        });

        it('FULL_BLOOM rawScore > BLOOMING rawScore (same flower type)', () => {
            const flowerBloom = makeFlower(0);
            const flowerFull = makeFlower(0);

            const bloomScore = flowerBloom.getScore(budMs) ?? 0;         // t=0, at scoreBloom
            const fullScore  = flowerFull.getScore(budMs + tapWindowMs) ?? 0; // t=tapWindowMs, at scoreFull

            expect(fullScore).toBeGreaterThan(bloomScore);
        });

        it('FULL_BLOOM tap: score increases more than BLOOMING tap', () => {
            const stateBloom = new GameState();
            const comboBloom = new ComboSystem();
            const flowerBloom = makeFlower(0);
            const bloomRawScore = flowerBloom.getScore(budMs) ?? 0;
            flowerBloom.collect();
            stateBloom.applyCorrectTap(bloomRawScore, comboBloom);

            const stateFull = new GameState();
            const comboFull = new ComboSystem();
            const flowerFull = makeFlower(0);
            const fullRawScore = flowerFull.getScore(budMs + tapWindowMs) ?? 0;
            flowerFull.collect();
            stateFull.applyCorrectTap(fullRawScore, comboFull);

            expect(stateFull.score).toBeGreaterThan(stateBloom.score);
        });
    });

    describe('flash color selection (state → color mapping)', () => {
        it('BLOOMING state maps to YELLOW flash (not WHITE)', () => {
            const flower = makeFlower(0);
            const nowMs = budMs + 100; // BLOOMING
            const state = flower.getState(nowMs);

            // handleCorrectTap returns CORRECT_FLASH_WHITE for FULL_BLOOM, else YELLOW
            const isFullBloom = state === FlowerState.FULL_BLOOM;
            expect(isFullBloom).toBe(false); // BLOOMING → YELLOW flash
        });

        it('FULL_BLOOM state maps to WHITE flash', () => {
            const flower = makeFlower(0);
            const nowMs = budMs + CHERRY.bloomingMs + 1; // FULL_BLOOM
            const state = flower.getState(nowMs);

            const isFullBloom = state === FlowerState.FULL_BLOOM;
            expect(isFullBloom).toBe(true); // FULL_BLOOM → WHITE flash
        });
    });

    describe('null rawScore edge case (tap at exact boundary)', () => {
        it('getScore returns null outside tap window — nullish coalesce gives 0', () => {
            const flower = makeFlower(0);
            const nowMs = budMs + tapWindowMs + 1; // WILTING, outside tap window
            const rawScore = flower.getScore(nowMs) ?? 0;
            expect(rawScore).toBe(0);
        });

        it('applyCorrectTap with rawScore=0 does not crash and adds 0 to score', () => {
            const gameState = new GameState();
            const combo = new ComboSystem();
            gameState.applyCorrectTap(0, combo);
            expect(gameState.score).toBe(0);
            // Combo still advances even on 0-score tap
            expect(combo.multiplier).toBeGreaterThan(1);
        });
    });
});

describe('handleWrongTap behavior (via GameState + ComboSystem)', () => {
    it('wrong tap: score decreases by WRONG_TAP_PENALTY (10)', () => {
        const gameState = new GameState();
        const combo = new ComboSystem();
        gameState.applyWrongTap(combo);
        expect(gameState.score).toBe(-WRONG_TAP_PENALTY);
    });

    it('wrong tap: combo resets to multiplier=1 regardless of streak', () => {
        const gameState = new GameState();
        const combo = new ComboSystem();
        // Build a streak first
        gameState.applyCorrectTap(80, combo); // multiplier → 1.5
        gameState.applyCorrectTap(80, combo); // multiplier → 2.0
        expect(combo.multiplier).toBeGreaterThan(1);

        // Wrong tap resets
        gameState.applyWrongTap(combo);
        expect(combo.multiplier).toBe(1);
    });

    it('wrong tap: score can go below 0 (no floor applied)', () => {
        const gameState = new GameState();
        const combo = new ComboSystem();
        gameState.applyWrongTap(combo);
        gameState.applyWrongTap(combo);
        expect(gameState.score).toBe(-2 * WRONG_TAP_PENALTY);
    });

    it('tapping BUD state: not BLOOMING or FULL_BLOOM → wrong tap branch', () => {
        const flower = makeFlower(0);
        const nowMs = 500; // before budMs=1350, so in BUD state
        const state = flower.getState(nowMs);
        expect(state).toBe(FlowerState.BUD);

        // BUD/WILTING/DEAD all branch to handleWrongTap
        const isCorrectTap = state === FlowerState.BLOOMING || state === FlowerState.FULL_BLOOM;
        expect(isCorrectTap).toBe(false);
    });

    it('tapping WILTING state: not BLOOMING or FULL_BLOOM → wrong tap branch', () => {
        const flower = makeFlower(0);
        const nowMs = budMs + tapWindowMs + 100; // WILTING
        const state = flower.getState(nowMs);
        expect(state).toBe(FlowerState.WILTING);

        const isCorrectTap = state === FlowerState.BLOOMING || state === FlowerState.FULL_BLOOM;
        expect(isCorrectTap).toBe(false);
    });

    it('tapping DEAD state: not BLOOMING or FULL_BLOOM → wrong tap branch', () => {
        const flower = makeFlower(0);
        const wiltEnd = budMs + tapWindowMs + CHERRY.wiltingMs;
        const nowMs = wiltEnd + 100; // DEAD
        const state = flower.getState(nowMs);
        expect(state).toBe(FlowerState.DEAD);

        const isCorrectTap = state === FlowerState.BLOOMING || state === FlowerState.FULL_BLOOM;
        expect(isCorrectTap).toBe(false);
    });
});
