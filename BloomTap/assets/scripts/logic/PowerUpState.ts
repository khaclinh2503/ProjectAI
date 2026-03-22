// PowerUpState.ts — NO 'cc' import, pure TypeScript only
import { FlowerTypeConfig } from './FlowerTypes';

export enum EffectType {
    SCORE_MULTIPLIER = 'SCORE_MULTIPLIER',
    TIME_FREEZE = 'TIME_FREEZE',
    SLOW_GROWTH = 'SLOW_GROWTH',
}

/**
 * Tracks a single active power-up effect with expiry timestamp.
 * Replacement semantics: activate() replaces any existing effect.
 * All time values are absolute ms (matching performance.now() scale).
 */
export class PowerUpState {
    activeEffect: EffectType | null = null;
    expiryMs: number = 0;

    /** Returns true when an effect is active and has not expired. */
    isActive(nowMs: number): boolean {
        return this.activeEffect !== null && nowMs < this.expiryMs;
    }

    /**
     * Activates an effect, replacing any currently active effect.
     * Sets expiryMs = nowMs + durationMs.
     */
    activate(effect: EffectType, nowMs: number, durationMs: number): void {
        this.activeEffect = effect;
        this.expiryMs = nowMs + durationMs;
    }

    /**
     * Clears the active effect if it has expired (nowMs >= expiryMs).
     * Should be called each frame.
     */
    tick(nowMs: number): void {
        if (this.activeEffect !== null && nowMs >= this.expiryMs) {
            this.activeEffect = null;
            this.expiryMs = 0;
        }
    }

    /**
     * Shifts expiryMs forward by deltaMs — used to compensate for pause time.
     * Does nothing when no effect is active.
     */
    shiftExpiry(deltaMs: number): void {
        if (this.activeEffect !== null) {
            this.expiryMs += deltaMs;
        }
    }

    /**
     * Returns remaining duration in ms for the active effect.
     * Returns 0 when no effect is active or effect has expired.
     */
    getRemainingMs(nowMs: number): number {
        if (!this.isActive(nowMs)) return 0;
        return this.expiryMs - nowMs;
    }

    /** Clears active effect and resets expiryMs to 0. */
    reset(): void {
        this.activeEffect = null;
        this.expiryMs = 0;
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
