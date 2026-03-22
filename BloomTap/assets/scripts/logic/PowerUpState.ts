// PowerUpState.ts — NO 'cc' import, pure TypeScript only
import { FlowerTypeConfig } from './FlowerTypes';

export enum EffectType {
    SCORE_MULTIPLIER = 'SCORE_MULTIPLIER',
    TIME_FREEZE = 'TIME_FREEZE',
    SLOW_GROWTH = 'SLOW_GROWTH',
}

/**
 * Tracks multiple simultaneous active power-up effects.
 * Stacking semantics: different effects accumulate; same effect replaces its timer.
 * All time values are absolute ms (matching performance.now() scale).
 */
export class PowerUpState {
    private _effects: Map<EffectType, number> = new Map(); // effect → expiryMs

    /** Returns true when the specific effect is active and has not expired. */
    isEffectActive(effect: EffectType, nowMs: number): boolean {
        const expiry = this._effects.get(effect);
        return expiry !== undefined && nowMs < expiry;
    }

    /** Returns true when any effect is currently active. */
    isAnyActive(nowMs: number): boolean {
        for (const expiry of this._effects.values()) {
            if (nowMs < expiry) return true;
        }
        return false;
    }

    /**
     * Activates an effect.
     * - Same effect type: replaces its timer (refreshes duration).
     * - Different effect type: stacks alongside existing effects.
     */
    activate(effect: EffectType, nowMs: number, durationMs: number): void {
        this._effects.set(effect, nowMs + durationMs);
    }

    /**
     * Removes all expired effects. Should be called each frame.
     */
    tick(nowMs: number): void {
        for (const [effect, expiry] of this._effects) {
            if (nowMs >= expiry) this._effects.delete(effect);
        }
    }

    /**
     * Shifts all active effect expiries forward by deltaMs — used to compensate for pause time.
     */
    shiftExpiry(deltaMs: number): void {
        for (const [effect, expiry] of this._effects) {
            this._effects.set(effect, expiry + deltaMs);
        }
    }

    /**
     * Returns remaining duration in ms for a specific effect.
     * Returns 0 when that effect is not active or has expired.
     */
    getRemainingMs(effect: EffectType, nowMs: number): number {
        if (!this.isEffectActive(effect, nowMs)) return 0;
        return this._effects.get(effect)! - nowMs;
    }

    /** Returns all currently active effect types. */
    getActiveEffects(nowMs: number): EffectType[] {
        const active: EffectType[] = [];
        for (const [effect, expiry] of this._effects) {
            if (nowMs < expiry) active.push(effect);
        }
        return active;
    }

    /** Clears all active effects. */
    reset(): void {
        this._effects.clear();
    }
}

/**
 * Returns a new FlowerTypeConfig with cycleDurationMs scaled by factor.
 * Uses Math.round to preserve integer ms values.
 * Does NOT mutate the original config.
 */
export function applySlowGrowthConfig(config: FlowerTypeConfig, factor: number): FlowerTypeConfig {
    return { ...config, cycleDurationMs: Math.round(config.cycleDurationMs * factor) };
}
