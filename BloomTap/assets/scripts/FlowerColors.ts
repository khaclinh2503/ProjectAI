import { Color } from 'cc';

/**
 * Flash color constants shared between GridRenderer and GameController.
 * Extracted to a separate module to prevent circular dependency:
 *   GridRenderer → FlowerColors ← GameController
 *
 * Each constant is a distinct Color object (no shared-reference pitfall).
 */
export const CORRECT_FLASH_YELLOW   = new Color(255, 220,  60, 255);
export const CORRECT_FLASH_WHITE    = new Color(255, 255, 255, 255);
export const WRONG_FLASH_COLOR      = new Color(220,  50,  50, 255);
export const FLOAT_COLOR_MULTIPLIER = new Color(255, 200,  50, 255);
