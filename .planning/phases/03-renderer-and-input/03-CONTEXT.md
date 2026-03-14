# Phase 3: Renderer and Input - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

8x8 grid hiển thị trên màn hình GameScene. Mỗi cell render đúng màu sắc theo state hoa. Tap vào cell kích hoạt đúng logic path (correct-tap hoặc wrong-tap) và wired vào FlowerFSM/ComboSystem. Visual feedback tức thì cho mọi tap. Grid scale đúng trên 375px và 430px viewport.

**Không thuộc Phase 3:** Session timer (Phase 4), HUD score display (Phase 4), juice animations như score float hay combo flash (Phase 5), sprite art thật (Phase 5+).

</domain>

<decisions>
## Implementation Decisions

### Visual representation cho 5 trạng thái hoa

- **Base shape:** Colored rectangles (không phải sprites — v1 chưa có art)
- **Size:** Cố định cho mọi state — không scale up/down giữa các state
- **Color system:** Mỗi loài hoa = base hue riêng; state differentiation = brightness/saturation variation của base hue đó
  - Ví dụ: CHERRY = red-based; BUD = dim red, FULL_BLOOM = bright red
  - 5 loài cần 5 hue riêng biệt, Claude chọn cụ thể
- **Empty cell:** Nền tối (dark background) + viền mờ — grid structure luôn visible

### Bảng state → brightness rule (locked)

| State | Visual |
|-------|--------|
| BUD | Base hue, độ sáng thấp (~35%) |
| BLOOMING | Base hue, độ sáng trung bình (~65%) |
| FULL_BLOOM | Base hue, độ sáng tối đa (100%), rực rỡ nhất |
| WILTING | Base hue, desaturated + dim (~50%) |
| DEAD | Base hue, rất tối (~20%) |
| COLLECTED | Flash (xem phần Collected state) |
| EMPTY | Dark rect + faint border |

### Grid layout

- **Grid width:** ~80% design width = ~576px trên design resolution 720px
- **Căn ngang:** Giữa màn hình
- **Vị trí dọc:** 30% từ trên xuống (nhường khoảng trên cho HUD Phase 4)
- **Cell gap:** 4px giữa các cell
- **Cell size:** `(576 - 7 × 4) / 8 ≈ 68px × 68px` (Claude tính chính xác khi implement)
- **Grid là square:** width = height, không phải rectangle

### Wrong-tap feedback

- **Trigger:** Tap BUD, WILTING, hoặc DEAD cell
- **Visual:** Cell flash sang màu đỏ trong 150ms, sau đó trở lại màu state hiện tại
- **Scope:** Flash chỉ trên cell được tap — không phải toàn màn hình
- **Không có:** Penalty score float (Phase 5 JUICE-03), shake animation

### Correct-tap visual (COLLECTED state)

- **BLOOMING tap:** Cell flash vàng → về EMPTY (duration 300ms)
- **FULL_BLOOM tap:** Cell flash trắng → về EMPTY (duration 300ms)
- **COLLECTED duration:** 300ms (quyết định từ deferred decision Phase 2)
- **Không có:** Score float text "+120" (Phase 5 JUICE-02)

### Game logic wiring (Phase 3 scope)

- Tap đúng (BLOOMING/FULL_BLOOM) → gọi FlowerFSM logic → tính score → cộng vào game state
- Tap sai (BUD/WILTING/DEAD) → tính penalty → trừ vào game state
- ComboSystem.onCorrectTap() / onWrongTap() được gọi cho mọi tap
- Score tính đúng theo interpolation formula (từ Phase 2 CONTEXT)
- Phase 3 **không cần** session timer hay HUD — chỉ cần logic wiring hoạt động đúng (có thể verify qua dev console hoặc debug label)

### Claude's Discretion

- Exact hue values cho 5 loại hoa (chọn sao cho 5 màu phân biệt rõ trên màn hình nhỏ)
- Cocos Creator Node hierarchy cho GridRenderer (container node + 64 child nodes)
- Cách drive update loop: Cocos `update(dt)` callback polling FlowerFSM state mỗi frame
- Debug score display cho Phase 3 (không cần đẹp — chỉ cần xác nhận logic đúng)
- Exact cell corner radius nếu dùng rounded rects

</decisions>

<specifics>
## Specific Ideas

- Grid luôn chiếm đúng 80% width, scale theo `FIXED_WIDTH` fit mode đã lock ở Phase 1 — không cần logic scale thêm, Cocos tự handle
- Phase 3 là lần đầu tiên SpawnManager chạy trong Cocos update loop — cần wire đúng elapsed time (`performance.now()` vs Cocos timer)
- COLLECTED state "không cho spawn hoa mới vào cell" — renderer phase, không phải logic phase — Grid.spawnFlower sẽ không được gọi cho cell đang COLLECTED (Grid đã handle qua `flower !== null` check)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Logic (Phase 2 output)

- `Grid.getCells()` → returns `readonly Cell[]` với 64 phần tử, mỗi phần tử có `{row, col, flower: FlowerFSM | null}`
- `FlowerFSM.getState(nowMs)` → trả về `FlowerState` enum — renderer gọi mỗi frame để lấy state hiện tại
- `FlowerFSM.getScore(nowMs)` → điểm interpolated tại thời điểm tap
- `Grid.clearCell(cell)` → xóa flower khỏi cell (gọi sau COLLECTED duration)
- `Grid.spawnFlower(cell, config, nowMs)` → tạo FlowerFSM mới
- `SpawnManager.tick(nowMs, aliveCount)` → trả về spawn decision nếu đến lúc spawn
- `ComboSystem.onCorrectTap()` / `onWrongTap()` → update multiplier, trả về multiplier hiện tại

### Established Patterns

- **Pure logic tier:** FlowerFSM, Grid không import Cocos (`cc`) — renderer là lớp Cocos duy nhất biết về Node/Graphics
- **Timestamp-based:** Tất cả timing dùng `performance.now()`, không phải `dt` accumulation — renderer truyền `performance.now()` vào mọi logic call
- **Object pools locked:** 64 Node objects pre-created tại `onLoad()`, không create/destroy trong gameplay (từ STATE.md key decision)

### Integration Points

- `GameController.ts` hiện là placeholder (Label "Bloom Tap") — Phase 3 mở rộng hoặc thay thế thành game orchestrator chính
- `GameScene.scene` cần được mở rộng với Grid node container + 64 cell children
- `BootScene → GameScene` transition đã hoạt động từ Phase 1 — không cần thay đổi
- Touch input: Cocos `Node.on(Node.EventType.TOUCH_START)` trên canvas/grid node → map pixel position sang `(row, col)`

</code_context>

<deferred>
## Deferred Ideas

- Score float text "+120 ×3" nổi lên từ cell tap — Phase 5 JUICE-02
- Combo flash animation khi multiplier tăng — Phase 5 JUICE-03
- Scale pulse khi tap (cell phồng lên 1.1x rồi về) — Phase 5 JUICE-01
- HUD: score, timer countdown, combo multiplier display — Phase 4
- Flower sprite art thật thay thế colored rectangles — Phase 5+
- Session timer 120s và game over flow — Phase 4
- Audio unlock splash "Tap to Start" — Phase 4/5

</deferred>

---

*Phase: 03-renderer-and-input*
*Context gathered: 2026-03-14*
