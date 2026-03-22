import { _decorator, Component, Label, Color, Node, Button, tween, Tween, Vec3, UIOpacity, UITransform } from 'cc';
import { Grid, Cell } from './logic/Grid';
import { ComboSystem } from './logic/ComboSystem';
import { SpawnManager } from './logic/SpawnManager';
import { GameState, SESSION_DURATION_MS } from './logic/GameState';
import { FLOWER_CONFIGS } from './logic/FlowerTypes';
import { FlowerFSM } from './logic/FlowerFSM';
import { FlowerState } from './logic/FlowerState';
import { GridRenderer } from './GridRenderer';
import { CORRECT_FLASH_YELLOW, CORRECT_FLASH_WHITE } from './FlowerColors';
import { StorageService } from './logic/StorageService';
import { PowerUpState, EffectType, applySlowGrowthConfig } from './logic/PowerUpState';
import { getPowerUpConfig } from './logic/GameConfig';
import { PowerUpHUDRenderer } from './PowerUpHUDRenderer';

const { ccclass, property } = _decorator;

// Pre-allocated color constants — no per-frame allocation (CONTEXT.md decision)
const TIMER_COLOR_NORMAL   = new Color(255, 255, 255, 255); // white
const TIMER_COLOR_URGENCY1 = new Color(255, 220,  50, 255); // yellow  (≤60s)
const TIMER_COLOR_URGENCY2 = new Color(255, 140,  30, 255); // orange  (≤30s)
const TIMER_COLOR_URGENCY3 = new Color(220,  50,  50, 255); // red     (≤10s)

enum SessionPhase {
    WAITING,
    COUNTDOWN,
    PLAYING,
    PAUSED,       // per D-04
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

    @property(Node)
    redFlashOverlay: Node | null = null;

    @property(Node)
    milestoneNode: Node | null = null;

    @property(Label)
    milestoneLabel: Label | null = null;

    @property(Label)
    highscoreLabel: Label | null = null;

    @property(Label)
    bestComboLabel: Label | null = null;

    @property(Label)
    accuracyLabel: Label | null = null;

    @property(Label)
    newBestLabel: Label | null = null;

    @property(Node)
    pauseButton: Node | null = null;

    @property(Node)
    pauseOverlay: Node | null = null;

    @property(Label)
    pausedLabel: Label | null = null;

    @property(Label)
    pausedSubLabel: Label | null = null;

    @property(PowerUpHUDRenderer)
    powerUpHUD: PowerUpHUDRenderer | null = null;

    public readonly grid = new Grid();
    public readonly comboSystem = new ComboSystem();
    public readonly spawnManager = new SpawnManager();
    public readonly gameState = new GameState();
    public readonly powerUpState = new PowerUpState();
    private _nextSpawnMs: number = 0;
    private _phase: SessionPhase = SessionPhase.WAITING;
    private _lastDisplayedSecond: number = -1;
    private _triggeredMilestones = new Set<number>();
    private _urgencyStage: number = 0;
    private _blinkVisible: boolean = true;
    private _blinkCallback: (() => void) | null = null;
    private _pauseStartMs: number = 0;

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
        this.pauseButton?.on(Button.EventType.CLICK, this._onPauseTapped, this);
        if (this.pauseOverlay) {
            this.pauseOverlay.on(Node.EventType.TOUCH_START, this._onResumeTapped, this);
        }
        if (this.pauseButton) this.pauseButton.active = false;
        if (this.pauseOverlay) this.pauseOverlay.active = false;
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

        // TIME_FREEZE: advance sessionStartMs each frame while active (D-12)
        // Must run BEFORE elapsedMs calculation so timer display freezes
        if (this.powerUpState.isEffectActive(EffectType.TIME_FREEZE, nowMs)) {
            this.gameState.sessionStartMs += _dt * 1000;
        }

        const elapsedMs = nowMs - this.gameState.sessionStartMs;

        // SpawnManager tick: spawn a batch of flowers per interval
        if (nowMs >= this._nextSpawnMs) {
            const phaseConfig = this.spawnManager.getPhaseConfig(elapsedMs);
            for (let i = 0; i < phaseConfig.spawnBatch; i++) {
                if (this.grid.getAliveCount(nowMs) >= phaseConfig.maxAlive) break;
                const emptyCell = this.grid.getRandomEmptyCell();
                if (!emptyCell) break;
                const typeId = this.spawnManager.pickFlowerType(elapsedMs);
                let effectiveConfig = FLOWER_CONFIGS[typeId];

                // SLOW_GROWTH: spawn-time config copy with extended cycleDurationMs (D-13, D-14)
                if (this.powerUpState.isEffectActive(EffectType.SLOW_GROWTH, nowMs)) {
                    effectiveConfig = applySlowGrowthConfig(effectiveConfig, getPowerUpConfig().slowGrowth.factor);
                }

                // Special flower decision (D-18)
                const isSpecial = Math.random() < getPowerUpConfig().specialChance;
                if (isSpecial) {
                    const effects = [EffectType.SCORE_MULTIPLIER, EffectType.TIME_FREEZE, EffectType.SLOW_GROWTH];
                    emptyCell.isSpecial = true;
                    emptyCell.specialEffect = effects[Math.floor(Math.random() * effects.length)];
                }

                this.grid.spawnFlower(emptyCell, effectiveConfig, nowMs);
                if (this.gridRenderer) {
                    this.gridRenderer.setCellTypeId(emptyCell.row, emptyCell.col, typeId);
                    if (isSpecial) {
                        this.gridRenderer.markCellDirty(emptyCell.row, emptyCell.col);
                    }
                }
            }
            this._nextSpawnMs = nowMs + phaseConfig.intervalMs;
        }

        // Tick power-up state — expires effect if past expiryMs
        this.powerUpState.tick(nowMs);

        // Power-up HUD tick (D-15, D-16)
        if (this.powerUpHUD) {
            this.powerUpHUD.tick(this.powerUpState, nowMs);
        }

        // HUD update
        this._updateHUD(elapsedMs);
    }

    // -----------------------------------------------------------------------
    // Tap handler API (called by GridRenderer TOUCH_START handlers)
    // These methods contain NO Cocos scene-graph code — pure logic delegation.
    // -----------------------------------------------------------------------

    /**
     * Called by GridRenderer when a cell is tapped while input is disabled.
     * Resumes session if currently paused.
     */
    public onScreenTapped(): void {
        if (this._phase === SessionPhase.PAUSED) {
            this._onResumeTapped();
        }
    }

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
    public handleCorrectTap(
        cell: Cell,
        flower: FlowerFSM,
        nowMs: number,
    ): { flashColor: Color; rawScore: number; multiplier: number; isFullBloom: boolean } {
        const state    = flower.getState(nowMs);          // 1. Read state before collect()
        const rawScore = flower.getScore(nowMs) ?? 0;     // 2. Read score before collect()
        flower.collect();                                  // 3. Mark collected

        // Power-up activation: any scoring tap on special cell
        if (cell.isSpecial && cell.specialEffect && rawScore > 0) {
            const durationMs = this._getDurationForEffect(cell.specialEffect);
            this.powerUpState.activate(cell.specialEffect, nowMs, durationMs);
        }

        // SCORE_MULTIPLIER: apply phase-indexed multiplier (D-09, D-10)
        let powerUpMultiplier = 1;
        if (this.powerUpState.isEffectActive(EffectType.SCORE_MULTIPLIER, nowMs)) {
            const elapsedMs = nowMs - this.gameState.sessionStartMs;
            const phaseIndex = this._getPhaseIndex(elapsedMs);
            powerUpMultiplier = getPowerUpConfig().scoreMultiplier.multiplierByPhase[phaseIndex] ?? 1;
        }

        this.gameState.applyCorrectTap(rawScore, this.comboSystem, powerUpMultiplier);
        const isFullBloom = state === FlowerState.FULL_BLOOM;
        const flashColor = isFullBloom ? CORRECT_FLASH_WHITE : CORRECT_FLASH_YELLOW;
        const multiplier = this.comboSystem.multiplier;

        // JUICE-03: combo label pulse + milestone check
        this._pulseComboLabel();
        this._checkMilestone(this.comboSystem.tapCount);

        return { flashColor, rawScore: Math.round(rawScore), multiplier, isFullBloom };
    }

    /**
     * Handle a wrong tap (BUD, WILTING, or DEAD state).
     * Deducts WRONG_TAP_PENALTY from score and resets combo streak.
     */
    public handleWrongTap(): void {
        this.gameState.applyWrongTap(this.comboSystem);
        // JUICE-03: full-screen red flash + combo label blink
        this._playRedFlash();
        this._playComboBreak();
    }

    private _getDurationForEffect(effect: EffectType): number {
        switch (effect) {
            case EffectType.SCORE_MULTIPLIER: return getPowerUpConfig().scoreMultiplier.durationMs;
            case EffectType.TIME_FREEZE: return getPowerUpConfig().timeFreeze.durationMs;
            case EffectType.SLOW_GROWTH: return getPowerUpConfig().slowGrowth.durationMs;
        }
    }

    private _getPhaseIndex(elapsedMs: number): number {
        if (elapsedMs < 40000) return 0;
        if (elapsedMs < 80000) return 1;
        return 2;
    }

    // -----------------------------------------------------------------------
    // Juice animation methods — JUICE-03 combo events
    // -----------------------------------------------------------------------

    /** Full-screen red overlay flash (150ms) on wrong tap (JUICE-03). */
    private _playRedFlash(): void {
        if (!this.redFlashOverlay) return;
        const uiOp = this.redFlashOverlay.getComponent(UIOpacity);
        if (!uiOp) return;
        uiOp.opacity = 0;
        this.redFlashOverlay.active = true;
        Tween.stopAllByTarget(uiOp);
        tween(uiOp)
            .to(0.05, { opacity: 51 })   // 20% of 255 = 51 (CONTEXT.md: ~20% opacity)
            .to(0.10, { opacity: 0 })    // fade out — total 150ms
            .call(() => {
                if (this.redFlashOverlay) this.redFlashOverlay.active = false;
            })
            .start();
    }

    /** Combo label blink + fade on wrong tap (JUICE-03). */
    private _playComboBreak(): void {
        if (!this.comboLabel) return;
        const uiOp = this.comboLabel.node.getComponent(UIOpacity);
        if (!uiOp) return;
        uiOp.opacity = 255;
        Tween.stopAllByTarget(uiOp);
        tween(uiOp)
            .to(0.05, { opacity: 0 })
            .to(0.05, { opacity: 255 })
            .repeat(3)                   // 3 blink cycles
            .to(0.15, { opacity: 0 })    // final fade
            .call(() => {
                // Restore opacity — _updateHUD() will update the label string to "Combo x0"
                uiOp.opacity = 255;
            })
            .start();
    }

    /** Combo label scale pulse on correct tap (JUICE-03). */
    private _pulseComboLabel(): void {
        if (!this.comboLabel) return;
        const labelNode = this.comboLabel.node;
        // Ensure anchor is centered so scale pulse expands evenly from the label's center.
        // Set here (not just onLoad) to be safe regardless of inspector wiring order.
        const uiT = labelNode.getComponent(UITransform);
        if (uiT) { uiT.anchorX = 0.5; uiT.anchorY = 0.5; }
        Tween.stopAllByTarget(labelNode);
        labelNode.setScale(1, 1, 1); // reset before pulse in case previous was interrupted
        tween(labelNode)
            .to(0.08, { scale: new Vec3(1.25, 1.25, 1) }, { easing: 'cubicOut' })
            .to(0.10, { scale: new Vec3(1.0,  1.0,  1) }, { easing: 'cubicIn' })
            .start();
    }

    /** Check if tapCount crossed a milestone threshold — triggers celebration exactly once per session. */
    private _checkMilestone(tapCount: number): void {
        // Only x10, x25, x50 — each triggers exactly once per session (CONTEXT.md decision)
        for (const m of [10, 25, 50]) {
            if (tapCount >= m && !this._triggeredMilestones.has(m)) {
                this._triggeredMilestones.add(m);
                this._playMilestoneCelebration(m);
                break; // one milestone per tap maximum
            }
        }
    }

    /** Mid-screen combo milestone celebration (scale punch + fade). */
    private _playMilestoneCelebration(count: number): void {
        if (!this.milestoneNode || !this.milestoneLabel) return;
        this.milestoneLabel.string = `COMBO x${count}!`;
        this.milestoneNode.setScale(0.5, 0.5, 1);
        this.milestoneNode.active = true;

        const uiOp = this.milestoneNode.getComponent(UIOpacity);
        if (!uiOp) return;
        uiOp.opacity = 255;

        Tween.stopAllByTarget(this.milestoneNode);
        Tween.stopAllByTarget(uiOp);

        // Scale punch: 0.5 → 1.3 → 1.0 (backOut gives a satisfying overshoot)
        tween(this.milestoneNode)
            .to(0.15, { scale: new Vec3(1.3, 1.3, 1) }, { easing: 'backOut' })
            .to(0.10, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'cubicOut' })
            .start();

        // Fade out after 0.6s hold
        tween(uiOp)
            .delay(0.6)
            .to(0.3, { opacity: 0 })
            .call(() => {
                if (this.milestoneNode) this.milestoneNode.active = false;
            })
            .start();
    }

    // -----------------------------------------------------------------------
    // Juice animation methods — JUICE-04 timer urgency
    // -----------------------------------------------------------------------

    /**
     * Determine urgency stage from remaining seconds and apply if changed.
     * Called on each second boundary in _updateHUD().
     * Instant transitions (no color tween) per CONTEXT.md.
     */
    private _updateTimerUrgency(remainingSecs: number): void {
        let newStage: number;
        if      (remainingSecs > 60) newStage = 0;
        else if (remainingSecs > 30) newStage = 1;
        else if (remainingSecs > 10) newStage = 2;
        else                          newStage = 3;

        if (newStage === this._urgencyStage) return; // no change — skip all work

        this._urgencyStage = newStage;
        this._applyUrgencyStage(newStage);
    }

    /**
     * Apply visual styling for the given urgency stage.
     * Stage 0: normal (white, 1.0x)
     * Stage 1: yellow (≤60s, 1.2x)
     * Stage 2: orange (≤30s, 1.4x)
     * Stage 3: red + blink every 250ms (≤10s, 1.6x)
     */
    private _applyUrgencyStage(stage: number): void {
        if (!this.timerLabel) return;

        // Stop any existing blink before applying new stage
        if (this._blinkCallback) {
            this.unschedule(this._blinkCallback);
            this._blinkCallback = null;
            this._blinkVisible = true;
            this.timerLabel.node.active = true; // restore if it was hidden mid-blink
        }

        switch (stage) {
            case 0:
                this.timerLabel.color = TIMER_COLOR_NORMAL;
                this.timerLabel.node.setScale(1.0, 1.0, 1);
                break;
            case 1:
                this.timerLabel.color = TIMER_COLOR_URGENCY1;
                this.timerLabel.node.setScale(1.2, 1.2, 1);
                break;
            case 2:
                this.timerLabel.color = TIMER_COLOR_URGENCY2;
                this.timerLabel.node.setScale(1.4, 1.4, 1);
                break;
            case 3:
                this.timerLabel.color = TIMER_COLOR_URGENCY3;
                this.timerLabel.node.setScale(1.6, 1.6, 1);
                // Start blink: toggle timer node visibility every 250ms.
                // Store callback as instance field — anonymous arrow = new object each call,
                // unschedule would fail (RESEARCH.md Pitfall 4).
                this._blinkCallback = () => {
                    this._blinkVisible = !this._blinkVisible;
                    if (this.timerLabel) this.timerLabel.node.active = this._blinkVisible;
                };
                this.schedule(this._blinkCallback, 0.25);
                break;
        }
    }

    // -----------------------------------------------------------------------
    // Session state machine — private methods
    // -----------------------------------------------------------------------

    private _stopAllJuiceAnimations(): void {
        if (this.milestoneNode) Tween.stopAllByTarget(this.milestoneNode);
        if (this.redFlashOverlay) Tween.stopAllByTarget(this.redFlashOverlay);
        if (this.comboLabel) Tween.stopAllByTarget(this.comboLabel.node);
        if (this.timerLabel) Tween.stopAllByTarget(this.timerLabel.node);
        if (this._blinkCallback) {
            this.unschedule(this._blinkCallback);
            this._blinkCallback = null;
        }
        this._urgencyStage = 0;
        this._blinkVisible = true;
        this._triggeredMilestones.clear();
        if (this.milestoneNode) this.milestoneNode.active = false;
        if (this.redFlashOverlay) this.redFlashOverlay.active = false;
        if (this.timerLabel) {
            this.timerLabel.node.active = true;
            this.timerLabel.color = new Color(255, 255, 255, 255);
            this.timerLabel.node.setScale(1, 1, 1);
        }
        if (this.gridRenderer) this.gridRenderer.stopAllFloatAnimations();
    }

    private _updatePauseButtonVisibility(): void {
        if (this.pauseButton) {
            this.pauseButton.active = (this._phase === SessionPhase.PLAYING);
        }
    }

    private _showStartScreen(): void {
        this._phase = SessionPhase.WAITING;
        this._updatePauseButtonVisibility();
        if (this.hudNode) this.hudNode.active = false;
        if (this.gameOverOverlay) this.gameOverOverlay.active = false;
        if (this.countdownOverlay) this.countdownOverlay.active = false;
        if (this.startOverlay) this.startOverlay.active = true;
    }

    private _onStartTapped(): void {
        this._spawnInitialBurst();
        this._startCountdown();
    }

    private _startCountdown(): void {
        this._phase = SessionPhase.COUNTDOWN;
        this._updatePauseButtonVisibility();
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
        this._stopAllJuiceAnimations();
        if (this.countdownOverlay) this.countdownOverlay.active = false;
        if (this.hudNode) this.hudNode.active = true;

        // Reset all game state — this is the ONLY place reset() is called.
        this.gameState.reset();
        this.comboSystem.onWrongTap(); // resets multiplier=1, tapCount=0
        this.powerUpState.reset();
        if (this.powerUpHUD) this.powerUpHUD.node.active = false;

        // Reset spawn timer to now so first batch spawns immediately on first update frame.
        this._nextSpawnMs = performance.now();

        this._lastDisplayedSecond = -1; // force timer label to refresh on first frame

        if (this.gridRenderer) this.gridRenderer.setInputEnabled(true);
        this._phase = SessionPhase.PLAYING;
        this._updatePauseButtonVisibility();
    }

    /**
     * Spawns the initial burst of flowers on the board before countdown starts.
     * Mirrors the spawn loop in update() (lines 131-144) — same pattern, same guards.
     * Called from _onStartTapped() per D-01: flowers visible while countdown runs.
     */
    private _spawnInitialBurst(): void {
        const nowMs = performance.now();
        const phaseConfig = this.spawnManager.getPhaseConfig(0);
        const initialCount = phaseConfig.initialCount ?? 0;
        for (let i = 0; i < initialCount; i++) {
            if (this.grid.getAliveCount(nowMs) >= phaseConfig.maxAlive) break;
            const emptyCell = this.grid.getRandomEmptyCell();
            if (!emptyCell) break;
            const typeId = this.spawnManager.pickFlowerType(0);
            let effectiveConfig = FLOWER_CONFIGS[typeId];

            // SLOW_GROWTH: spawn-time config copy with extended cycleDurationMs (D-13, D-14)
            if (this.powerUpState.isEffectActive(EffectType.SLOW_GROWTH, nowMs)) {
                effectiveConfig = applySlowGrowthConfig(effectiveConfig, getPowerUpConfig().slowGrowth.factor);
            }

            // Special flower decision (D-18)
            const isSpecial = Math.random() < getPowerUpConfig().specialChance;
            if (isSpecial) {
                const effects = [EffectType.SCORE_MULTIPLIER, EffectType.TIME_FREEZE, EffectType.SLOW_GROWTH];
                emptyCell.isSpecial = true;
                emptyCell.specialEffect = effects[Math.floor(Math.random() * effects.length)];
            }

            this.grid.spawnFlower(emptyCell, effectiveConfig, nowMs);
            if (this.gridRenderer) {
                this.gridRenderer.setCellTypeId(emptyCell.row, emptyCell.col, typeId);
                if (isSpecial) {
                    this.gridRenderer.markCellDirty(emptyCell.row, emptyCell.col);
                }
            }
        }
    }

    private _triggerGameOver(): void {
        this._stopAllJuiceAnimations();
        this._phase = SessionPhase.GAME_OVER;
        this._updatePauseButtonVisibility();
        if (this.gridRenderer) this.gridRenderer.setInputEnabled(false);
        this.grid.clearAll();
        if (this.hudNode) this.hudNode.active = false;

        const finalScore = Math.floor(this.gameState.score);
        const stored = StorageService.get('highscore');
        const currentBest = stored ? parseInt(stored, 10) : null;

        // Save highscore if new best — guard: score must be > 0
        const isNewBest = finalScore > 0 && (currentBest === null || finalScore > currentBest);
        if (isNewBest) {
            StorageService.set('highscore', String(finalScore));
        }

        // Show overlay
        if (this.gameOverOverlay) this.gameOverOverlay.active = true;
        if (this.finalScoreLabel) {
            this.finalScoreLabel.string = `Score: ${finalScore}`;
        }

        // Highscore label — only show when a highscore value exists
        const newBestValue = isNewBest ? finalScore : currentBest;
        if (this.highscoreLabel) {
            if (newBestValue !== null) {
                this.highscoreLabel.node.active = true;
                this.highscoreLabel.string = `Highscore: ${newBestValue}`;
            } else {
                this.highscoreLabel.node.active = false;
            }
        }

        // Best combo + accuracy
        const totalTaps = this.gameState.correctTaps + this.gameState.wrongTaps;
        const accuracy = totalTaps > 0
            ? Math.round((this.gameState.correctTaps / totalTaps) * 100)
            : 0;
        if (this.bestComboLabel) {
            this.bestComboLabel.string = `Best combo: ${this.gameState.peakStreak}`;
        }
        if (this.accuracyLabel) {
            this.accuracyLabel.string =
                `${this.gameState.correctTaps} / ${totalTaps} taps (${accuracy}%)`;
        }

        // "NEW BEST!" celebration — 0.5s delay, scale-pop tween
        if (isNewBest && this.newBestLabel) {
            this.newBestLabel.node.active = false;
            this.scheduleOnce(() => {
                if (!this.newBestLabel) return;
                this.newBestLabel.node.active = true;
                const labelNode = this.newBestLabel.node;
                labelNode.setScale(0, 0, 1);
                tween(labelNode)
                    .to(0.15, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'backOut' })
                    .to(0.10, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'cubicOut' })
                    .start();
            }, 0.5);
        }
    }

    // -----------------------------------------------------------------------
    // Pause / Resume — per D-01 through D-12 and Research Patterns 1-6
    // -----------------------------------------------------------------------

    private _onPauseTapped(): void {
        if (this._phase !== SessionPhase.PLAYING) return;

        this._pauseStartMs = performance.now();
        this._phase = SessionPhase.PAUSED;
        this._updatePauseButtonVisibility();

        // Freeze urgency blink (Research Pattern 3 — do NOT call _stopAllJuiceAnimations)
        if (this._blinkCallback) {
            this.unschedule(this._blinkCallback);
        }
        // Ensure timer label is visible (may have been toggled off mid-blink)
        if (this.timerLabel) this.timerLabel.node.active = true;

        // Stop all active tweens (Pitfall 1 — tweens run outside update() guard)
        if (this.milestoneNode) Tween.stopAllByTarget(this.milestoneNode);
        if (this.redFlashOverlay) Tween.stopAllByTarget(this.redFlashOverlay);
        if (this.comboLabel) Tween.stopAllByTarget(this.comboLabel.node);

        // Disable grid input and freeze rendering during pause
        if (this.gridRenderer) {
            this.gridRenderer.setInputEnabled(false);
            this.gridRenderer.freezeAt(performance.now());
        }

        // Show pause overlay (D-05, D-06, D-07)
        if (this.pauseOverlay) this.pauseOverlay.active = true;
    }

    private _onResumeTapped(): void {
        if (this._phase !== SessionPhase.PAUSED) return;  // Pitfall 6: block double-tap

        if (this.pauseOverlay) this.pauseOverlay.active = false;
        this._startResumeCountdown();
    }

    private _startResumeCountdown(): void {
        this._phase = SessionPhase.COUNTDOWN;
        this._updatePauseButtonVisibility();

        // Reuse existing countdownOverlay (D-10)
        if (this.countdownOverlay) this.countdownOverlay.active = true;
        if (this.countdownLabel) this.countdownLabel.string = '3';

        this.scheduleOnce(() => {
            if (this.countdownLabel) this.countdownLabel.string = '2';
            this.scheduleOnce(() => {
                if (this.countdownLabel) this.countdownLabel.string = '1';
                this.scheduleOnce(() => {
                    this._resumeSession();
                }, 1);
            }, 1);
        }, 1);
    }

    private _resumeSession(): void {
        if (this.countdownOverlay) this.countdownOverlay.active = false;

        // D-12: timestamp shift applied AFTER 3-2-1 countdown completes
        // Total pause duration = now - pauseStartMs (includes the 3s countdown per D-11)
        const pauseDeltaMs = performance.now() - this._pauseStartMs;
        this._applyPauseOffset(pauseDeltaMs);

        // Re-enable grid input and unfreeze rendering (timestamps already shifted above)
        if (this.gridRenderer) {
            this.gridRenderer.freezeAt(null);
            this.gridRenderer.setInputEnabled(true);
        }

        this._phase = SessionPhase.PLAYING;
        this._updatePauseButtonVisibility();

        // Restore urgency blink at correct stage (Pitfall 2)
        this._applyUrgencyStage(this._urgencyStage);
    }

    /**
     * Shifts all stored timestamps forward by deltaMs so derived values
     * (elapsed time, flower states, next spawn) pick up exactly where
     * they left off before the pause.
     */
    private _applyPauseOffset(deltaMs: number): void {
        this.gameState.sessionStartMs += deltaMs;
        this.grid.shiftAllTimestamps(deltaMs);
        this._nextSpawnMs += deltaMs;
        this.powerUpState.shiftExpiry(deltaMs);
    }

    public onRestartTapped(): void {
        // In-place reset — no scene reload (locked decision from Phase 4)
        this.gameState.score = 0;
        this.gameState.correctTaps = 0;
        this.gameState.wrongTaps = 0;
        this.gameState.peakStreak = 0;
        this.comboSystem.onWrongTap(); // resets multiplier=1, tapCount=0
        this.grid.clearAll();
        this.powerUpState.reset();
        if (this.newBestLabel) this.newBestLabel.node.active = false;
        if (this.gridRenderer) {
            this.gridRenderer.setInputEnabled(false);
        }
        this._showStartScreen();
    }

    private _updateHUD(elapsedMs: number): void {
        // Score: update every frame (cheap — only changes on tap)
        if (this.scoreLabel) {
            this.scoreLabel.string = `${Math.floor(this.gameState.score)}`;
        }
        // Combo: only show when streak > 1
        if (this.comboLabel) {
            const streak = this.comboSystem.tapCount;
            this.comboLabel.string = streak > 1 ? `Combo x${streak}` : '';
        }
        // Timer: throttled — only write string when second boundary crosses
        const remainingSecs = Math.max(0, Math.floor((SESSION_DURATION_MS - elapsedMs) / 1000));
        if (remainingSecs !== this._lastDisplayedSecond) {
            this._lastDisplayedSecond = remainingSecs;
            if (this.timerLabel) this.timerLabel.string = `${remainingSecs}`;
            this._updateTimerUrgency(remainingSecs);  // JUICE-04: timer urgency escalation
        }
    }
}
