import { _decorator, Component, Node, Graphics, Color, UITransform } from 'cc';
import { Grid, Cell } from './logic/Grid';
import { FlowerState } from './logic/FlowerState';
import { FlowerTypeId } from './logic/FlowerTypes';

const { ccclass } = _decorator;

// ---------------------------------------------------------------------------
// Grid layout constants
// Design resolution: 720px wide. Grid = 80% = 576px.
// CELL_SIZE = floor((576 - 7 * 4) / 8) = floor(548 / 8) = 68px
// ---------------------------------------------------------------------------
const GRID_COLS = 8;
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
const EMPTY_FILL          = new Color( 30,  30,  35, 255);
const EMPTY_STROKE        = new Color( 60,  60,  70, 255);
const WRONG_FLASH_COLOR   = new Color(220,  50,  50, 255);
const CORRECT_FLASH_YELLOW = new Color(255, 220,  60, 255);
const CORRECT_FLASH_WHITE  = new Color(255, 255, 255, 255);

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
// GridRenderer — Cocos Component
// Owns 64 pooled cell nodes (pre-created once in onLoad, never destroyed).
// Polls FlowerFSM state each frame via update() and repaints cell colors.
// ---------------------------------------------------------------------------
@ccclass('GridRenderer')
export class GridRenderer extends Component {
    private _cellViews: CellView[] = [];
    private _grid: Grid | null = null;

    // Set by GameController.onLoad() after this component is ready
    init(grid: Grid, _controller: unknown): void {
        this._grid = grid;
    }

    onLoad(): void {
        this._buildCellViews();
    }

    /** Pre-create all 64 cell nodes — NEVER create nodes after this point. */
    private _buildCellViews(): void {
        const halfGrid = (GRID_COLS * CELL_SIZE + (GRID_COLS - 1) * CELL_GAP) / 2;

        for (let i = 0; i < 64; i++) {
            const row = Math.floor(i / GRID_COLS);
            const col = i % GRID_COLS;

            const cellNode = new Node(`cell_${row}_${col}`);

            // Add UITransform first so touch hit-testing works (Pitfall 4)
            const uiT = cellNode.addComponent(UITransform);
            uiT.setContentSize(CELL_SIZE, CELL_SIZE);

            const g = cellNode.addComponent(Graphics);

            // Position relative to this grid container node (centered)
            const x = col * (CELL_SIZE + CELL_GAP) - halfGrid + CELL_SIZE / 2;
            const y = -(row * (CELL_SIZE + CELL_GAP) - halfGrid + CELL_SIZE / 2);
            cellNode.setPosition(x, y, 0);

            this.node.addChild(cellNode);
            this._cellViews.push({ node: cellNode, graphics: g, row, col, typeId: null, isFlashing: false });

            // Paint initial empty state
            this._paintEmpty(this._cellViews[i]);
        }
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

    /** Returns CellView for (row, col) — used by tap handlers in plan 03-02. */
    getCellView(row: number, col: number): CellView {
        return this._cellViews[row * GRID_COLS + col];
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
            // update() repaints on next frame
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
        }, durationS);
    }

    // -----------------------------------------------------------------------
    // Constants exposed for tap handlers in plan 03-02
    // -----------------------------------------------------------------------
    static readonly WRONG_FLASH_COLOR    = WRONG_FLASH_COLOR;
    static readonly CORRECT_FLASH_YELLOW = CORRECT_FLASH_YELLOW;
    static readonly CORRECT_FLASH_WHITE  = CORRECT_FLASH_WHITE;
    static readonly WRONG_FLASH_DURATION_S   = 0.15;
    static readonly CORRECT_FLASH_DURATION_S = 0.30;

    // -----------------------------------------------------------------------
    // update() — per-frame FSM state poll
    // -----------------------------------------------------------------------
    update(_dt: number): void {
        if (!this._grid) return;
        const nowMs = performance.now();
        const cells = this._grid.getCells();

        for (let i = 0; i < 64; i++) {
            const view = this._cellViews[i];
            if (view.isFlashing) continue;  // flash timer owns this cell

            const cell = cells[i];
            if (!cell.flower) {
                if (view.typeId !== null) {
                    // Flower was cleared (DEAD auto-cleared or explicit clearCell call)
                    view.typeId = null;
                }
                this._paintEmpty(view);
            } else {
                const state = cell.flower.getState(nowMs);
                if (state === FlowerState.COLLECTED) {
                    // COLLECTED flash is managed by paintFlashAndClear() — skip until cleared
                    continue;
                }
                if (state === FlowerState.DEAD && view.typeId !== null) {
                    // Dead flowers should still show their dead color, not be auto-cleared here.
                    // GameController or InputHandler decides when to clearCell on DEAD flowers.
                    this._paintState(view, state);
                } else {
                    this._paintState(view, state);
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
