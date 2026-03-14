import { FlowerFSM } from './FlowerFSM';
import { FlowerTypeConfig } from './FlowerTypes';
import { FlowerState } from './FlowerState';

export interface Cell {
    index: number;
    row: number;
    col: number;
    flower: FlowerFSM | null;
}

/**
 * 8x8 flat grid of 64 cells.
 * Owns all FlowerFSM instances. Renderer reads this but never mutates it.
 */
export class Grid {
    private readonly _cells: Cell[];

    constructor() {
        this._cells = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const index = row * 8 + col;
                this._cells.push({ index, row, col, flower: null });
            }
        }
    }

    /** Returns the cell at (row, col). */
    getCell(row: number, col: number): Cell {
        return this._cells[row * 8 + col];
    }

    /** Returns readonly view of all 64 cells. */
    getCells(): readonly Cell[] {
        return this._cells;
    }

    /**
     * Returns a random cell with flower===null, or null if all cells are occupied.
     */
    getRandomEmptyCell(): Cell | null {
        const empty = this._cells.filter(c => c.flower === null);
        if (empty.length === 0) return null;
        return empty[Math.floor(Math.random() * empty.length)];
    }

    /**
     * Creates a new FlowerFSM, assigns it to cell.flower, and returns it.
     */
    spawnFlower(cell: Cell, config: FlowerTypeConfig, nowMs: number): FlowerFSM {
        const fsm = new FlowerFSM(nowMs, config);
        cell.flower = fsm;
        return fsm;
    }

    /**
     * Removes the flower from the cell (sets flower to null).
     */
    clearCell(cell: Cell): void {
        cell.flower = null;
    }

    /**
     * Returns count of cells where flower is not null and not in DEAD state.
     * COLLECTED flowers are counted as alive (brief window before Phase 3 clears them).
     */
    getAliveCount(nowMs: number): number {
        return this._cells.filter(
            c => c.flower !== null && c.flower.getState(nowMs) !== FlowerState.DEAD
        ).length;
    }
}
