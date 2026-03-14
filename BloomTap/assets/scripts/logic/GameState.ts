/**
 * GameState — pure TypeScript, no 'cc' imports.
 *
 * Tracks session score and timing. ComboSystem is passed per-method so
 * GameState remains stateless regarding combo — combo is owned by
 * GameController in Phase 3 wiring.
 */
import { ComboSystem } from './ComboSystem';

/** Points deducted for tapping in the wrong state. */
export const WRONG_TAP_PENALTY: number = 10;

/** Total session duration in milliseconds (2 minutes). */
export const SESSION_DURATION_MS: number = 120_000;

export class GameState {
    /** Current accumulated score for this session. */
    score: number = 0;

    /** Timestamp (ms) when the session started, set by reset(). */
    sessionStartMs: number = 0;

    /**
     * Resets scoring state for a new session.
     * Sets score=0 and records the current timestamp as sessionStartMs.
     */
    reset(): void {
        this.score = 0;
        this.sessionStartMs = performance.now();
    }

    /**
     * Applies a correct tap: adds Math.round(rawScore * combo.multiplier) to
     * score, then calls combo.onCorrectTap() to advance the streak.
     *
     * @param rawScore - Base score value from FlowerFSM.getScore()
     * @param combo    - Active ComboSystem instance
     */
    applyCorrectTap(rawScore: number, combo: ComboSystem): void {
        this.score += Math.round(rawScore * combo.multiplier);
        combo.onCorrectTap();
    }

    /**
     * Applies a wrong tap: subtracts WRONG_TAP_PENALTY from score (score can
     * go negative — no floor applied), then calls combo.onWrongTap() to reset
     * the streak.
     *
     * @param combo - Active ComboSystem instance
     */
    applyWrongTap(combo: ComboSystem): void {
        this.score -= WRONG_TAP_PENALTY;
        combo.onWrongTap();
    }

    /**
     * Returns elapsed time since the last reset() call.
     * @returns milliseconds elapsed
     */
    getElapsedMs(): number {
        return performance.now() - this.sessionStartMs;
    }

    /**
     * Returns true when the session has reached or exceeded SESSION_DURATION_MS.
     *
     * @param nowMs - Current timestamp in ms (e.g. performance.now())
     */
    isGameOver(nowMs: number): boolean {
        return (nowMs - this.sessionStartMs) >= SESSION_DURATION_MS;
    }
}
