import { _decorator, Component, Node, Graphics, Color, UITransform, tween, Tween, Vec3, Vec2, Label, UIOpacity } from 'cc';
import { Grid, Cell } from './logic/Grid';
import { FlowerState } from './logic/FlowerState';
import { FlowerTypeId } from './logic/FlowerTypes';
import { WRONG_FLASH_COLOR } from './FlowerColors';
import { getFloatLabelString, getFloatFontSize, getFloatDuration } from './logic/JuiceHelpers';

// Forward-declare to avoid circular: GameController imports GridRenderer,
// GridRenderer imports GameController only for the type (erased at runtime).
// Cocos resolves these at scene-load — the actual reference comes through init().
import type { GameController } from './GameController';

const { ccclass } = _decorator;

// Matches GameState.WRONG_TAP_PENALTY — display value for wrong/empty tap floats.
// Do NOT import GameState here (violates pure-logic tier separation).
const WRONG_TAP_DISPLAY_PENALTY = -10; // matches GameState.WRONG_TAP_PENALTY = 10

// ---------------------------------------------------------------------------
// Grid layout constants
// Design resolution: 720px wide. Grid = 80% = 576px.
// CELL_SIZE = floor((576 - 7 * 4) / 8) = floor(548 / 8) = 68px
// ---------------------------------------------------------------------------
const GRID_COLS = 8;
const GRID_ROWS = 8;
const CELL_GAP  = 4;
const CELL_SIZE = Math.floor((576 - 7 * CELL_GAP) / GRID_COLS); // 68px
const CELL_RADIUS = 6;

// ---------------------------------------------------------------------------
// Color table — all pre-allocated at module load time (zero per-frame allocation).
// Each entry is a distinct Color object to avoid shared-reference pitfall.
// Lookup: FLOWER_COLORS[typeId][state]
// ---------------------------------------------------------------------------
const FLOWER_COLORS: Record<FlowerTypeId, Record<FlowerState, Color>> = {
    [FlowerTypeId.CHERRY]: {
        [FlowerState.BUD]:        new Color(107,  26,  26, 255), // #6B1A1A ~35% L
        [FlowerState.BLOOMING]:   new Color(204,  51,  51, 255), // #CC3333 ~65% L
        [FlowerState.FULL_BLOOM]: new Color(255,  68,  68, 255), // #FF4444 100%
        [FlowerState.WILTING]:    new Color(122,  85,  85, 255), // #7A5555 desat+dim
        [FlowerState.DEAD]:       new Color( 43,  14,  14, 255), // #2B0E0E ~20%
        [FlowerState.COLLECTED]:  new Color(255, 220,  60, 255), // handled via flash
    },
    [FlowerTypeId.LOTUS]: {
        [FlowerState.BUD]:        new Color(107,  26,  77, 255), // #6B1A4D
        [FlowerState.BLOOMING]:   new Color(204,  51, 153, 255), // #CC3399
        [FlowerState.FULL_BLOOM]: new Color(255,  68, 204, 255), // #FF44CC
        [FlowerState.WILTING]:    new Color(122,  85, 112, 255), // #7A5570
        [FlowerState.DEAD]:       new Color( 43,  14,  31, 255), // #2B0E1F
        [FlowerState.COLLECTED]:  new Color(255, 220,  60, 255),
    },
    [FlowerTypeId.CHRYSANTHEMUM]: {
        [FlowerState.BUD]:        new Color(107,  74,  16, 255), // #6B4A10
        [FlowerState.BLOOMING]:   new Color(204, 140,  31, 255), // #CC8C1F
        [FlowerState.FULL_BLOOM]: new Color(255, 176,  46, 255), // #FFB02E
        [FlowerState.WILTING]:    new Color(122, 107,  85, 255), // #7A6B55
        [FlowerState.DEAD]:       new Color( 43,  32,  16, 255), // #2B2010
        [FlowerState.COLLECTED]:  new Color(255, 220,  60, 255),
    },
    [FlowerTypeId.ROSE]: {
        [FlowerState.BUD]:        new Color( 58,  26, 107, 255), // #3A1A6B
        [FlowerState.BLOOMING]:   new Color(112,  51, 204, 255), // #7033CC
        [FlowerState.FULL_BLOOM]: new Color(140,  68, 255, 255), // #8C44FF
        [FlowerState.WILTING]:    new Color( 90,  85, 122, 255), // #5A557A
        [FlowerState.DEAD]:       new Color( 24,  14,  43, 255), // #180E2B
        [FlowerState.COLLECTED]:  new Color(255, 220,  60, 255),
    },
    [FlowerTypeId.SUNFLOWER]: {
        [FlowerState.BUD]:        new Color(107,  96,  16, 255), // #6B6010
        [FlowerState.BLOOMING]:   new Color(204, 184,  31, 255), // #CCB81F
        [FlowerState.FULL_BLOOM]: new Color(255, 232,  46, 255), // #FFE82E
        [FlowerState.WILTING]:    new Color(122, 117,  85, 255), // #7A7555
        [FlowerState.DEAD]:       new Color( 43,  40,  14, 255), // #2B280E
        [FlowerState.COLLECTED]:  new Color(255, 220,  60, 255),
    },
};

// Shared constants — each is a distinct Color object.
const EMPTY_FILL   = new Color( 30,  30,  35, 255);
const EMPTY_STROKE = new Color( 60,  60,  70, 255);

// ---------------------------------------------------------------------------
// CellView — per-cell runtime state for the renderer.
// ---------------------------------------------------------------------------
interface CellView {
    node: Node;
    graphics: Graphics;
    row: number;
    col: number;
    typeId: FlowerTypeId | null;  // null when cell is empty
    isFlashing: boolean;
}

// ---------------------------------------------------------------------------
// FloatSlot — pool entry for score float labels
// ---------------------------------------------------------------------------
interface FloatSlot {
    node: Node;
    label: Label;
    opacity: UIOpacity;
    inUse: boolean;
}

// ---------------------------------------------------------------------------
// GridRenderer — Cocos Component
// Owns 64 pooled cell nodes (pre-created once in onLoad, never destroyed).
// Polls FlowerFSM state each frame via update() and repaints cell colors.
// Registers TOUCH_START on every cell node to route taps to GameController.
// ---------------------------------------------------------------------------
@ccclass('GridRenderer')
export class GridRenderer extends Component {
    private _cellViews: CellView[] = [];
    private _grid: Grid | null = null;
    private _controller: GameController | null = null;
    private _inputEnabled: boolean = false;
    private _floatPool: FloatSlot[] = [];
    private _frozenNowMs: number | null = null;

    // Dirty tracking — only repaint when state changes (avoids 192+ Graphics calls/frame)
    private _lastState: (FlowerState | null)[] = new Array(64).fill(null);
    private _dirty: boolean[] = new Array(64).fill(false);

    /**
     * Called by GameController.onLoad() after scene wiring is ready.
     * Stores references needed by the TOUCH_START handler.
     */
    init(grid: Grid, controller: GameController): void {
        this._grid = grid;
        this._controller = controller;
    }

    /**
     * Enable or disable tap input for all 64 cells.
     * Called by GameController when transitioning session phases.
     * Uses flag pattern (not listener add/remove) to avoid duplicate listener risk.
     */
    setInputEnabled(enabled: boolean): void {
        this._inputEnabled = enabled;
    }

    /** Freeze render timestamp during pause (pass null to resume live rendering). */
    freezeAt(nowMs: number | null): void {
        this._frozenNowMs = nowMs;
    }

    onLoad(): void {
        this._buildCellViews();
        this._buildFloatPool();
    }

    /** Pre-create all 64 cell nodes — NEVER create nodes after this point. */
    private _buildCellViews(): void {
        const halfGrid = (GRID_COLS * CELL_SIZE + (GRID_COLS - 1) * CELL_GAP) / 2;

        for (let i = 0; i < 64; i++) {
            const row = Math.floor(i / GRID_COLS);
            const col = i % GRID_COLS;

            const cellNode = new Node(`cell_${row}_${col}`);
            cellNode.layer = this.node.layer; // inherit UI layer so 2D camera renders it

            // Add UITransform first so touch hit-testing works (Pitfall 4 from RESEARCH.md:
            // UITransform required for per-node TOUCH_START to fire on the correct cell).
            const uiT = cellNode.addComponent(UITransform);
            uiT.setContentSize(CELL_SIZE, CELL_SIZE);

            const g = cellNode.addComponent(Graphics);

            // Position relative to this grid container node (centered)
            const x = col * (CELL_SIZE + CELL_GAP) - halfGrid + CELL_SIZE / 2;
            const y = -(row * (CELL_SIZE + CELL_GAP) - halfGrid + CELL_SIZE / 2);
            cellNode.setPosition(x, y, 0);

            this.node.addChild(cellNode);

            const view: CellView = { node: cellNode, graphics: g, row, col, typeId: null, isFlashing: false };
            this._cellViews.push(view);

            // Paint initial empty state
            this._paintEmpty(view);

            // Register TOUCH_START for tap input (plan 03-02)
            this._registerCellTouch(view);
        }
    }

    /** Pre-create 8 score float label nodes parented to Canvas — NEVER create during gameplay. */
    private _buildFloatPool(): void {
        // GridRenderer component is on GridContainer; GridContainer.parent is Canvas
        const canvasNode = this.node.parent ?? this.node;
        for (let i = 0; i < 8; i++) {
            const n = new Node(`scoreFloat_${i}`);
            n.layer = this.node.layer;
            const uiT = n.addComponent(UITransform);
            uiT.setContentSize(160, 50);
            uiT.anchorPoint = new Vec2(0.5, 0.5); // center anchor — prevents off-center scale during multiplier pulse
            const lbl = n.addComponent(Label);
            lbl.fontSize = 24;
            lbl.isBold = true;
            lbl.horizontalAlign = Label.HorizontalAlign.CENTER;
            lbl.verticalAlign = Label.VerticalAlign.CENTER;
            const uiOp = n.addComponent(UIOpacity);
            uiOp.opacity = 0;
            n.active = false;
            canvasNode.addChild(n);
            this._floatPool.push({ node: n, label: lbl, opacity: uiOp, inUse: false });
        }
    }

    // -----------------------------------------------------------------------
    // Touch input handlers
    // -----------------------------------------------------------------------

    /**
     * Register TOUCH_START on a single cell node.
     * Using per-node registration (not canvas) ensures correct cell identity
     * without coordinate math, and UITransform provides hit-testing bounds.
     */
    private _registerCellTouch(view: CellView): void {
        view.node.on(Node.EventType.TOUCH_START, () => {
            this._onCellTapped(view);
        }, this);
    }

    /**
     * Handle a TOUCH_START on a cell.
     *
     * Guard order (critical for correctness):
     *   1. isFlashing guard — prevents double-flash and NaN score (Pitfall 2 + 6 from RESEARCH.md)
     *   2. Null guards — controller and grid must be wired before taps arrive
     *   3. Empty cell — silently ignore (cell.flower === null)
     *   4. Route by state:
     *      - BLOOMING or FULL_BLOOM → handleCorrectTap → paintFlashAndClear (300ms)
     *      - BUD, WILTING, DEAD    → handleWrongTap   → paintFlash (150ms red)
     *      - COLLECTED             → unreachable here (isFlashing guard at top catches it)
     */
    private _onCellTapped(view: CellView): void {
        if (!this._inputEnabled) {
            // When paused, any tap on the grid should resume the session
            this._controller?.onScreenTapped();
            return;
        }
        if (view.isFlashing) return;                          // guard: no double-flash
        if (!this._grid || !this._controller) return;        // guard: must be initialized

        const nowMs = performance.now();
        const cell = this._grid.getCell(view.row, view.col);
        if (!cell.flower) {
            // Empty cell — treat as wrong tap (penalty + combo reset, red flash)
            this._controller.handleWrongTap();
            this.paintFlash(view.row, view.col, WRONG_FLASH_COLOR, 0.15);

            // JUICE-01: wrong tap pulse (no ripple)
            this.playTapPulse(view.row, view.col, false);
            // JUICE-02: score float for empty tap penalty
            this.spawnScoreFloat(view.row, view.col, WRONG_TAP_DISPLAY_PENALTY, 1);
            return;
        }

        const state = cell.flower.getState(nowMs);

        if (state === FlowerState.BLOOMING || state === FlowerState.FULL_BLOOM) {
            // Correct tap: handleCorrectTap reads state+score BEFORE collect() internally
            const { flashColor, rawScore, multiplier, isFullBloom } =
                this._controller.handleCorrectTap(cell, cell.flower, nowMs);
            this.paintFlashAndClear(view.row, view.col, flashColor, cell, 0.30); // 300ms per CONTEXT.md

            // JUICE-01: tap pulse
            this.playTapPulse(view.row, view.col, isFullBloom);

            // JUICE-02: score float
            this.spawnScoreFloat(view.row, view.col, rawScore, multiplier);
        } else if (
            state === FlowerState.BUD     ||
            state === FlowerState.WILTING ||
            state === FlowerState.DEAD
        ) {
            // Wrong tap: penalty + combo reset, red flash 150ms
            this._controller.handleWrongTap();
            this.paintFlash(view.row, view.col, WRONG_FLASH_COLOR, 0.15); // 150ms per CONTEXT.md

            // JUICE-01: wrong tap also gets pulse (80ms, no ripple — CONTEXT.md decision)
            this.playTapPulse(view.row, view.col, false);

            // JUICE-02: score float for wrong tap penalty
            this.spawnScoreFloat(view.row, view.col, WRONG_TAP_DISPLAY_PENALTY, 1);
        }
        // COLLECTED: flower.collect() was called → isFlashing was set true simultaneously
        //            → the isFlashing guard at top prevents reaching this branch.
    }

    // -----------------------------------------------------------------------
    // Public API (called by GameController)
    // -----------------------------------------------------------------------

    /**
     * Called by GameController after each spawnFlower() so the renderer
     * knows which color table row to use for this cell.
     */
    setCellTypeId(row: number, col: number, typeId: FlowerTypeId): void {
        this._cellViews[row * GRID_COLS + col].typeId = typeId;
    }

    /** Returns CellView for (row, col) — used by tap handlers and tests. */
    getCellView(row: number, col: number): CellView {
        return this._cellViews[row * GRID_COLS + col];
    }

    /**
     * Play a scale pulse on the tapped cell (JUICE-01).
     * FULL_BLOOM: 120ms pulse + ripple to 4 orthogonal neighbors.
     * Normal:     80ms pulse.
     */
    public playTapPulse(row: number, col: number, isFullBloom: boolean): void {
        const view = this._cellViews[row * GRID_COLS + col];
        const cellNode = view.node;
        const halfDuration = isFullBloom ? 0.06 : 0.04; // 120ms or 80ms total

        // Stop any in-flight pulse — prevents scale jitter on fast tap
        Tween.stopAllByTarget(cellNode);

        tween(cellNode)
            .to(halfDuration, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'cubicOut' })
            .to(halfDuration, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'cubicIn' })
            .start();

        if (isFullBloom) {
            this._rippleNeighbors(row, col);
        }
    }

    private _rippleNeighbors(row: number, col: number): void {
        const neighbors: [number, number][] = [
            [row - 1, col],
            [row + 1, col],
            [row, col - 1],
            [row, col + 1],
        ];
        for (const [r, c] of neighbors) {
            if (r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS) continue;
            const neighborNode = this._cellViews[r * GRID_COLS + c].node;
            // Neighbor ripple: lighter scale (1.07x), 30ms delay for wave feel
            tween(neighborNode)
                .delay(0.03)
                .to(0.06, { scale: new Vec3(1.07, 1.07, 1) }, { easing: 'cubicOut' })
                .to(0.06, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'cubicIn' })
                .start();
        }
    }

    /**
     * Spawn a score float label from pool (JUICE-02).
     * Label rises with zigzag wobble and fades out.
     */
    public spawnScoreFloat(row: number, col: number, amount: number, multiplier: number): void {
        const slot = this._floatPool.find(s => !s.inUse);
        if (!slot) return; // pool exhausted — skip silently

        // Position at cell world position
        const cellNode = this._cellViews[row * GRID_COLS + col].node;
        const worldPos = cellNode.worldPosition;

        slot.inUse = true;
        slot.node.active = true;

        // Stop any in-flight tweens before resetting values — prevents a running
        // opacity tween from overwriting the opacity=255 reset we're about to apply.
        Tween.stopAllByTarget(slot.node);
        Tween.stopAllByTarget(slot.opacity);

        slot.node.setWorldPosition(worldPos.x, worldPos.y, 0);

        // Reset opacity — must come AFTER stopAllByTarget so no in-flight tween overwrites it.
        slot.opacity.opacity = 255;

        // Text content
        slot.label.string = getFloatLabelString(amount);
        const isWrong = amount < 0;
        slot.label.color = isWrong
            ? new Color(220, 60, 60, 255)    // red for wrong tap
            : new Color(255, 255, 255, 255); // white for correct tap

        // Font size: based on raw score (flower type + tap timing), wrong taps → base size
        slot.label.fontSize = getFloatFontSize(Math.max(amount, 0));

        const duration = getFloatDuration(multiplier);
        const riseY = 80 + multiplier * 10;
        const wobbleX = 14;

        // Position animation: zigzag wobble while rising
        tween(slot.node)
            .by(duration / 3, { position: new Vec3( wobbleX,  riseY / 3, 0) }, { easing: 'sineOut' })
            .by(duration / 3, { position: new Vec3(-wobbleX * 2, riseY / 3, 0) })
            .by(duration / 3, { position: new Vec3( wobbleX,  riseY / 3, 0) })
            .start();

        // Fade: hold fully opaque for first half, then fade out
        tween(slot.opacity)
            .delay(duration * 0.5)
            .to(duration * 0.5, { opacity: 0 })
            .call(() => {
                slot.node.active = false;
                slot.inUse = false;
            })
            .start();
    }

    /**
     * Stop all float animations and return all slots to pool.
     * Called by GameController._stopAllJuiceAnimations() on session reset/game over.
     */
    public stopAllFloatAnimations(): void {
        for (const slot of this._floatPool) {
            Tween.stopAllByTarget(slot.node);
            Tween.stopAllByTarget(slot.opacity);
            slot.node.active = false;
            slot.inUse = false;
        }
    }

    /**
     * Flash a cell with flashColor for durationS seconds, then let update()
     * repaint from FSM state. Used for wrong-tap feedback (150ms red).
     * Guards against re-tap during flash (Pitfall 2).
     */
    paintFlash(row: number, col: number, flashColor: Color, durationS: number): void {
        const view = this._cellViews[row * GRID_COLS + col];
        if (view.isFlashing) return;
        view.isFlashing = true;
        this._paintCellColor(view, flashColor);
        this.scheduleOnce(() => {
            view.isFlashing = false;
            this._dirty[row * GRID_COLS + col] = true; // force repaint on next frame
        }, durationS);
    }

    /**
     * Flash a cell with flashColor, then clear the flower from the grid.
     * Used for correct-tap feedback (300ms yellow/white → empty).
     */
    paintFlashAndClear(row: number, col: number, flashColor: Color, cell: Cell, durationS: number): void {
        const view = this._cellViews[row * GRID_COLS + col];
        if (view.isFlashing) return;
        view.isFlashing = true;
        this._paintCellColor(view, flashColor);
        this.scheduleOnce(() => {
            this._grid!.clearCell(cell);
            view.typeId = null;
            view.isFlashing = false;
            this._dirty[row * GRID_COLS + col] = true; // force repaint to empty on next frame
        }, durationS);
    }

    // -----------------------------------------------------------------------
    // Constants exposed for external use (e.g., plan 03-03 verification)
    // -----------------------------------------------------------------------
    static readonly WRONG_FLASH_DURATION_S   = 0.15;
    static readonly CORRECT_FLASH_DURATION_S = 0.30;

    // -----------------------------------------------------------------------
    // update() — per-frame FSM state poll
    // -----------------------------------------------------------------------
    update(_dt: number): void {
        if (!this._grid) return;
        const nowMs = this._frozenNowMs ?? performance.now();
        const cells = this._grid.getCells();

        for (let i = 0; i < 64; i++) {
            const view = this._cellViews[i];
            if (view.isFlashing) continue;  // flash timer owns this cell

            const cell = cells[i];
            if (!cell.flower) {
                if (view.typeId !== null) {
                    view.typeId = null;
                }
                // Only repaint empty if state changed or dirty flag set
                if (this._dirty[i] || this._lastState[i] !== null) {
                    this._paintEmpty(view);
                    this._lastState[i] = null;
                    this._dirty[i] = false;
                }
            } else {
                const state = cell.flower.getState(nowMs);
                if (state === FlowerState.COLLECTED) {
                    continue;
                }
                if (state === FlowerState.DEAD) {
                    this._grid.clearCell(cell);
                    view.typeId = null;
                    this._paintEmpty(view);
                    this._lastState[i] = null;
                    this._dirty[i] = false;
                    continue;
                }
                // Only repaint when state changed or dirty flag set
                if (this._dirty[i] || state !== this._lastState[i]) {
                    this._paintState(view, state);
                    this._lastState[i] = state;
                    this._dirty[i] = false;
                }
            }
        }
    }

    // -----------------------------------------------------------------------
    // Private painting helpers
    // -----------------------------------------------------------------------

    private _paintEmpty(view: CellView): void {
        const g = view.graphics;
        g.clear();
        // Fill dark background
        g.fillColor = EMPTY_FILL;
        g.roundRect(-CELL_SIZE / 2, -CELL_SIZE / 2, CELL_SIZE, CELL_SIZE, CELL_RADIUS);
        g.fill();
        // Faint border stroke
        g.strokeColor = EMPTY_STROKE;
        g.lineWidth = 1;
        g.roundRect(-CELL_SIZE / 2, -CELL_SIZE / 2, CELL_SIZE, CELL_SIZE, CELL_RADIUS);
        g.stroke();
    }

    private _paintState(view: CellView, state: FlowerState): void {
        if (!view.typeId) return;
        const color = FLOWER_COLORS[view.typeId][state];
        this._paintCellColor(view, color);
    }

    private _paintCellColor(view: CellView, color: Color): void {
        const g = view.graphics;
        g.clear();
        g.fillColor = color;
        g.roundRect(-CELL_SIZE / 2, -CELL_SIZE / 2, CELL_SIZE, CELL_SIZE, CELL_RADIUS);
        g.fill();
    }
}
