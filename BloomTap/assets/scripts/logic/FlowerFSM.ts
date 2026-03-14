import { FlowerTypeConfig } from './FlowerTypes';
import { FlowerState } from './FlowerState';

/**
 * Timestamp-based flower state machine.
 * State is derived from (nowMs - spawnTimestamp) — never accumulated.
 * This prevents timer drift over the 120s game session.
 */
export class FlowerFSM {
    private readonly _spawnTimestamp: number;
    private readonly _config: FlowerTypeConfig;
    private _collected: boolean = false;

    constructor(spawnTimestamp: number, config: FlowerTypeConfig) {
        this._spawnTimestamp = spawnTimestamp;
        this._config = config;
    }

    /**
     * Derive flower state from injected timestamp.
     * All state transitions are computed from elapsed time — no mutable state.
     */
    getState(nowMs: number): FlowerState {
        if (this._collected) {
            return FlowerState.COLLECTED;
        }

        const elapsed = nowMs - this._spawnTimestamp;
        const { budMs, tapWindowMs, wiltingMs } = this._config;

        if (elapsed < budMs) {
            return FlowerState.BUD;
        }

        const tapStart = budMs;
        const tapEnd = budMs + tapWindowMs;

        if (elapsed < tapEnd) {
            // Within tap window: BLOOMING (first 2/3) or FULL_BLOOM (last 1/3)
            const tapElapsed = elapsed - tapStart;
            if (tapElapsed < this._config.bloomingMs) {
                return FlowerState.BLOOMING;
            }
            return FlowerState.FULL_BLOOM;
        }

        const wiltEnd = tapEnd + wiltingMs;

        if (elapsed < wiltEnd) {
            return FlowerState.WILTING;
        }

        return FlowerState.DEAD;
    }

    /**
     * Returns interpolated score if within tap window, null otherwise.
     * Score = scoreBloom + (t / tapWindowMs) * (scoreFull - scoreBloom)
     * where t = elapsed since start of tap window.
     *
     * The tap window is inclusive on both ends [budMs, budMs + tapWindowMs].
     * At t=tapWindowMs the score equals scoreFull.
     */
    getScore(nowMs: number): number | null {
        if (this._collected) {
            return null;
        }

        const elapsed = nowMs - this._spawnTimestamp;
        const { budMs, tapWindowMs, scoreBloom, scoreFull } = this._config;
        const t = elapsed - budMs;

        // Within tap window: [0, tapWindowMs] inclusive
        if (t < 0 || t > tapWindowMs) {
            return null;
        }

        return scoreBloom + (t / tapWindowMs) * (scoreFull - scoreBloom);
    }

    /**
     * Mark flower as collected. After this, getState() always returns COLLECTED.
     */
    collect(): void {
        this._collected = true;
    }
}
