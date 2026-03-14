import { _decorator, Component, Label } from 'cc';
import { Grid } from './logic/Grid';
import { ComboSystem } from './logic/ComboSystem';
import { SpawnManager } from './logic/SpawnManager';
import { GameState } from './logic/GameState';
import { FLOWER_CONFIGS } from './logic/FlowerTypes';
import { GridRenderer } from './GridRenderer';

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
}
