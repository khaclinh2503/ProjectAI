import { _decorator, Component, Label, Color, Node, Button } from 'cc';
import { Grid, Cell } from './logic/Grid';
import { ComboSystem } from './logic/ComboSystem';
import { SpawnManager } from './logic/SpawnManager';
import { GameState, SESSION_DURATION_MS } from './logic/GameState';
import { FLOWER_CONFIGS } from './logic/FlowerTypes';
import { FlowerFSM } from './logic/FlowerFSM';
import { FlowerState } from './logic/FlowerState';
import { GridRenderer } from './GridRenderer';
import { CORRECT_FLASH_YELLOW, CORRECT_FLASH_WHITE } from './FlowerColors';

const { ccclass, property } = _decorator;

enum SessionPhase {
    WAITING,
    COUNTDOWN,
    PLAYING,
    GAME_OVER,
}

@ccclass('GameController')
export class GameController extends Component {
    @property(GridRenderer)
    gridRenderer: GridRenderer | null = null;

    @property(Label)
    debugScoreLabel: Label | null = null;

    @property(Node)
    hudNode: Node | null = null;

    @property(Label)
    scoreLabel: Label | null = null;

    @property(Label)
    timerLabel: Label | null = null;

    @property(Label)
    comboLabel: Label | null = null;

    @property(Node)
    startOverlay: Node | null = null;

    @property(Button)
    startButton: Button | null = null;

    @property(Node)
    countdownOverlay: Node | null = null;

    @property(Label)
    countdownLabel: Label | null = null;

    @property(Node)
    gameOverOverlay: Node | null = null;

    @property(Label)
    finalScoreLabel: Label | null = null;

    @property(Button)
    restartButton: Button | null = null;

    public readonly grid = new Grid();
    public readonly comboSystem = new ComboSystem();
    public readonly spawnManager = new SpawnManager();
    public readonly gameState = new GameState();

    private _nextSpawnMs: number = 0;
    private _phase: SessionPhase = SessionPhase.WAITING;
    private _lastDisplayedSecond: number = -1;

    onLoad(): void {
        // DO NOT call gameState.reset() here — reset happens in _beginSession() after countdown.
        // Wiring grid renderer reference.
        if (this.gridRenderer) {
            this.gridRenderer.init(this.grid, this);
            this.gridRenderer.setInputEnabled(false); // input off until PLAYING
        }
        // Wire button click handlers in code (buttons also exposed as @property for inspector wiring)
        this.startButton?.node.on(Button.EventType.CLICK, this._onStartTapped, this);
        this.restartButton?.node.on(Button.EventType.CLICK, this.onRestartTapped, this);
        this._showStartScreen();
    }

    update(_dt: number): void {
        if (this._phase !== SessionPhase.PLAYING) return;

        const nowMs = performance.now();

        // CRITICAL: game-over check FIRST — before any spawn logic.
        // Pitfall 6 from RESEARCH.md: checking after spawn can cause one extra flower on game-over frame.
        if (this.gameState.isGameOver(nowMs)) {
            this._triggerGameOver();
            return;
        }

        const elapsedMs = nowMs - this.gameState.sessionStartMs;

        // SpawnManager tick (existing logic — unchanged)
        if (nowMs >= this._nextSpawnMs) {
            const phaseConfig = this.spawnManager.getPhaseConfig(elapsedMs);
            const aliveCount = this.grid.getAliveCount(nowMs);
            if (aliveCount < phaseConfig.maxAlive) {
                const emptyCell = this.grid.getRandomEmptyCell();
                if (emptyCell) {
                    const typeId = this.spawnManager.pickFlowerType(elapsedMs);
                    const config = FLOWER_CONFIGS[typeId];
                    this.grid.spawnFlower(emptyCell, config, nowMs);
                    if (this.gridRenderer) {
                        this.gridRenderer.setCellTypeId(emptyCell.row, emptyCell.col, typeId);
                    }
                }
            }
            this._nextSpawnMs = nowMs + this.spawnManager.getPhaseConfig(elapsedMs).intervalMs;
        }

        // HUD update
        this._updateHUD(elapsedMs);
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

    // -----------------------------------------------------------------------
    // Session state machine — private methods
    // -----------------------------------------------------------------------

    private _showStartScreen(): void {
        this._phase = SessionPhase.WAITING;
        if (this.hudNode) this.hudNode.active = false;
        if (this.gameOverOverlay) this.gameOverOverlay.active = false;
        if (this.countdownOverlay) this.countdownOverlay.active = false;
        if (this.startOverlay) this.startOverlay.active = true;
    }

    private _onStartTapped(): void {
        this._startCountdown();
    }

    private _startCountdown(): void {
        this._phase = SessionPhase.COUNTDOWN;
        if (this.startOverlay) this.startOverlay.active = false;
        if (this.countdownOverlay) this.countdownOverlay.active = true;
        if (this.countdownLabel) this.countdownLabel.string = '3';

        // scheduleOnce chain: 3 → 2 → 1 → begin (1s each = 3s total)
        this.scheduleOnce(() => {
            if (this.countdownLabel) this.countdownLabel.string = '2';
            this.scheduleOnce(() => {
                if (this.countdownLabel) this.countdownLabel.string = '1';
                this.scheduleOnce(() => {
                    this._beginSession();
                }, 1);
            }, 1);
        }, 1);
    }

    private _beginSession(): void {
        if (this.countdownOverlay) this.countdownOverlay.active = false;
        if (this.hudNode) this.hudNode.active = true;

        // Reset all game state — this is the ONLY place reset() is called.
        this.gameState.reset();
        this.comboSystem.onWrongTap(); // resets multiplier=1, tapCount=0

        // Reset spawn timer: delay first spawn by one full Phase 1 interval (3000ms)
        // Pitfall 2 from RESEARCH.md: _nextSpawnMs must be reset or first session floods grid.
        const firstInterval = this.spawnManager.getPhaseConfig(0).intervalMs;
        this._nextSpawnMs = performance.now() + firstInterval;

        this._lastDisplayedSecond = -1; // force timer label to refresh on first frame

        if (this.gridRenderer) this.gridRenderer.setInputEnabled(true);
        this._phase = SessionPhase.PLAYING;
    }

    private _triggerGameOver(): void {
        this._phase = SessionPhase.GAME_OVER;
        if (this.gridRenderer) this.gridRenderer.setInputEnabled(false);
        // Clear all flowers from logic tier (grid shows empty state visually on next update frame)
        this.grid.clearAll();
        if (this.hudNode) this.hudNode.active = false;
        if (this.gameOverOverlay) this.gameOverOverlay.active = true;
        if (this.finalScoreLabel) {
            this.finalScoreLabel.string = `Score: ${Math.floor(this.gameState.score)}`;
        }
    }

    public onRestartTapped(): void {
        // In-place reset — no scene reload (locked decision from CONTEXT.md)
        this.gameState.score = 0;
        this.comboSystem.onWrongTap(); // resets multiplier=1, tapCount=0
        this.grid.clearAll();          // clear logic tier — Pitfall 3 from RESEARCH.md
        if (this.gridRenderer) {
            this.gridRenderer.setInputEnabled(false);
            // GridRenderer.update() will repaint empty cells on next frame automatically
        }
        this._showStartScreen();
    }

    private _updateHUD(elapsedMs: number): void {
        // Score: update every frame (cheap — only changes on tap)
        if (this.scoreLabel) {
            this.scoreLabel.string = `${Math.floor(this.gameState.score)}`;
        }
        // Combo: update every frame (only changes on tap)
        if (this.comboLabel) {
            this.comboLabel.string = `Combo x${this.comboSystem.tapCount}`;
        }
        // Timer: throttled — only write string when second boundary crosses
        const remainingSecs = Math.max(0, Math.floor((SESSION_DURATION_MS - elapsedMs) / 1000));
        if (remainingSecs !== this._lastDisplayedSecond) {
            this._lastDisplayedSecond = remainingSecs;
            if (this.timerLabel) this.timerLabel.string = `${remainingSecs}`;
        }
    }
}
