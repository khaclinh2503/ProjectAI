import { _decorator, Component, Node, Graphics, Color, UITransform, tween, Tween, Vec3, Vec2, Label, UIOpacity, Sprite, SpriteFrame, Texture2D, resources } from 'cc';
import { Grid, Cell } from './logic/Grid';
import { FlowerState } from './logic/FlowerState';
import { FlowerTypeId } from './logic/FlowerTypes';
import { WRONG_FLASH_COLOR } from './FlowerColors';
import { getFloatLabelString, getFloatFontSize, getFloatDuration } from './logic/JuiceHelpers';

import type { GameController } from './GameController';

const { ccclass } = _decorator;

const WRONG_TAP_DISPLAY_PENALTY = -10;

// ---------------------------------------------------------------------------
// Grid layout constants
// ---------------------------------------------------------------------------
const GRID_COLS = 8;
const GRID_ROWS = 8;
const CELL_GAP  = 4;
const CELL_SIZE = Math.floor((576 - 7 * CELL_GAP) / GRID_COLS); // 68px
const CELL_RADIUS = 6;

// ---------------------------------------------------------------------------
// Sprite-based state appearance
// Scale: represents growth stage (0.3 = bud, 1.0 = full bloom)
// Opacity: represents vitality (255 = healthy, fade = wilting/dead)
// ---------------------------------------------------------------------------
const STATE_SCALE: Record<FlowerState, number> = {
    [FlowerState.BUD]:        0.3,
    [FlowerState.BLOOMING]:   0.6,
    [FlowerState.FULL_BLOOM]: 1.0,
    [FlowerState.WILTING]:    0.85,
    [FlowerState.DEAD]:       0.5,
    [FlowerState.COLLECTED]:  1.0,
};

const STATE_OPACITY: Record<FlowerState, number> = {
    [FlowerState.BUD]:        255,
    [FlowerState.BLOOMING]:   255,
    [FlowerState.FULL_BLOOM]: 255,
    [FlowerState.WILTING]:    130,
    [FlowerState.DEAD]:       50,
    [FlowerState.COLLECTED]:  255,
};

const FLOWER_RESOURCE_NAMES: Record<FlowerTypeId, string> = {
    [FlowerTypeId.CHERRY]:        'cherry',
    [FlowerTypeId.LOTUS]:         'lotus',
    [FlowerTypeId.CHRYSANTHEMUM]: 'chrysanthemum',
    [FlowerTypeId.ROSE]:          'rose',
    [FlowerTypeId.SUNFLOWER]:     'sunflower',
};


// ---------------------------------------------------------------------------
// CellView — per-cell runtime state
// ---------------------------------------------------------------------------
interface CellView {
    node: Node;
    bgSprite: Sprite;
    flowerNode: Node;
    flowerSprite: Sprite;
    flowerOpacity: UIOpacity;
    flashGraphics: Graphics;
    row: number;
    col: number;
    typeId: FlowerTypeId | null;
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

@ccclass('GridRenderer')
export class GridRenderer extends Component {
    private _cellViews: CellView[] = [];
    private _grid: Grid | null = null;
    private _controller: GameController | null = null;
    private _inputEnabled: boolean = false;
    private _floatPool: FloatSlot[] = [];
    private _frozenNowMs: number | null = null;
    private _spriteFrames: Partial<Record<FlowerTypeId, SpriteFrame>> = {};
    // Dirty tracking — only repaint on state change
    private _lastState: (FlowerState | null)[] = new Array(64).fill(null);
    private _dirty: boolean[] = new Array(64).fill(false);

    init(grid: Grid, controller: GameController): void {
        this._grid = grid;
        this._controller = controller;
    }

    setInputEnabled(enabled: boolean): void {
        this._inputEnabled = enabled;
    }

    freezeAt(nowMs: number | null): void {
        this._frozenNowMs = nowMs;
    }

    onLoad(): void {
        this._buildCellViews();
        this._buildFloatPool();
        this._loadSprites();
    }

    // -----------------------------------------------------------------------
    // Sprite loading
    // -----------------------------------------------------------------------

    private _loadSprites(): void {
        // Background tile
        this._loadAsSpriteFrame('flowers/cell_empty', sf => {
            for (const view of this._cellViews) {
                view.bgSprite.spriteFrame = sf;
            }
        });

        // Flower sprites
        for (const typeId of Object.values(FlowerTypeId)) {
            const name = FLOWER_RESOURCE_NAMES[typeId];
            this._loadAsSpriteFrame(`flowers/${name}`, sf => {
                this._spriteFrames[typeId] = sf;
                // Invalidate all cells of this type so they repaint with the new sprite
                for (let i = 0; i < 64; i++) {
                    if (this._cellViews[i].typeId === typeId) {
                        this._dirty[i] = true;
                    }
                }
            });
        }
    }

    /** Load a PNG from resources as a SpriteFrame via Texture2D. */
    private _loadAsSpriteFrame(path: string, onLoaded: (sf: SpriteFrame) => void): void {
        resources.load(path, Texture2D, (err, tex) => {
            if (err) { console.warn(`Sprite not found: ${path}`); return; }
            const sf = new SpriteFrame();
            sf.texture = tex;
            onLoaded(sf);
        });
    }

    // -----------------------------------------------------------------------
    // Cell view construction
    // -----------------------------------------------------------------------

    private _buildCellViews(): void {
        const halfGrid = (GRID_COLS * CELL_SIZE + (GRID_COLS - 1) * CELL_GAP) / 2;

        for (let i = 0; i < 64; i++) {
            const row = Math.floor(i / GRID_COLS);
            const col = i % GRID_COLS;

            // Container node — UITransform provides touch hitbox
            const cellNode = new Node(`cell_${row}_${col}`);
            cellNode.layer = this.node.layer;
            const uiT = cellNode.addComponent(UITransform);
            uiT.setContentSize(CELL_SIZE, CELL_SIZE);

            const x = col * (CELL_SIZE + CELL_GAP) - halfGrid + CELL_SIZE / 2;
            const y = -(row * (CELL_SIZE + CELL_GAP) - halfGrid + CELL_SIZE / 2);
            cellNode.setPosition(x, y, 0);
            this.node.addChild(cellNode);

            // --- Layer 1: background sprite (cell_empty.png) ---
            const bgNode = new Node('bg');
            bgNode.layer = cellNode.layer;
            bgNode.addComponent(UITransform).setContentSize(CELL_SIZE, CELL_SIZE);
            const bgSprite = bgNode.addComponent(Sprite);
            bgSprite.sizeMode = Sprite.SizeMode.CUSTOM;
            cellNode.addChild(bgNode);

            // --- Layer 2: flower sprite ---
            const flowerNode = new Node('flower');
            flowerNode.layer = cellNode.layer;
            flowerNode.addComponent(UITransform).setContentSize(CELL_SIZE, CELL_SIZE);
            const flowerSprite = flowerNode.addComponent(Sprite);
            flowerSprite.sizeMode = Sprite.SizeMode.CUSTOM;
            const flowerOpacity = flowerNode.addComponent(UIOpacity);
            flowerOpacity.opacity = 0;
            cellNode.addChild(flowerNode);

            // --- Layer 3: flash overlay (Graphics, normally transparent) ---
            const flashNode = new Node('flash');
            flashNode.layer = cellNode.layer;
            flashNode.addComponent(UITransform).setContentSize(CELL_SIZE, CELL_SIZE);
            const flashGraphics = flashNode.addComponent(Graphics);
            cellNode.addChild(flashNode);

            const view: CellView = {
                node: cellNode,
                bgSprite,
                flowerNode,
                flowerSprite,
                flowerOpacity,
                flashGraphics,
                row, col,
                typeId: null,
                isFlashing: false,
            };
            this._cellViews.push(view);
            this._registerCellTouch(view);
        }
    }

    /** Pre-create 8 score float label nodes parented to Canvas. */
    private _buildFloatPool(): void {
        const canvasNode = this.node.parent ?? this.node;
        for (let i = 0; i < 8; i++) {
            const n = new Node(`scoreFloat_${i}`);
            n.layer = this.node.layer;
            const uiT = n.addComponent(UITransform);
            uiT.setContentSize(160, 50);
            uiT.anchorPoint = new Vec2(0.5, 0.5);
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

    private _registerCellTouch(view: CellView): void {
        view.node.on(Node.EventType.TOUCH_START, () => {
            this._onCellTapped(view);
        }, this);
    }

    private _onCellTapped(view: CellView): void {
        if (!this._inputEnabled) {
            // When paused, any tap on the grid should resume the session
            this._controller?.onScreenTapped();
            return;
        }
        if (view.isFlashing) return;
        if (!this._grid || !this._controller) return;

        const nowMs = performance.now();
        const cell = this._grid.getCell(view.row, view.col);
        if (!cell.flower) {
            this._controller.handleWrongTap();
            this.paintFlash(view.row, view.col, WRONG_FLASH_COLOR, 0.15);
            this.playTapPulse(view.row, view.col, false);
            this.spawnScoreFloat(view.row, view.col, WRONG_TAP_DISPLAY_PENALTY, 1);
            return;
        }

        const state = cell.flower.getState(nowMs);

        if (state === FlowerState.BLOOMING || state === FlowerState.FULL_BLOOM) {
            const { flashColor, rawScore, multiplier, isFullBloom } =
                this._controller.handleCorrectTap(cell, cell.flower, nowMs);
            this.paintFlashAndClear(view.row, view.col, flashColor, cell, 0.30);
            this.playTapPulse(view.row, view.col, isFullBloom);
            this.spawnScoreFloat(view.row, view.col, rawScore, multiplier);
        } else if (
            state === FlowerState.BUD     ||
            state === FlowerState.WILTING ||
            state === FlowerState.DEAD
        ) {
            this._controller.handleWrongTap();
            this.paintFlash(view.row, view.col, WRONG_FLASH_COLOR, 0.15);
            this.playTapPulse(view.row, view.col, false);
            this.spawnScoreFloat(view.row, view.col, WRONG_TAP_DISPLAY_PENALTY, 1);
        }
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    setCellTypeId(row: number, col: number, typeId: FlowerTypeId): void {
        this._cellViews[row * GRID_COLS + col].typeId = typeId;
    }

    getCellView(row: number, col: number): CellView {
        return this._cellViews[row * GRID_COLS + col];
    }

    public playTapPulse(row: number, col: number, isFullBloom: boolean): void {
        const view = this._cellViews[row * GRID_COLS + col];
        const cellNode = view.node;
        const halfDuration = isFullBloom ? 0.06 : 0.04;

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
            [row - 1, col], [row + 1, col],
            [row, col - 1], [row, col + 1],
        ];
        for (const [r, c] of neighbors) {
            if (r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS) continue;
            const neighborNode = this._cellViews[r * GRID_COLS + c].node;
            tween(neighborNode)
                .delay(0.03)
                .to(0.06, { scale: new Vec3(1.07, 1.07, 1) }, { easing: 'cubicOut' })
                .to(0.06, { scale: new Vec3(1.0,  1.0,  1) }, { easing: 'cubicIn' })
                .start();
        }
    }

    public spawnScoreFloat(row: number, col: number, amount: number, multiplier: number): void {
        const slot = this._floatPool.find(s => !s.inUse);
        if (!slot) return;

        const cellNode = this._cellViews[row * GRID_COLS + col].node;
        const worldPos = cellNode.worldPosition;

        slot.inUse = true;
        slot.node.active = true;

        Tween.stopAllByTarget(slot.node);
        Tween.stopAllByTarget(slot.opacity);

        slot.node.setWorldPosition(worldPos.x, worldPos.y, 0);
        slot.opacity.opacity = 255;

        slot.label.string = getFloatLabelString(amount);
        const isWrong = amount < 0;
        slot.label.color = isWrong
            ? new Color(220, 60, 60, 255)
            : new Color(255, 255, 255, 255);
        slot.label.fontSize = getFloatFontSize(Math.max(amount, 0));

        const duration = getFloatDuration(multiplier);
        const riseY = 80 + multiplier * 10;
        const wobbleX = 14;

        tween(slot.node)
            .by(duration / 3, { position: new Vec3( wobbleX,  riseY / 3, 0) }, { easing: 'sineOut' })
            .by(duration / 3, { position: new Vec3(-wobbleX * 2, riseY / 3, 0) })
            .by(duration / 3, { position: new Vec3( wobbleX,  riseY / 3, 0) })
            .start();

        tween(slot.opacity)
            .delay(duration * 0.5)
            .to(duration * 0.5, { opacity: 0 })
            .call(() => {
                slot.node.active = false;
                slot.inUse = false;
            })
            .start();
    }

    public stopAllFloatAnimations(): void {
        for (const slot of this._floatPool) {
            Tween.stopAllByTarget(slot.node);
            Tween.stopAllByTarget(slot.opacity);
            slot.node.active = false;
            slot.inUse = false;
        }
    }

    paintFlash(row: number, col: number, flashColor: Color, durationS: number): void {
        const view = this._cellViews[row * GRID_COLS + col];
        if (view.isFlashing) return;
        view.isFlashing = true;
        this._paintCellColor(view, flashColor);
        this.scheduleOnce(() => {
            view.isFlashing = false;
            this._dirty[row * GRID_COLS + col] = true;
        }, durationS);
    }

    paintFlashAndClear(row: number, col: number, flashColor: Color, cell: Cell, durationS: number): void {
        const view = this._cellViews[row * GRID_COLS + col];
        if (view.isFlashing) return;
        view.isFlashing = true;
        this._paintCellColor(view, flashColor);
        this.scheduleOnce(() => {
            this._grid!.clearCell(cell);
            view.typeId = null;
            view.isFlashing = false;
            this._dirty[row * GRID_COLS + col] = true;
        }, durationS);
    }

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
            if (view.isFlashing) continue;

            const cell = cells[i];
            if (!cell.flower) {
                if (view.typeId !== null) {
                    view.typeId = null;
                }
                if (this._dirty[i] || this._lastState[i] !== null) {
                    this._paintEmpty(view);
                    this._lastState[i] = null;
                    this._dirty[i] = false;
                }
            } else {
                const state = cell.flower.getState(nowMs);
                if (state === FlowerState.COLLECTED) continue;
                if (state === FlowerState.DEAD) {
                    this._grid.clearCell(cell);
                    view.typeId = null;
                    this._paintEmpty(view);
                    this._lastState[i] = null;
                    this._dirty[i] = false;
                    continue;
                }
                if (this._dirty[i] || state !== this._lastState[i]) {
                    this._paintState(view, state);
                    this._lastState[i] = state;
                    this._dirty[i] = false;
                }
            }
        }
    }

    // -----------------------------------------------------------------------
    // Painting helpers
    // -----------------------------------------------------------------------

    private _paintEmpty(view: CellView): void {
        view.flowerOpacity.opacity = 0;
        view.flashGraphics.clear();
    }

    private _paintState(view: CellView, state: FlowerState): void {
        const sf = view.typeId ? this._spriteFrames[view.typeId] : undefined;
        if (sf) {
            view.flowerSprite.spriteFrame = sf;
            view.flowerNode.setScale(STATE_SCALE[state], STATE_SCALE[state], 1);
            view.flowerOpacity.opacity = STATE_OPACITY[state];
        }
        // If sprite not yet loaded, cell stays visually empty until next dirty repaint
        view.flashGraphics.clear();
    }

    private _paintCellColor(view: CellView, color: Color): void {
        const g = view.flashGraphics;
        g.clear();
        g.fillColor = color;
        g.roundRect(-CELL_SIZE / 2, -CELL_SIZE / 2, CELL_SIZE, CELL_SIZE, CELL_RADIUS);
        g.fill();
    }
}
