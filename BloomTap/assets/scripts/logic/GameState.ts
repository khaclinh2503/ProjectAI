/**
 * GameState — pure TypeScript, no 'cc' imports.
 *
 * Tracks session score and timing. ComboSystem is passed per-method so
 * GameState remains stateless regarding combo — combo is owned by
 * GameController in Phase 3 wiring.
 */
import { ComboSystem } from './ComboSystem';

/** Points deducted for tapping in the wrong state. */
export let WRONG_TAP_PENALTY: number = 10;

/** Total session duration in milliseconds (2 minutes). */
export let SESSION_DURATION_MS: number = 120_000;

/**
 * Overrides WRONG_TAP_PENALTY and SESSION_DURATION_MS with runtime values from JSON config.
 * When not called (e.g. in tests), hardcoded defaults remain.
 */
export function initGameSettings(settings: { session: { durationMs: number }; scoring: { wrongTapPenalty: number } }): void {
    SESSION_DURATION_MS = settings.session.durationMs;
    WRONG_TAP_PENALTY = settings.scoring.wrongTapPenalty;
}

export class GameState {
    /** Current accumulated score for this session. */
    score: number = 0;

    /** Timestamp (ms) when the session started, set by reset(). */
    sessionStartMs: number = 0;

    /** Number of correct taps in this session. */
    correctTaps: number = 0;

    /** Number of wrong taps in this session. */
    wrongTaps: number = 0;

    /** Highest consecutive correct tap streak achieved this session. */
    peakStreak: number = 0;

    /**
     * Resets scoring state for a new session.
     * Sets score=0 and records the current timestamp as sessionStartMs.
     */
    reset(): void {
        this.score = 0;
        this.sessionStartMs = performance.now();
        this.correctTaps = 0;
        this.wrongTaps = 0;
        this.peakStreak = 0;
    }

    /**
     * Applies a correct tap: increments correctTaps, adds Math.round(rawScore *
     * combo.multiplier * powerUpMultiplier) to score, then calls combo.onCorrectTap()
     * to advance the streak, and updates peakStreak after the increment.
     *
     * @param rawScore          - Base score value from FlowerFSM.getScore()
     * @param combo             - Active ComboSystem instance
     * @param powerUpMultiplier - Active score multiplier from power-up (default 1)
     */
    applyCorrectTap(rawScore: number, combo: ComboSystem, powerUpMultiplier: number = 1): void {
        this.correctTaps += 1;
        this.score += Math.round(rawScore * combo.multiplier * powerUpMultiplier);
        combo.onCorrectTap();                           // increments tapCount FIRST
        if (combo.tapCount > this.peakStreak) {
            this.peakStreak = combo.tapCount;           // capture peak AFTER increment
        }
    }

    /**
     * Applies a wrong tap: increments wrongTaps, subtracts WRONG_TAP_PENALTY
     * from score (score can go negative — no floor applied), then calls
     * combo.onWrongTap() to reset the streak.
     *
     * @param combo - Active ComboSystem instance
     */
    applyWrongTap(combo: ComboSystem): void {
        this.wrongTaps += 1;
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
