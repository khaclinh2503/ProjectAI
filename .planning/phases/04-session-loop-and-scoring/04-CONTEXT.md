# Phase 4: Session Loop and Scoring - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Một ván chơi hoàn chỉnh 120 giây chạy từ đầu đến game-over với scoring đúng, combo tracking, HUD realtime, và 3-phase difficulty escalation. Phase 4 deliver: session start screen, countdown, timer loop, game-over state, HUD (score + timer + combo). Phase 6 sẽ thêm persistent highscore và results screen chính thức.

**Không thuộc Phase 4:** Score float animation "+120 x3" (Phase 5 JUICE-02), combo flash animation (Phase 5 JUICE-03), scale pulse khi tap (Phase 5 JUICE-01), timer urgency color change (Phase 5 JUICE-04), persistent highscore storage (Phase 6 RSLT-03), proper results screen (Phase 6 RSLT-01).

</domain>

<decisions>
## Implementation Decisions

### Session start flow

- **Trigger:** Người chơi phải bấm nút "Start" trên màn hình — không auto-start
- **Lý do:** Auto-start làm người chơi bị thiếu điểm vì chưa kịp chuẩn bị
- **Trước khi Start:** Màn hình chờ với nút "Start" ở giữa, grid visible nhưng trống (không spawn)
- **Sau khi tap Start:** Hiện countdown **3 → 2 → 1** (animation số đếm ngược) rồi bắt đầu session
- **Countdown duration:** ~1 giây mỗi số (tổng ~3 giây trước khi game bắt đầu)

### Session timer

- **Implementation:** `sessionStartMs = performance.now()` khi countdown kết thúc — nhất quán với FlowerFSM pattern
- **Duration:** Chính xác 120,000ms
- **Display format:** Số giây nguyên, đếm ngược: "120" → "0"
- **Không dùng:** Cocos `dt` accumulation (đã reject ở Phase 2 — gây drift)

### Game-over behavior (Phase 4 scope)

- **Trigger:** Khi `elapsed >= 120,000ms`
- **Hành động ngay lập tức:**
  1. Dừng spawn hoa mới
  2. Freeze grid — tắt hoàn toàn TOUCH_START trên tất cả 64 cell node
  3. Không nhận bất kỳ tap nào nữa
- **Overlay hiển thị:** "Game Over" + final score (số nguyên)
- **Nút:** Một nút "Chơi lại" — reset toàn bộ state và quay về Start Screen
- **Không có:** Highscore display (Phase 6), animation kết quả (Phase 6)

### Restart flow

- **Tap "Chơi lại":** Reset GameState (score=0), reset ComboSystem (multiplier=1, streak=0), clear toàn bộ Grid (tất cả 64 cell = empty), ẩn Game Over overlay, hiển thị Start Screen
- **Không reload page** — in-place reset

### HUD layout

- **Vị trí:** Phía trên grid, dạng 1 hàng ngang
- **Layout:**
  ```
  ┌────────────────────────────┐
  │ Score    │  Timer  │ Combo  │  ← HUD row
  │          │         │        │
  │  [8x8 grid ..............]  │
  └────────────────────────────┘
  ```
- **3 phần tử:** Score (trái), Timer (giữa), Combo (phải)

### Score display

- **Format:** Số nguyên, ví dụ "1240"
- **Update:** Realtime sau mỗi tap (ngay lập tức, không delay)
- **Phase 4 scope:** Số cập nhật đúng, không animation (Phase 5 sẽ thêm count-up animation và phóng to khi +điểm cao)

### Timer display

- **Format:** Số giây nguyên đếm ngược: "120", "119", ..., "1", "0"
- **Màu:** Không đổi màu trong Phase 4 (Phase 5 JUICE-04 sẽ thêm urgency color thay đổi 15 giây cuối)
- **Update:** Mỗi giây (floor của ms elapsed)

### Combo display

- **Format:** Hiển thị số lần tap đúng liên tiếp — ví dụ "Combo x7"
- **Lý do:** Multiplier thay đổi nhỏ (1.00 → 1.10) không tạo feeling tốt; số tap liên tiếp trực quan hơn
- **Update:** Realtime sau mỗi tap
- **Reset visual:** Khi tap sai, số về 0 ngay lập tức
- **Phase 4 scope:** Số cập nhật đúng, không animation (Phase 5 sẽ thêm combo flash khi tăng)

### Claude's Discretion

- Exact Cocos Label node sizing, font size, color cho HUD elements
- Layout của Start Screen (nút Start ở đâu chính xác, có text hướng dẫn không)
- Countdown animation implementation (tween scale hay đơn giản label update)
- Game Over overlay styling (màu nền, kích thước, bo góc)
- Exact pixel spacing giữa HUD và grid top edge

</decisions>

<specifics>
## Specific Ideas

- Countdown "3 2 1" phải đủ lớn và rõ để người chơi thấy ngay — không nhỏ
- "Combo x7" phải đủ eye-catching để người chơi biết streak của mình
- Score số chạy (count-up) và phóng to khi +điểm cao — **deferred sang Phase 5** nhưng cần note để Phase 5 biết đây là mong muốn của user
- Start Screen: grid visible nhưng trống (64 empty cells) để người chơi thấy layout trước

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets (Phase 3 output)

- `GameController.ts` — `gameState.score`, `comboSystem.multiplier`, `gameState.reset()` đã có
- `GameState.ts` — `applyCorrectTap(rawScore, combo)`, `applyWrongTap(combo)` — Phase 4 thêm `startSession(nowMs)`, `getElapsedMs(nowMs)`, `isGameOver(nowMs)`
- `ComboSystem.ts` — `onCorrectTap()`, `onWrongTap()`, `multiplier` — cần thêm `tapStreak` (số tap liên tiếp) nếu chưa có
- `GridRenderer.ts` — 64 cell nodes với TOUCH_START handler — Phase 4 cần disable/enable touch khi game-over/start
- `SpawnManager.ts` — `getPhaseConfig(elapsedMs)` đã trả về config cho 3 phase (0-40s, 40-80s, 80-120s) — đã sẵn sàng

### Established Patterns

- **performance.now()** cho tất cả timing — sessionStartMs phải dùng pattern này, không dùng dt
- **Pure logic tier** — GameState không import Cocos; HUD update và input enable/disable nằm trong GameController (Cocos layer)
- **GridRenderer.init(grid, controller)** — controller reference đã có, Phase 4 có thể thêm `setInputEnabled(enabled)` vào GridRenderer để freeze/unfreeze

### Integration Points

- `GameController.update()` đã có SpawnManager tick — Phase 4 thêm timer logic vào cùng `update()` loop
- `GameScene.scene` cần thêm: HUD nodes (3 Label), Start Screen overlay, Game Over overlay, countdown node
- `GridRenderer` cần method `setInputEnabled(enabled: boolean)` để freeze/unfreeze all 64 cell TOUCH_START handlers

</code_context>

<deferred>
## Deferred Ideas

- Score count-up animation (số chạy lên khi +điểm) — Phase 5 JUICE-02
- Score label phóng to nhất thời khi +điểm cao — Phase 5 JUICE-02
- Combo flash/animation khi streak tăng — Phase 5 JUICE-03
- Timer đổi màu đỏ hoặc nhấp nháy 15 giây cuối — Phase 5 JUICE-04
- Persistent highscore qua localStorage — Phase 6 RSLT-03
- Proper results screen với highscore comparison — Phase 6 RSLT-01
- Phase transition visual cue (audio/visual khi bước vào phase 2 và 3) — v2 POLSH-02

</deferred>

---

*Phase: 04-session-loop-and-scoring*
*Context gathered: 2026-03-14*
