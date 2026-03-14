import { _decorator, Component, Label, Color } from 'cc';
import { Grid, Cell } from './logic/Grid';
import { ComboSystem } from './logic/ComboSystem';
import { SpawnManager } from './logic/SpawnManager';
import { GameState } from './logic/GameState';
import { FLOWER_CONFIGS } from './logic/FlowerTypes';
import { FlowerFSM } from './logic/FlowerFSM';
import { FlowerState } from './logic/FlowerState';
import { GridRenderer } from './GridRenderer';
import { CORRECT_FLASH_YELLOW, CORRECT_FLASH_WHITE } from './FlowerColors';

const { ccclass, property } = _decorator;

@ccclass('GameController')
export class GameController extends Component {
    @property(GridRenderer)
    gridRenderer: GridRenderer | null = null;

    @property(Label)
    debugScoreLabel: Label | null = null;

    public readonly grid = new Grid();
    public readonly comboSystem = new ComboSystem();
    public readonly spawnManager = new SpawnManager();
    public readonly gameState = new GameState();

    private _nextSpawnMs: number = 0;

    onLoad(): void {
        this.gameState.reset();
        this._nextSpawnMs = performance.now();
        // Wire GridRenderer to this controller
        if (this.gridRenderer) {
            this.gridRenderer.init(this.grid, this);
        }
    }

    update(_dt: number): void {
        const nowMs = performance.now();
        const elapsedMs = this.gameState.getElapsedMs();

        // SpawnManager tick
        if (nowMs >= this._nextSpawnMs) {
            const phaseConfig = this.spawnManager.getPhaseConfig(elapsedMs);
            const aliveCount = this.grid.getAliveCount(nowMs);
            if (aliveCount < phaseConfig.maxAlive) {
                const emptyCell = this.grid.getRandomEmptyCell();
                if (emptyCell) {
                    const typeId = this.spawnManager.pickFlowerType(elapsedMs);
                    const config = FLOWER_CONFIGS[typeId];
                    this.grid.spawnFlower(emptyCell, config, nowMs);
                    // Notify renderer of the typeId so it can look up colors
                    if (this.gridRenderer) {
                        this.gridRenderer.setCellTypeId(emptyCell.row, emptyCell.col, typeId);
                    }
                }
            }
            this._nextSpawnMs = nowMs + this.spawnManager.getPhaseConfig(elapsedMs).intervalMs;
        }

        // Debug score display (Phase 3 only — no HUD yet)
        if (this.debugScoreLabel) {
            this.debugScoreLabel.string = `Score: ${Math.floor(this.gameState.score)}  x${this.comboSystem.multiplier.toFixed(2)}`;
        }
    }

    // -----------------------------------------------------------------------
    // Tap handler API (called by GridRenderer TOUCH_START handlers)
    // These methods contain NO Cocos scene-graph code — pure logic delegation.
    // -----------------------------------------------------------------------

    /**
     * Handle a correct tap (BLOOMING or FULL_BLOOM state).
     *
     * CRITICAL ordering (RESEARCH.md Pitfall 1):
     *   1. Read state via getState(nowMs) — BEFORE collect()
     *   2. Read score via getScore(nowMs) — BEFORE collect()
     *   3. Call collect() — after this, getState() returns COLLECTED and getScore() returns null
     *   4. Apply score to game state
     *
     * @param cell   - Grid cell containing the flower
     * @param flower - FlowerFSM instance (must be non-null, verified by caller)
     * @param nowMs  - Current timestamp from performance.now()
     * @returns      - { flashColor } to pass to GridRenderer.paintFlashAndClear()
     */
    public handleCorrectTap(cell: Cell, flower: FlowerFSM, nowMs: number): { flashColor: Color } {
        const state    = flower.getState(nowMs);          // 1. Read state before collect()
        const rawScore = flower.getScore(nowMs) ?? 0;     // 2. Read score before collect()
        flower.collect();                                  // 3. Mark collected
        this.gameState.applyCorrectTap(rawScore, this.comboSystem);
        const flashColor = state === FlowerState.FULL_BLOOM
            ? CORRECT_FLASH_WHITE
            : CORRECT_FLASH_YELLOW;
        return { flashColor };
    }

    /**
     * Handle a wrong tap (BUD, WILTING, or DEAD state).
     * Deducts WRONG_TAP_PENALTY from score and resets combo streak.
     */
    public handleWrongTap(): void {
        this.gameState.applyWrongTap(this.comboSystem);
    }
}
