// BloomTap/assets/scripts/logic/JuiceHelpers.ts
// Pure juice animation helpers — no Cocos imports.
// Imported by GridRenderer and GameController for animation parameters.

export const MILESTONE_THRESHOLDS: readonly number[] = [10, 25, 50];

/**
 * Returns the display string for a score float label.
 * Negative amounts (wrong tap penalty) display as-is: "-30"
 * Positive amounts prefix with "+": "+120"
 */
export function getFloatLabelString(amount: number): string {
    return amount < 0 ? String(amount) : '+' + String(amount);
}

/**
 * Returns the font size for a score float label proportional to multiplier.
 * Formula: Math.min(24 + (multiplier - 1) * 4, 48)
 * x1 → 24px, x2 → 28px, x7+ → 48px (capped)
 */
export function getFloatFontSize(multiplier: number): number {
    return Math.min(24 + (multiplier - 1) * 4, 48);
}

/**
 * Returns the float animation duration in seconds proportional to multiplier.
 * Formula: Math.min(0.4 + (multiplier - 1) * 0.1, 1.0)
 * x1 → 0.4s, x7+ → 1.0s (capped)
 */
export function getFloatDuration(multiplier: number): number {
    return Math.min(0.4 + (multiplier - 1) * 0.1, 1.0);
}

/**
 * Returns the urgency stage (0–3) based on remaining seconds.
 * 0 = normal (>60s), 1 = yellow (≤60s), 2 = orange (≤30s), 3 = red+blink (≤10s)
 */
export function getUrgencyStage(remainingSecs: number): 0 | 1 | 2 | 3 {
    if (remainingSecs <= 10) return 3;
    if (remainingSecs <= 30) return 2;
    if (remainingSecs <= 60) return 1;
    return 0;
}

/**
 * Returns the milestone celebration label if tapCount hits a threshold for the first time.
 * Mutates the triggered Set to mark this threshold as done.
 * Returns null if tapCount is not a milestone, or if already triggered.
 */
export function getMilestoneLabel(tapCount: number, triggered: Set<number>): string | null {
    if (MILESTONE_THRESHOLDS.indexOf(tapCount) === -1) return null;
    if (triggered.has(tapCount)) return null;
    triggered.add(tapCount);
    return `COMBO x${tapCount}!`;
}
