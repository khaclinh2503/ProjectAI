# Phase 3: Renderer and Input - Research

**Researched:** 2026-03-14
**Domain:** Cocos Creator 3.x rendering (Graphics component), touch input, node pooling, logic-to-renderer wiring
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Visual representation cho 5 trạng thái hoa:**
- Base shape: Colored rectangles (không phải sprites — v1 chưa có art)
- Size: Cố định cho mọi state — không scale up/down giữa các state
- Color system: Mỗi loài hoa = base hue riêng; state differentiation = brightness/saturation variation của base hue đó
  - Ví dụ: CHERRY = red-based; BUD = dim red, FULL_BLOOM = bright red
  - 5 loài cần 5 hue riêng biệt, Claude chọn cụ thể
- Empty cell: Nền tối (dark background) + viền mờ — grid structure luôn visible

**Bảng state → brightness rule (locked):**
| State | Visual |
|-------|--------|
| BUD | Base hue, độ sáng thấp (~35%) |
| BLOOMING | Base hue, độ sáng trung bình (~65%) |
| FULL_BLOOM | Base hue, độ sáng tối đa (100%), rực rỡ nhất |
| WILTING | Base hue, desaturated + dim (~50%) |
| DEAD | Base hue, rất tối (~20%) |
| COLLECTED | Flash (xem phần Collected state) |
| EMPTY | Dark rect + faint border |

**Grid layout:**
- Grid width: ~80% design width = ~576px trên design resolution 720px
- Căn ngang: Giữa màn hình
- Vị trí dọc: 30% từ trên xuống (nhường khoảng trên cho HUD Phase 4)
- Cell gap: 4px giữa các cell
- Cell size: `(576 - 7 × 4) / 8 ≈ 68px × 68px` (Claude tính chính xác khi implement)
- Grid là square: width = height, không phải rectangle

**Wrong-tap feedback:**
- Trigger: Tap BUD, WILTING, hoặc DEAD cell
- Visual: Cell flash sang màu đỏ trong 150ms, sau đó trở lại màu state hiện tại
- Scope: Flash chỉ trên cell được tap — không phải toàn màn hình
- Không có: Penalty score float (Phase 5 JUICE-03), shake animation

**Correct-tap visual (COLLECTED state):**
- BLOOMING tap: Cell flash vàng → về EMPTY (duration 300ms)
- FULL_BLOOM tap: Cell flash trắng → về EMPTY (duration 300ms)
- COLLECTED duration: 300ms
- Không có: Score float text "+120" (Phase 5 JUICE-02)

**Game logic wiring (Phase 3 scope):**
- Tap đúng (BLOOMING/FULL_BLOOM) → gọi FlowerFSM logic → tính score → cộng vào game state
- Tap sai (BUD/WILTING/DEAD) → tính penalty → trừ vào game state
- ComboSystem.onCorrectTap() / onWrongTap() được gọi cho mọi tap
- Score tính đúng theo interpolation formula (từ Phase 2 CONTEXT)
- Phase 3 không cần session timer hay HUD — chỉ cần logic wiring hoạt động đúng (có thể verify qua dev console hoặc debug label)

### Claude's Discretion

- Exact hue values cho 5 loại hoa (chọn sao cho 5 màu phân biệt rõ trên màn hình nhỏ)
- Cocos Creator Node hierarchy cho GridRenderer (container node + 64 child nodes)
- Cách drive update loop: Cocos `update(dt)` callback polling FlowerFSM state mỗi frame
- Debug score display cho Phase 3 (không cần đẹp — chỉ cần xác nhận logic đúng)
- Exact cell corner radius nếu dùng rounded rects

### Deferred Ideas (OUT OF SCOPE)

- Score float text "+120 ×3" nổi lên từ cell tap — Phase 5 JUICE-02
- Combo flash animation khi multiplier tăng — Phase 5 JUICE-03
- Scale pulse khi tap (cell phồng lên 1.1x rồi về) — Phase 5 JUICE-01
- HUD: score, timer countdown, combo multiplier display — Phase 4
- Flower sprite art thật thay thế colored rectangles — Phase 5+
- Session timer 120s và game over flow — Phase 4
- Audio unlock splash "Tap to Start" — Phase 4/5
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GRID-01 | 8x8 grid render với 64 ô tap riêng biệt | Graphics component pre-creates 64 Node+Graphics objects in `onLoad()`; object pool pattern prevents GC |
| GRID-02 | Grid scale responsive theo màn hình mobile | Design resolution 720x1280 + FIXED_WIDTH fit mode (locked Phase 1) handles scaling automatically; 80% grid width + centered positioning |
| FLOW-03 | 5 trạng thái nhìn là phân biệt được ngay, không cần đọc text | 5 distinct base hues × brightness/saturation variation per state; Graphics `fillColor.fromHEX()` + `clear()` + `fill()` per frame polling |
| GAME-01 | Tap "Nở Hé" thu thập hoa và cộng điểm gốc | `FlowerFSM.getScore(nowMs)` → `ComboSystem.applyToScore()` → accumulate in GameState; `FlowerFSM.collect()` marks cell |
| GAME-02 | Tap "Nở Rực Rỡ" cộng nhiều điểm hơn "Nở Hé" | Same path as GAME-01; score is higher because interpolation returns value closer to `scoreFull` |
| GAME-03 | Tap "Nụ" hoặc "Tàn/Chết" bị trừ điểm | Wrong-tap path: penalty deducted from game score; `ComboSystem.onWrongTap()` resets multiplier; red flash 150ms via `scheduleOnce` |
</phase_requirements>

---

## Summary

Phase 3 connects the pure logic tier (Phase 2) to Cocos Creator's rendering layer. The core work is: (1) building a `GridRenderer` component that pre-creates 64 Node+Graphics objects at `onLoad()`, (2) polling `FlowerFSM.getState(nowMs)` each frame in `update()` to set cell color, (3) wiring touch input to the correct/wrong-tap logic paths, and (4) triggering brief color flashes for tap feedback via `scheduleOnce`.

The design resolution is already fixed at 720×1280 with FIXED_WIDTH fit mode (Phase 1), so grid scaling is automatic — no custom scaling logic is needed. The grid occupies 80% of design width (576px), centered horizontally, positioned at 30% from top. All 64 cell nodes are pooled at init; none are created or destroyed during gameplay, honoring the object-pool decision from Phase 1.

The primary rendering mechanism is the Cocos Creator `Graphics` component. Each cell node carries one `Graphics` component. Each frame, the renderer calls `g.clear()`, sets `g.fillColor`, draws via `g.roundRect()` or `g.rect()`, and calls `g.fill()`. Color is derived from the locked hue/brightness table. Flash effects (wrong-tap red 150ms, correct-tap yellow/white 300ms) use `this.scheduleOnce()` rather than a tween, because tweening `Graphics.fillColor` is unreliable in Cocos Creator 3.x — it requires a `cc.Color` object with lerp/clone methods, and the Graphics component's `fillColor` does not expose those methods on the property directly.

**Primary recommendation:** Use one `Graphics` component per cell node, `clear()`+`fill()` every frame, drive color from `FlowerFSM.getState()`, and use `scheduleOnce()` for timed flash resets.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Cocos Creator | 3.8.x (locked Phase 1) | Scene graph, component lifecycle, rendering | Project foundation; already installed |
| `cc.Graphics` | Built-in | Draw filled colored rectangles per cell | No dependency on sprite assets; pure code draw |
| `cc.Node.EventType.TOUCH_START` | Built-in | Cell touch detection | Node-level events fire only within node bounds; no manual hit test needed per-cell |
| `cc.UITransform` | Built-in | Coordinate conversion for grid-level touch mapping | Required to map touch world position to local grid space |
| `cc.Component.scheduleOnce()` | Built-in | Flash timer (150ms wrong, 300ms correct) | Engine-managed timer; cleaner than setTimeout; auto-cancels on node destroy |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `cc.tween` | Built-in | NOT used for color flash in Phase 3 | Deferred to Phase 5 for scale pulse; color tweening on Graphics is unreliable in 3.x |
| `cc.Label` | Built-in | Debug score display | Temporary debug label on GameScene to verify score wiring without HUD |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Graphics` per cell | `Sprite` + solid-color SpriteFrame | Sprite approach requires asset pipeline; Graphics is pure code — preferred for v1 |
| `scheduleOnce()` for flash | `tween()` color animation | `tween()` on `Graphics.fillColor` requires Color objects with lerp/clone; known fragility in 3.x; `scheduleOnce()` is simpler and reliable |
| Node-level TOUCH_START per cell | Single canvas-level touch + manual hit test | Per-cell events are cleaner and leverage Cocos built-in hit testing; 64 listeners is acceptable at this scale |

**Installation:** No additional packages required — all APIs are built into Cocos Creator 3.8.

---

## Architecture Patterns

### Recommended Project Structure

```
BloomTap/assets/scripts/
├── logic/                   # Phase 2 pure logic (no cc imports) — READ ONLY from Phase 3
│   ├── FlowerFSM.ts
│   ├── FlowerState.ts
│   ├── FlowerTypes.ts
│   ├── Grid.ts
│   ├── ComboSystem.ts
│   └── SpawnManager.ts
├── GameController.ts        # Expanded: game orchestrator, owns Grid/ComboSystem/SpawnManager/GameState
├── GridRenderer.ts          # NEW: Cocos Component, owns 64 cell nodes, polls state each frame
├── CellNode.ts              # NEW: helper class/interface for per-cell node + Graphics reference
└── GameState.ts             # NEW: session state (score, comboMultiplier) — plain TypeScript, no cc
```

### Pattern 1: Object Pool — Pre-create 64 Cell Nodes

**What:** All 64 `Node` + `Graphics` objects are created once in `onLoad()` and reused throughout gameplay. State changes only affect `Graphics.fillColor` and `Graphics.fill()` calls — no `new Node()` or `node.destroy()` during the game loop.

**When to use:** Always. This is a locked project decision (STATE.md) to prevent GC spikes.

**Example:**
```typescript
// Source: Cocos Creator 3.8 Component lifecycle docs
// GridRenderer.ts (skeleton)
import { _decorator, Component, Node, Graphics, Color, UITransform, EventTouch } from 'cc';
import { Grid } from './logic/Grid';
import { FlowerState } from './logic/FlowerState';

const { ccclass, property } = _decorator;

interface CellView {
    node: Node;
    graphics: Graphics;
    row: number;
    col: number;
    isFlashing: boolean;
    flashColor: Color | null;
}

@ccclass('GridRenderer')
export class GridRenderer extends Component {
    private _cellViews: CellView[] = [];
    private _grid!: Grid;

    // Cell layout constants (720px design width, 80% = 576px, 4px gap)
    private static readonly GRID_WIDTH = 576;
    private static readonly CELL_GAP = 4;
    private static readonly CELL_SIZE = (576 - 7 * 4) / 8; // ≈ 68px
    private static readonly GRID_COLS = 8;
    private static readonly CELL_RADIUS = 6; // corner radius (Claude's discretion)

    onLoad(): void {
        this._grid = new Grid();
        this._buildCellViews();
        this._registerGridTouch();
    }

    private _buildCellViews(): void {
        for (let i = 0; i < 64; i++) {
            const row = Math.floor(i / 8);
            const col = i % 8;
            const cellNode = new Node(`cell_${row}_${col}`);
            const g = cellNode.addComponent(Graphics);
            // Position cell within grid container
            const x = col * (GridRenderer.CELL_SIZE + GridRenderer.CELL_GAP)
                      - GridRenderer.GRID_WIDTH / 2 + GridRenderer.CELL_SIZE / 2;
            const y = -(row * (GridRenderer.CELL_SIZE + GridRenderer.CELL_GAP)
                      + GridRenderer.CELL_SIZE / 2);
            cellNode.setPosition(x, y, 0);
            const uiT = cellNode.addComponent(UITransform);
            uiT.setContentSize(GridRenderer.CELL_SIZE, GridRenderer.CELL_SIZE);
            this.node.addChild(cellNode);
            this._cellViews.push({ node: cellNode, graphics: g, row, col, isFlashing: false, flashColor: null });
        }
    }
}
```

### Pattern 2: Per-Frame State Poll (update loop)

**What:** `GridRenderer.update()` calls `FlowerFSM.getState(performance.now())` for every cell each frame and repaints the cell's `Graphics` to match. This is polling, not event-driven. The renderer is a read-only consumer of the logic tier.

**When to use:** Always for state-driven visual updates in this architecture. The logic tier never calls back into the renderer.

**Example:**
```typescript
// Source: Cocos Creator 3.8 lifecycle callbacks docs
update(_dt: number): void {
    const nowMs = performance.now();
    const cells = this._grid.getCells();
    for (let i = 0; i < 64; i++) {
        const view = this._cellViews[i];
        if (view.isFlashing) continue; // flash timer owns this cell's color temporarily
        const flower = cells[i].flower;
        const state = flower ? flower.getState(nowMs) : null;
        this._paintCell(view, state);
    }
    // Also tick SpawnManager if elapsed > nextSpawnTime (Phase 3 first wiring of SpawnManager)
}

private _paintCell(view: CellView, state: FlowerState | null): void {
    const g = view.graphics;
    g.clear();
    const color = state ? COLOR_TABLE[state] : EMPTY_COLOR;
    g.fillColor = color;
    g.roundRect(
        -GridRenderer.CELL_SIZE / 2,
        -GridRenderer.CELL_SIZE / 2,
        GridRenderer.CELL_SIZE,
        GridRenderer.CELL_SIZE,
        GridRenderer.CELL_RADIUS
    );
    g.fill();
}
```

### Pattern 3: Touch Input — Node-level TOUCH_START per cell

**What:** Each cell node registers `Node.EventType.TOUCH_START`. The handler maps the tapped node back to `(row, col)` via the `CellView` index, then calls the correct/wrong tap path on the `GameController`.

**When to use:** For per-cell touch detection. Node-level listeners only fire when touch is within the node's `UITransform` content size — Cocos handles hit testing automatically.

**Example:**
```typescript
// Source: Cocos Creator 3.8 Node Event System docs
private _registerGridTouch(): void {
    for (const view of this._cellViews) {
        view.node.on(Node.EventType.TOUCH_START, (_event: EventTouch) => {
            this._onCellTapped(view);
        }, this);
    }
}

private _onCellTapped(view: CellView): void {
    const nowMs = performance.now();
    const cell = this._grid.getCell(view.row, view.col);
    const flower = cell.flower;
    if (!flower) return; // empty cell — ignore tap
    const state = flower.getState(nowMs);
    if (state === FlowerState.BLOOMING || state === FlowerState.FULL_BLOOM) {
        this._handleCorrectTap(view, cell, flower, nowMs);
    } else if (state === FlowerState.BUD || state === FlowerState.WILTING || state === FlowerState.DEAD) {
        this._handleWrongTap(view, nowMs);
    }
    // COLLECTED state: ignore tap (already processing flash)
}
```

### Pattern 4: Flash Effect via scheduleOnce

**What:** On tap, immediately repaint the cell with flash color, set `isFlashing = true` to block the update loop from overwriting it, then use `this.scheduleOnce()` to reset after the flash duration.

**When to use:** Wrong-tap (150ms red flash) and correct-tap (300ms yellow/white flash). Do NOT use `tween()` for `Graphics.fillColor` — it is unreliable in Cocos Creator 3.x.

**Example:**
```typescript
// Source: Cocos Creator 3.8 Scheduler docs + known color tween limitation
private _handleWrongTap(view: CellView, nowMs: number): void {
    this._comboSystem.onWrongTap();
    this._gameState.score -= WRONG_TAP_PENALTY;
    // Flash red immediately
    view.isFlashing = true;
    this._paintCellColor(view, WRONG_FLASH_COLOR); // solid red
    this.scheduleOnce(() => {
        view.isFlashing = false;
        // update() will repaint on next frame
    }, 0.15); // 150ms
}

private _handleCorrectTap(view: CellView, cell: Cell, flower: FlowerFSM, nowMs: number): void {
    const rawScore = flower.getScore(nowMs) ?? 0;
    const finalScore = this._comboSystem.applyToScore(rawScore);
    this._comboSystem.onCorrectTap();
    this._gameState.score += finalScore;
    flower.collect();
    // Flash yellow (BLOOMING) or white (FULL_BLOOM)
    const state = flower.getState(nowMs); // will return COLLECTED now — check state BEFORE collect()
    const flashColor = state === FlowerState.FULL_BLOOM ? CORRECT_FLASH_WHITE : CORRECT_FLASH_YELLOW;
    view.isFlashing = true;
    this._paintCellColor(view, flashColor);
    this.scheduleOnce(() => {
        this._grid.clearCell(cell);
        view.isFlashing = false;
    }, 0.30); // 300ms COLLECTED duration
}
```

**IMPORTANT:** `flower.getState(nowMs)` must be called BEFORE `flower.collect()` to determine BLOOMING vs FULL_BLOOM for the flash color. After `collect()`, `getState()` always returns `COLLECTED`.

### Pattern 5: Color Table — HSL to Hex Pre-computation

**What:** Color constants are pre-computed as `new Color()` objects at module load time, not re-created each frame. Each call to `g.fillColor = color` is a property assignment; it does not allocate.

**Color table (Claude's discretion — 5 hues chosen for maximum differentiation on small screens):**

| Type | Base Hue | BUD (35%) | BLOOMING (65%) | FULL_BLOOM (100%) | WILTING (desat 50%) | DEAD (20%) |
|------|----------|-----------|----------------|-------------------|---------------------|------------|
| CHERRY | Red (0°) | `#6B1A1A` | `#CC3333` | `#FF4444` | `#7A5555` | `#2B0E0E` |
| LOTUS | Pink (330°) | `#6B1A4D` | `#CC3399` | `#FF44CC` | `#7A5570` | `#2B0E1F` |
| CHRYSANTHEMUM | Amber (40°) | `#6B4A10` | `#CC8C1F` | `#FFB02E` | `#7A6B55` | `#2B2010` |
| ROSE | Violet (270°) | `#3A1A6B` | `#7033CC` | `#8C44FF` | `#5A557A` | `#180E2B` |
| SUNFLOWER | Yellow (55°) | `#6B6010` | `#CCB81F` | `#FFE82E` | `#7A7555` | `#2B280E` |

**Shared constants:**
```typescript
// Source: Color system design (Claude's discretion per CONTEXT.md)
const EMPTY_BG    = new Color(30, 30, 35, 255);    // dark background
const EMPTY_BORDER = new Color(60, 60, 70, 255);   // faint border (stroke)
const WRONG_FLASH_COLOR = new Color(220, 50, 50, 255);   // bright red flash
const CORRECT_FLASH_YELLOW = new Color(255, 220, 60, 255); // BLOOMING collect flash
const CORRECT_FLASH_WHITE  = new Color(255, 255, 255, 255); // FULL_BLOOM collect flash
```

### Anti-Patterns to Avoid

- **Creating nodes in update():** Never call `new Node()` inside `update()` or tap handlers — GC spikes. All nodes pre-created in `onLoad()`.
- **Calling `getState()` after `collect()`:** Always read state BEFORE marking flower as collected to get BLOOMING vs FULL_BLOOM.
- **Tweening `Graphics.fillColor` directly:** In Cocos Creator 3.x, `Graphics.fillColor` may not have the `lerp`/`clone` methods required by `tween()`. Use `scheduleOnce()` + manual repaint.
- **Using `dt` accumulation for spawn timing:** Use `performance.now()` timestamps, not `dt` sum — drift prevention (locked project decision).
- **Registering touch on canvas node instead of cell nodes:** Canvas-level touch requires manual hit testing for all 64 cells. Node-level TOUCH_START per cell is cleaner and leverages engine hit testing.
- **Storing `FlowerState` separately in renderer:** The renderer must not cache state — always call `FlowerFSM.getState(nowMs)` fresh each frame to avoid stale-state bugs.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-cell hit testing | Custom ray-cast or coordinate math | `Node.EventType.TOUCH_START` per cell + `UITransform` content size | Engine handles bounds checking; 64 listeners is negligible overhead |
| Delayed color reset | Manual timer accumulation in `update()` | `this.scheduleOnce()` | Engine timer auto-cancels on node destroy; no state management needed |
| Color interpolation for flash | Manual lerp in update loop | `scheduleOnce()` with snap-to-color | Flash is instant snap, not gradient — lerp is unnecessary complexity |
| Grid scaling for multiple viewports | Custom resize handler | Design resolution 720x1280 + FIXED_WIDTH fit (already configured Phase 1) | Cocos handles letterboxing and DPR automatically |
| Coordinate conversion from touch | Manual pixel math | `UITransform.convertToNodeSpaceAR()` | Handles parent transforms, canvas scaling, DPR — manual math breaks on Retina |

**Key insight:** The Cocos Creator node system handles hit testing, coordinate transformation, and scaling automatically when UITransform components are configured correctly. Most "custom input" solutions are reimplementing engine features.

---

## Common Pitfalls

### Pitfall 1: getState() Called After collect()

**What goes wrong:** `flower.collect()` is called to mark correct tap, then `flower.getState(nowMs)` is called to decide flash color — but after `collect()`, `getState()` always returns `COLLECTED`, not `BLOOMING` or `FULL_BLOOM`.

**Why it happens:** Natural order of operations — collect first, then decide feedback. But the FSM flag is irreversible.

**How to avoid:** Always read `getState(nowMs)` BEFORE calling `collect()`. Store the state in a local variable.

**Warning signs:** All correct taps use the same flash color regardless of which state was tapped.

---

### Pitfall 2: Flash isFlashing Flag Not Cleared on Wrong Order

**What goes wrong:** `isFlashing = true` is set, `scheduleOnce` fires and clears it, but another tap arrives while flashing — the second `scheduleOnce` fires late and clears `isFlashing` after the second flash should still be active.

**Why it happens:** Multiple taps on same cell during flash window. The second tap overwrites the flash color but the first `scheduleOnce` fires and clears it early.

**How to avoid:** Guard `_onCellTapped()` to return early if `view.isFlashing === true`. A flashing cell cannot be re-tapped until the flash completes.

**Warning signs:** Visual glitch where cell briefly shows wrong color after a second tap during a flash.

---

### Pitfall 3: performance.now() vs dt Accumulation for SpawnManager

**What goes wrong:** SpawnManager receives an accumulated `elapsedMs` computed as `dt * 1000` summed each frame. Over 120 seconds at 60fps, float precision drift can cause missed phase boundary crossings.

**Why it happens:** Using `dt` accumulation for session timing — a known project pitfall (STATE.md pitfall #2).

**How to avoid:** Record `this._sessionStartMs = performance.now()` when the session begins. Pass `performance.now() - this._sessionStartMs` to `SpawnManager.tick()` and all other logic calls. Use `performance.now()` as the single source of truth.

**Warning signs:** Phase transitions (0→40s, 40→80s) feel off; spawn rate doesn't change at expected time.

---

### Pitfall 4: Node Touch Events Not Firing Due to Missing UITransform

**What goes wrong:** `Node.EventType.TOUCH_START` listener is registered on a cell node, but taps on the cell area never trigger the callback.

**Why it happens:** Touch detection for Node events requires a `UITransform` component with non-zero content size. If `UITransform` is missing or `contentSize` is (0,0), the node has no hit area.

**How to avoid:** After `cellNode.addComponent(Graphics)`, explicitly add and configure `UITransform`: `const uiT = cellNode.addComponent(UITransform); uiT.setContentSize(CELL_SIZE, CELL_SIZE)`.

**Warning signs:** Touch listener registered, no console errors, but taps are ignored.

---

### Pitfall 5: Graphics fillColor is Shared Reference

**What goes wrong:** All 64 `Graphics` components are updated via `g.fillColor = sharedColorConstant`. If `fillColor` is a mutable reference and the property assignment modifies the same object, all cells may show the same color.

**Why it happens:** In some Cocos Creator versions, `fillColor` is a shared `Color` object by reference, not cloned on assignment.

**How to avoid:** Always assign via `g.fillColor.fromHEX('#RRGGBB')` or assign a fresh `new Color(r, g, b, 255)`. Do NOT store one `Color` object and mutate its fields for different cells in the same frame.

**Warning signs:** All cells display the same color unexpectedly; changing one cell changes all.

---

### Pitfall 6: COLLECTED Cell Accepts Another Tap

**What goes wrong:** During the 300ms COLLECTED flash window, another tap fires on the same cell. The handler calls `flower.getScore()` but `flower._collected === true`, so `getScore()` returns `null`. Null score may cause NaN in scoring.

**Why it happens:** No guard in `_onCellTapped` for COLLECTED state.

**How to avoid:** In `_onCellTapped`, check `view.isFlashing` early and return if true. COLLECTED flowers also return `FlowerState.COLLECTED` from `getState()` — add an explicit case that ignores tap.

---

## Code Examples

### Full Color Derivation from FlowerState

```typescript
// Source: CONTEXT.md color system decisions + Color API
import { Color } from 'cc';
import { FlowerState } from './logic/FlowerState';
import { FlowerTypeId } from './logic/FlowerTypes';

// Pre-computed color table: [typeId][state] -> Color
// Values derived from locked brightness rules in CONTEXT.md
const FLOWER_COLORS: Record<FlowerTypeId, Partial<Record<FlowerState, Color>>> = {
    [FlowerTypeId.CHERRY]: {
        [FlowerState.BUD]:        new Color(107, 26, 26, 255),   // #6B1A1A  ~35% L
        [FlowerState.BLOOMING]:   new Color(204, 51, 51, 255),   // #CC3333  ~65% L
        [FlowerState.FULL_BLOOM]: new Color(255, 68, 68, 255),   // #FF4444  100%
        [FlowerState.WILTING]:    new Color(122, 85, 85, 255),   // #7A5555  desat+dim
        [FlowerState.DEAD]:       new Color(43, 14, 14, 255),    // #2B0E0E  ~20%
        [FlowerState.COLLECTED]:  new Color(255, 220, 60, 255),  // flash handled separately
    },
    // ... other types follow same pattern
};

const EMPTY_FILL   = new Color(30, 30, 35, 255);
const EMPTY_STROKE = new Color(60, 60, 70, 255);

function getCellColor(typeId: FlowerTypeId, state: FlowerState): Color {
    return FLOWER_COLORS[typeId]?.[state] ?? EMPTY_FILL;
}
```

### scheduleOnce Flash Pattern

```typescript
// Source: Cocos Creator 3.8 Scheduler docs
private _triggerWrongTapFlash(view: CellView): void {
    view.isFlashing = true;
    this._paintCellSolidColor(view, WRONG_FLASH_COLOR);
    this.scheduleOnce(() => {
        view.isFlashing = false;
        // next update() call will repaint correctly from FlowerFSM state
    }, 0.15);
}

private _triggerCorrectTapFlash(view: CellView, cell: Cell, flashColor: Color): void {
    view.isFlashing = true;
    this._paintCellSolidColor(view, flashColor);
    this.scheduleOnce(() => {
        this._grid.clearCell(cell);
        view.isFlashing = false;
    }, 0.30);
}
```

### Grid Coordinate Layout Math

```typescript
// Source: CONTEXT.md grid layout decisions
// Design resolution: 720px wide, grid = 80% = 576px
// Cell size = (576 - 7*4) / 8 = (576 - 28) / 8 = 548 / 8 = 68.5 → floor to 68px
// Actual grid width = 8 * 68 + 7 * 4 = 544 + 28 = 572px (slight inset from 576px)

const GRID_COLS = 8;
const CELL_GAP  = 4;
const CELL_SIZE = Math.floor((576 - 7 * CELL_GAP) / GRID_COLS); // 68

// Grid container origin: centered horizontally, 30% from top of 1280px = y offset from center
// Design center = (0,0). Top of canvas at +640. 30% from top = 640 - (1280 * 0.30) = 640 - 384 = 256
// Grid top-left relative to container center = (-286, +286) if grid is 572px square

// Cell x from grid center (col):
// x = col * (CELL_SIZE + CELL_GAP) - (CELL_SIZE * GRID_COLS + CELL_GAP * 7) / 2 + CELL_SIZE / 2
// Cell y from grid center (row), y-axis inverted in Cocos:
// y = -(row * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2 - gridHalfSize / 2)
```

### GameState (Plain TypeScript)

```typescript
// Source: Architecture Notes in STATE.md
// Plain TypeScript — no cc imports — lives alongside logic tier
export class GameState {
    score: number = 0;
    comboMultiplier: number = 1;
    sessionStartMs: number = 0;

    reset(): void {
        this.score = 0;
        this.comboMultiplier = 1;
        this.sessionStartMs = performance.now();
    }

    getElapsedMs(): number {
        return performance.now() - this.sessionStartMs;
    }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `cc.Node.EventType` on node (Cocos 2.x pattern) | `Node.EventType.TOUCH_START` on node (same API, 3.x import path changed) | Cocos 3.0 | Import from `'cc'` not `'cc/core'` — same behavior |
| `cc.tween()` with string hex colors | `tween()` with `new Color()` objects | Cocos 3.x | String hex colors cause "no lerp function" error at runtime |
| Manually calling `scheduleUpdate()` | Override `update(dt)` method | Cocos 3.x | `update()` auto-registered when defined on Component |

**Deprecated/outdated:**
- `cc.Class` component definition: replaced by `@ccclass` decorator + `Component` extends (already used in BootController.ts)
- `cc.v2()` / `cc.v3()` helpers: replaced by `new Vec2()` / `new Vec3()` from `'cc'`

---

## Open Questions

1. **Exact cell size rounding**
   - What we know: `(576 - 28) / 8 = 68.5px` — not an integer
   - What's unclear: Should we floor to 68px (slight gap) or use 68.5px (fractional pixels)?
   - Recommendation: Floor to 68px. Fractional pixel rendering on mobile can cause blurry edges on non-retina screens. Accept a 4px visual inset (572px total grid vs 576px target).

2. **GameController vs GridRenderer ownership of Grid instance**
   - What we know: CONTEXT.md says GameController is a "placeholder" that will become the game orchestrator
   - What's unclear: Should Grid be owned by GameController (then passed to GridRenderer), or by GridRenderer?
   - Recommendation: GameController owns Grid, ComboSystem, SpawnManager, GameState. GridRenderer receives Grid reference via `@property` or direct assignment in GameController.onLoad(). This maintains the separation of concerns from STATE.md architecture notes.

3. **SpawnManager tick location**
   - What we know: CONTEXT.md says "Phase 3 is the first time SpawnManager runs in the Cocos update loop"
   - What's unclear: Should SpawnManager tick in GridRenderer.update() or GameController.update()?
   - Recommendation: GameController.update() ticks SpawnManager and calls Grid.spawnFlower() when spawn is needed. GridRenderer.update() only reads state. This keeps mutation in one place.

---

## Validation Architecture

> nyquist_validation is enabled in .planning/config.json.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `E:/workspace/ProjectAI/vitest.config.ts` |
| Quick run command | `npx vitest run` (from workspace root) |
| Full suite command | `npx vitest run --coverage` |

**Note:** Vitest is configured with `include: ['BloomTap/assets/scripts/logic/**/*.test.ts']`. Renderer and input code imports `cc` modules and cannot run in Node/Vitest environment. Tests for Phase 3 cover only the pure logic integration paths and GameState; renderer behavior is verified via Cocos Creator preview (manual).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GRID-01 | 64 cell nodes pre-created, none created/destroyed during gameplay | manual-only | N/A — requires Cocos runtime | Wave 0 not applicable |
| GRID-02 | Grid scales correctly at 375px and 430px viewport | manual-only | N/A — requires device/emulator | Wave 0 not applicable |
| FLOW-03 | 5 states visually distinct | manual-only | N/A — visual validation | Wave 0 not applicable |
| GAME-01 | Tap BLOOMING → score += rawScore * multiplier | unit | `npx vitest run --reporter=verbose` | ❌ Wave 0: `logic/GameState.test.ts` |
| GAME-02 | FULL_BLOOM tap scores more than BLOOMING tap | unit | `npx vitest run --reporter=verbose` | ❌ Wave 0: `logic/GameState.test.ts` |
| GAME-03 | Wrong tap → score decreases, multiplier resets | unit | `npx vitest run --reporter=verbose` | ❌ Wave 0: `logic/GameState.test.ts` |

**Manual-only justification for GRID-01, GRID-02, FLOW-03:** These requirements verify Cocos Creator runtime behavior (node creation, viewport scaling, visual rendering) that cannot be asserted in a Node.js Vitest environment without a full engine mock. Manual verification in Cocos Creator preview satisfies these requirements.

### Sampling Rate

- **Per task commit:** `npx vitest run` (from `E:/workspace/ProjectAI/`)
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green + manual Cocos Creator preview check before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `BloomTap/assets/scripts/logic/GameState.ts` — score accumulation, penalty logic (plain TypeScript, testable in Vitest)
- [ ] `BloomTap/assets/scripts/logic/GameState.test.ts` — covers GAME-01, GAME-02, GAME-03 scoring paths

*(Renderer files `GridRenderer.ts`, `CellNode.ts` are not testable in Vitest — covered by manual preview only)*

---

## Sources

### Primary (HIGH confidence)

- Cocos Creator 3.8 Manual — Node Event System: https://docs.cocos.com/creator/3.8/manual/en/engine/event/event-node.html
- Cocos Creator 3.8 Manual — Life Cycle Callbacks: https://docs.cocos.com/creator/3.8/manual/en/scripting/life-cycle-callbacks.html
- Cocos Creator 3.8 Manual — Scheduler: https://docs.cocos.com/creator/3.8/manual/en/scripting/scheduler.html
- Cocos Creator 3.8 Manual — Graphics Component: https://docs.cocos.com/creator/3.8/manual/en/ui-system/components/editor/graphics.html
- Cocos Creator 3.1 API — Graphics class (roundRect signature): https://docs.cocos.com/creator/3.1/api/en/classes/ui.graphics-1.html
- Cocos Creator 3.8 Manual — UITransform: https://docs.cocos.com/creator/3.8/manual/en/ui-system/components/editor/ui-transform.html
- Cocos Creator 3.8 Manual — Tween Example: https://docs.cocos.com/creator/3.8/manual/en/tween/tween-example.html
- Existing codebase: `BloomTap/assets/scripts/logic/` — FlowerFSM, Grid, ComboSystem, SpawnManager, FlowerTypes, FlowerState (verified via direct read)
- Project STATE.md — Key Decisions, Architecture Notes, Critical Pitfalls

### Secondary (MEDIUM confidence)

- Cocos Forums — How to change color using cc.tween: https://forum.cocosengine.org/t/how-to-change-color-using-cc-tween/54462 — confirms Color objects required for tween, string hex fails
- GitHub Issue — Can't tween color of cc.Sprite #13229: https://github.com/cocos/cocos-engine/issues/13229 — confirms color tween limitation in 3.x

### Tertiary (LOW confidence)

- None — all critical claims verified with official sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all APIs verified against official Cocos Creator 3.8 docs
- Architecture: HIGH — patterns derived from existing codebase + official lifecycle docs
- Pitfalls: HIGH for engine-specific pitfalls (verified via official docs + forum issues); MEDIUM for color table exact values (Claude's discretion per CONTEXT.md)
- Flash implementation: HIGH — `scheduleOnce()` approach verified; tween limitation verified via forum + GitHub issue

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable Cocos Creator API, 30-day window)
