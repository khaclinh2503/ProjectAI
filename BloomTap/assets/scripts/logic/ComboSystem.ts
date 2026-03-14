/**
 * ComboSystem — pure TypeScript, no 'cc' imports.
 *
 * Tracks the multiplier streak for the scoring system.
 * Step halves at tapCount thresholds 10 and 50.
 * A wrong tap resets all state to initial values.
 */
export class ComboSystem {
    private _multiplier: number = 1;
    private _step: number = 0.5;
    private _tapCount: number = 0;

    /** Current multiplier value (readonly). */
    get multiplier(): number {
        return this._multiplier;
    }

    /** Number of consecutive correct taps since last reset (readonly). */
    get tapCount(): number {
        return this._tapCount;
    }

    /**
     * Called on a correct tap.
     * Increments multiplier by current step, then checks thresholds AFTER incrementing tapCount.
     */
    onCorrectTap(): void {
        this._multiplier += this._step;
        this._tapCount += 1;

        // Step halving at threshold crossings (check after tapCount is already updated)
        if (this._tapCount === 10) {
            this._step = 0.25;
        } else if (this._tapCount === 50) {
            this._step = 0.125;
        }
    }

    /**
     * Called on a wrong tap.
     * Fully resets multiplier, step, and tapCount to initial values.
     */
    onWrongTap(): void {
        this._multiplier = 1;
        this._step = 0.5;
        this._tapCount = 0;
    }

    /**
     * Applies the current multiplier to a raw score value.
     * @param rawScore - The base score before multiplier
     * @returns rawScore * multiplier
     */
    applyToScore(rawScore: number): number {
        return rawScore * this._multiplier;
    }
}
