// PowerUpState.ts — NO 'cc' import, pure TypeScript only
import { FlowerTypeConfig } from './FlowerTypes';

export type SpecialEffectType = 'SCORE_MULTIPLIER' | 'TIME_FREEZE' | 'SLOW_GROWTH';

export class PowerUpState {
    private _scoreMultiplierExpiryMs: number = 0;
    private _timeFreezeExpiryMs: number = 0;
    private _slowGrowthExpiryMs: number = 0;
    private _lastSpecialSpawnMs: number = 0;
    private _scoreMultiplierValue: number = 1;

    activate(_effect: SpecialEffectType, _nowMs: number, _durationMs: number, _multiplierValue?: number): void {
        throw new Error('not implemented');
    }

    isActive(_effect: SpecialEffectType, _nowMs: number): boolean {
        throw new Error('not implemented');
    }

    getActiveCount(_nowMs: number): number {
        throw new Error('not implemented');
    }

    getScoreMultiplier(): number {
        throw new Error('not implemented');
    }

    getRemaining(_effect: SpecialEffectType, _nowMs: number): number {
        throw new Error('not implemented');
    }

    shiftExpiries(_deltaMs: number): void {
        throw new Error('not implemented');
    }

    needsPitySpawn(_nowMs: number, _pityWindowMs: number): boolean {
        throw new Error('not implemented');
    }

    recordSpecialSpawn(_nowMs: number): void {
        throw new Error('not implemented');
    }

    reset(_sessionStartMs: number): void {
        throw new Error('not implemented');
    }
}

export function applySlowGrowthConfig(_base: FlowerTypeConfig, _factor: number): FlowerTypeConfig {
    throw new Error('not implemented');
}
