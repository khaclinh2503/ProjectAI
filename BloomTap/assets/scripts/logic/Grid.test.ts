import { describe, it, expect } from 'vitest';
import { Grid, Cell } from './Grid';
import { FlowerFSM } from './FlowerFSM';
import { FlowerTypeId, FLOWER_CONFIGS } from './FlowerTypes';
import { FlowerState } from './FlowerState';

const cherryConfig = FLOWER_CONFIGS[FlowerTypeId.CHERRY];

describe('Grid creation', () => {
    it('new Grid() creates exactly 64 cells', () => {
        const grid = new Grid();
        expect(grid.getCells().length).toBe(64);
    });

    it('cells[0]: index=0, row=0, col=0, flower=null', () => {
        const grid = new Grid();
        const cell = grid.getCells()[0];
        expect(cell.index).toBe(0);
        expect(cell.row).toBe(0);
        expect(cell.col).toBe(0);
        expect(cell.flower).toBeNull();
    });

    it('cells[63]: index=63, row=7, col=7, flower=null', () => {
        const grid = new Grid();
        const cell = grid.getCells()[63];
        expect(cell.index).toBe(63);
        expect(cell.row).toBe(7);
        expect(cell.col).toBe(7);
        expect(cell.flower).toBeNull();
    });

    it('getCells() returns readonly array of 64 items', () => {
        const grid = new Grid();
        const cells = grid.getCells();
        expect(cells.length).toBe(64);
    });
});

describe('Grid.getCell()', () => {
    it('getCell(3, 5) returns cell at index 29', () => {
        const grid = new Grid();
        const cell = grid.getCell(3, 5);
        expect(cell.index).toBe(29); // 3*8+5 = 29
        expect(cell.row).toBe(3);
        expect(cell.col).toBe(5);
    });
});

describe('Grid.getRandomEmptyCell()', () => {
    it('returns a Cell on fresh grid (not null)', () => {
        const grid = new Grid();
        const cell = grid.getRandomEmptyCell();
        expect(cell).not.toBeNull();
    });

    it('returns null when all cells have a flower', () => {
        const grid = new Grid();
        // Fill all 64 cells
        for (const cell of grid.getCells()) {
            grid.spawnFlower(cell, cherryConfig, 0);
        }
        expect(grid.getRandomEmptyCell()).toBeNull();
    });
});

describe('Grid.spawnFlower()', () => {
    it('sets cell.flower to a FlowerFSM instance and returns it', () => {
        const grid = new Grid();
        const cell = grid.getCells()[0];
        const fsm = grid.spawnFlower(cell, cherryConfig, 0);
        expect(fsm).toBeInstanceOf(FlowerFSM);
        expect(cell.flower).toBe(fsm);
    });

    it('after spawnFlower, that cell is no longer returned by getRandomEmptyCell', () => {
        const grid = new Grid();
        // Fill all cells except index 5
        const cells = grid.getCells();
        for (let i = 0; i < cells.length; i++) {
            if (i !== 5) {
                grid.spawnFlower(cells[i], cherryConfig, 0);
            }
        }
        // Now only cell[5] is empty
        const empty = grid.getRandomEmptyCell();
        expect(empty).not.toBeNull();
        expect(empty!.index).toBe(5);
    });
});

describe('Grid.clearCell()', () => {
    it('clearCell sets cell.flower = null', () => {
        const grid = new Grid();
        const cell = grid.getCells()[0];
        grid.spawnFlower(cell, cherryConfig, 0);
        expect(cell.flower).not.toBeNull();
        grid.clearCell(cell);
        expect(cell.flower).toBeNull();
    });

    it('after clearCell, cell is again eligible for getRandomEmptyCell', () => {
        const grid = new Grid();
        const cells = grid.getCells();
        // Fill all cells
        for (const cell of cells) {
            grid.spawnFlower(cell, cherryConfig, 0);
        }
        // Clear one cell
        grid.clearCell(cells[10]);
        const empty = grid.getRandomEmptyCell();
        expect(empty).not.toBeNull();
        expect(empty!.index).toBe(10);
    });
});

describe('Grid.clearAll()', () => {
    it('sets all 64 cells to flower=null on a full grid', () => {
        const grid = new Grid();
        const cells = grid.getCells();
        // Fill all 64 cells
        for (const cell of cells) {
            grid.spawnFlower(cell, cherryConfig, 0);
        }
        // Verify grid is full
        expect(grid.getRandomEmptyCell()).toBeNull();
        grid.clearAll();
        for (const cell of cells) {
            expect(cell.flower).toBeNull();
        }
    });

    it('after clearAll(), getRandomEmptyCell() returns non-null', () => {
        const grid = new Grid();
        // Fill all cells
        for (const cell of grid.getCells()) {
            grid.spawnFlower(cell, cherryConfig, 0);
        }
        grid.clearAll();
        expect(grid.getRandomEmptyCell()).not.toBeNull();
    });
});

describe('Grid.getAliveCount()', () => {
    it('returns count of cells with non-null, non-DEAD flowers', () => {
        const grid = new Grid();
        const cells = grid.getCells();

        // Spawn 3 flowers at t=0
        grid.spawnFlower(cells[0], cherryConfig, 0);
        grid.spawnFlower(cells[1], cherryConfig, 0);
        grid.spawnFlower(cells[2], cherryConfig, 0);

        // At nowMs=0, all are in BUD state (not DEAD) — alive count = 3
        expect(grid.getAliveCount(0)).toBe(3);
    });

    it('does not count DEAD flowers', () => {
        const grid = new Grid();
        const cells = grid.getCells();

        // CHERRY cycle: BUD(1350) + TAP(900) + WILT(450) + DEAD(300) = 3000ms
        // After 3000ms, all states past DEAD boundary
        grid.spawnFlower(cells[0], cherryConfig, 0);
        grid.spawnFlower(cells[1], cherryConfig, 0);

        // Both flowers are DEAD at t=3000ms (elapsed >= budMs + tapWindowMs + wiltingMs)
        expect(grid.getAliveCount(3000)).toBe(0);
    });
});
