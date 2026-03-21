// PowerUpState.ts — NO 'cc' import, pure TypeScript only
import { FlowerTypeConfig } from './FlowerTypes';

export type SpecialEffectType = 'SCORE_MULTIPLIER' | 'TIME_FREEZE' | 'SLOW_GROWTH';

/**
 * Tracks 3 independent power-up effect expiry timestamps and answers
 * isActive/getRemaining/getScoreMultiplier queries. Designed for the
 * pure-logic tier (no cc imports).
 */
export class PowerUpState {
    private _scoreMultiplierExpiryMs: number = 0;
    private _timeFreezeExpiryMs: number = 0;
    private _slowGrowthExpiryMs: number = 0;
    private _lastSpecialSpawnMs: number = 0;
    private _scoreMultiplierValue: number = 1;

    /**
     * Activates a power-up effect for durationMs from nowMs.
     * Same-type reactivation resets the timer (D-09).
     * @param effect - Which effect to activate
     * @param nowMs - Current timestamp
     * @param durationMs - How long the effect lasts
     * @param multiplierValue - Only for SCORE_MULTIPLIER; defaults to 1
     */
    activate(effect: SpecialEffectType, nowMs: number, durationMs: number, multiplierValue: number = 1): void {
        const expiry = nowMs + durationMs;
        switch (effect) {
            case 'SCORE_MULTIPLIER':
                this._scoreMultiplierExpiryMs = expiry;
                this._scoreMultiplierValue = multiplierValue;
                break;
            case 'TIME_FREEZE':
                this._timeFreezeExpiryMs = expiry;
                break;
            case 'SLOW_GROWTH':
                this._slowGrowthExpiryMs = expiry;
                break;
        }
    }

    /**
     * Returns true when the given effect has not yet expired at nowMs.
     * (expiry > nowMs)
     */
    isActive(effect: SpecialEffectType, nowMs: number): boolean {
        switch (effect) {
            case 'SCORE_MULTIPLIER': return this._scoreMultiplierExpiryMs > nowMs;
            case 'TIME_FREEZE':      return this._timeFreezeExpiryMs > nowMs;
            case 'SLOW_GROWTH':      return this._slowGrowthExpiryMs > nowMs;
        }
    }

    /**
     * Returns how many of the 3 effects are currently active at nowMs.
     */
    getActiveCount(nowMs: number): number {
        let count = 0;
        if (this._scoreMultiplierExpiryMs > nowMs) count++;
        if (this._timeFreezeExpiryMs > nowMs) count++;
        if (this._slowGrowthExpiryMs > nowMs) count++;
        return count;
    }

    /**
     * Returns the stored score multiplier value.
     * Callers should check isActive(SCORE_MULTIPLIER, nowMs) first.
     * Returns 1 when SCORE_MULTIPLIER was never activated.
     */
    getScoreMultiplier(): number {
        return this._scoreMultiplierValue;
    }

    /**
     * Returns milliseconds remaining for the effect, or 0 if expired.
     */
    getRemaining(effect: SpecialEffectType, nowMs: number): number {
        switch (effect) {
            case 'SCORE_MULTIPLIER': return Math.max(0, this._scoreMultiplierExpiryMs - nowMs);
            case 'TIME_FREEZE':      return Math.max(0, this._timeFreezeExpiryMs - nowMs);
            case 'SLOW_GROWTH':      return Math.max(0, this._slowGrowthExpiryMs - nowMs);
        }
    }

    /**
     * Shifts all 3 expiry fields and lastSpecialSpawnMs forward by deltaMs.
     * Used by pause/resume so all derived effect states resume from the
     * same relative position after a pause gap.
     */
    shiftExpiries(deltaMs: number): void {
        this._scoreMultiplierExpiryMs += deltaMs;
        this._timeFreezeExpiryMs += deltaMs;
        this._slowGrowthExpiryMs += deltaMs;
        this._lastSpecialSpawnMs += deltaMs;
    }

    /**
     * Returns true when elapsed since last special spawn >= pityWindowMs.
     * Forces a special flower spawn if player hasn't seen one recently.
     */
    needsPitySpawn(nowMs: number, pityWindowMs: number): boolean {
        return (nowMs - this._lastSpecialSpawnMs) >= pityWindowMs;
    }

    /**
     * Records that a special flower was spawned at nowMs.
     * Resets the pity timer.
     */
    recordSpecialSpawn(nowMs: number): void {
        this._lastSpecialSpawnMs = nowMs;
    }

    /**
     * Resets all power-up state for a new session.
     * Sets lastSpecialSpawnMs = sessionStartMs (not 0) to avoid pity firing immediately.
     */
    reset(sessionStartMs: number): void {
        this._scoreMultiplierExpiryMs = 0;
        this._timeFreezeExpiryMs = 0;
        this._slowGrowthExpiryMs = 0;
        this._lastSpecialSpawnMs = sessionStartMs;
        this._scoreMultiplierValue = 1;
    }
}

/**
 * Returns a new FlowerTypeConfig with all 7 duration fields scaled by factor.
 * Uses Math.round to avoid floating-point artifacts.
 * Does NOT mutate the original config.
 */
export function applySlowGrowthConfig(base: FlowerTypeConfig, factor: number): FlowerTypeConfig {
    return {
        ...base,
        cycleDurationMs: Math.round(base.cycleDurationMs * factor),
        budMs:           Math.round(base.budMs * factor),
        tapWindowMs:     Math.round(base.tapWindowMs * factor),
        bloomingMs:      Math.round(base.bloomingMs * factor),
        fullBloomMs:     Math.round(base.fullBloomMs * factor),
        wiltingMs:       Math.round(base.wiltingMs * factor),
        deadMs:          Math.round(base.deadMs * factor),
    };
}
