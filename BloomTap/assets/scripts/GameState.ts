/**
 * Re-export GameState from the pure logic tier.
 * This file exists to keep Cocos scripts/ vs logic/ separation:
 * GameController (Cocos component) can import from scripts/GameState
 * rather than crossing the scripts/logic/ boundary directly for the
 * game state model.
 */
export { GameState, WRONG_TAP_PENALTY } from './logic/GameState';
