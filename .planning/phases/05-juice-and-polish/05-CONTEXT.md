# Phase 5: Juice and Polish — Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Mỗi tap action có immediate, satisfying feedback xác nhận đúng/sai mà không cần người chơi đọc text. Phase 5 deliver: tap pulse (JUICE-01), score float (JUICE-02), combo break/milestone flash (JUICE-03), timer urgency escalation (JUICE-04).

**Không thuộc Phase 5:** Timer freeze khi đạt combo milestone (deferred — xem Deferred Ideas), persistent highscore (Phase 6), results screen (Phase 6).

</domain>

<decisions>
## Implementation Decisions

### JUICE-01: Tap Pulse

- **Scope:** Scale pulse xảy ra tại cell vừa tap
- **Tap bình thường (đúng hoặc sai):** Scale 1.0 → ~1.1 → 1.0, duration **80ms**, easing về discretion của Claude
- **FULL_BLOOM tap (≥95% điểm — tức FlowerState.FULL_BLOOM):** Pulse 120ms + **ripple lan ra 4 ô lân cận** (up/down/left/right) như sóng — ô lân cận pulse nhẹ hơn cell gốc
- **Tap sai:** Pulse bình thường 80ms — không ripple

### JUICE-02: Score Float Label

- **Nội dung:** Chỉ hiển thị điểm — ví dụ "+120", không kèm "x3"
- **Font size:** **Tỉ lệ với multiplier hiện tại** — combo càng cao → chữ càng to
- **Tap sai:** Hiển thị "-30" màu đỏ (penalty amount)
- **Hướng bay:** Thẳng lên từ cell vừa tap + **lắc ngang nhẹ** (wobble)
- **Duration:** Tỉ lệ với multiplier, **tối đa 1 giây**, fade out cuối animation
- **Xuất phát:** Từ giữa cell vừa tap

### JUICE-03: Combo Break & Milestone Flash

**Khi tap sai (combo break):**
- Combo label **chớp nhanh rồi fade out** (biến mất, về "Combo x0")
- **Full-screen red overlay:** ~20% opacity, thoáng qua **150ms**, rồi fade out
- Cell flash đỏ: đã có từ Phase 3 (giữ nguyên)

**Khi combo tăng (tap đúng liên tiếp):**
- Combo label pulse nhẹ (scale nhỏ, nhanh) mỗi khi số tăng — discretion của Claude về magnitude

**Milestone combos — x10, x25, x50:**
- Trigger mid-screen celebration: text lớn (ví dụ "COMBO x10!") + particle burst hoặc glow effect
- **Không freeze timer** — visual only
- Ngưỡng: **x10, x25, x50** — mỗi lần chỉ trigger 1 lần (không repeat)

### JUICE-04: Timer Urgency Escalation

- **Timer scale:** To dần theo urgency — người chơi nhìn rõ hơn khi áp lực tăng
- **3 mốc escalation (session 120s):**

| Mốc | Thời điểm | Timer text | Timer size | HUD |
|-----|-----------|------------|------------|-----|
| Bình thường | >60s còn lại | Trắng | Bình thường | Bình thường |
| Urgency 1 | ≤60s còn lại | Vàng | To hơn nhẹ | Không đổi |
| Urgency 2 | ≤30s còn lại | Cam | To hơn nữa | Không đổi |
| Urgency 3 | ≤10s còn lại | Đỏ + **blink nhanh** | To nhất | **Toàn HUD thay đổi** — feeling dồn dập |

- **Urgency 3 (≤10s):** Blink nhanh timer + HUD background/border đổi để tạo cảm giác "countdown finał" — exact HUD styling là discretion của Claude
- Transition giữa các mốc: instant (không tween màu), chỉ tween scale nếu muốn smooth

### Claude's Discretion

- Easing curve cho tap pulse và ripple
- Wobble magnitude và curve của score float
- Font size scale ratio theo multiplier (ví dụ: x1=24px, x2=28px, x3=32px...)
- Particle burst style cho milestone celebration (Cocos tween-based hay particle system)
- Timer size cụ thể ở mỗi mốc urgency (ví dụ 1.0x → 1.2x → 1.4x → 1.6x)
- Blink interval ở ≤10s (ví dụ 250ms on/off)
- HUD Urgency 3 styling cụ thể (màu background, border glow, shake...)
- Object pool size cho score float labels (đề xuất: pool 8–10 nodes)

</decisions>

<specifics>
## Specific Ideas

- Score float size tỉ lệ multiplier: người chơi cảm nhận được giá trị của combo streak qua kích thước chữ
- FULL_BLOOM ripple là "peak moment" feeling — tap đúng lúc hoa đẹp nhất thì cả ô xung quanh phản ứng
- Full-screen red flash 150ms khi sai: đủ ngắn để không gây khó chịu nhưng đủ rõ để người chơi biết ngay
- Milestone x10/x25/x50 mid-screen: cần to và rõ — không nhỏ hoặc ở góc màn hình
- Timer urgency: transition qua 3 mốc tạo narrative tâm lý — "bình thường → cảnh báo → căng thẳng → hỗn loạn"

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets (Phase 4 output)

- `GameController.ts` — `handleCorrectTap()` trả về `{ flashColor }`, `handleWrongTap()` — Phase 5 mở rộng return value để truyền thêm info cho animation
- `GridRenderer.ts` — `paintFlashAndClear()` và `paintFlash()` đã có, TOUCH_START handlers gọi lên GameController
- `FlowerColors.ts` — `CORRECT_FLASH_YELLOW`, `CORRECT_FLASH_WHITE`, `WRONG_FLASH_COLOR` — đã sẵn dùng
- `GameState.ts` — `score`, `sessionStartMs`, `getElapsedMs()` — timer urgency đọc từ đây
- `ComboSystem.ts` — `tapCount` (streak), `multiplier` — score float size dùng multiplier, milestone check dùng tapCount
- `FlowerState.ts` — `FlowerState.FULL_BLOOM` — ripple trigger condition

### Established Patterns

- **Object pool pattern** (ghi chú từ STATE.md): Pitfall 3 — không tạo/destroy Node trong hot loop; score float labels phải được pool
- **performance.now()** cho tất cả timing — float duration, pulse timing đều dùng pattern này
- **Pure logic tier:** GameState/ComboSystem không import Cocos; mọi visual đều nằm trong GameController/GridRenderer layer
- `GameController._updateHUD()` đã có timer logic — Phase 5 mở rộng method này để thêm urgency color/scale

### Integration Points

- `GameController.handleCorrectTap()` → cần trả thêm `{ rawScore, multiplier, isFullBloom }` để GridRenderer biết size float và có ripple không
- `GameController._updateHUD()` → thêm `_updateTimerUrgency(remainingSecs)` helper — đọc urgency mốc và set Label color/scale
- `GridRenderer` → thêm `playTapPulse(row, col, isFullBloom)` và `spawnScoreFloat(row, col, amount, multiplier)`
- Cần **AnimationSystem** hoặc inline pool trong GridRenderer cho score float labels
- **Full-screen overlay node** (red flash, milestone celebration) — thêm vào GameScene.scene, reference qua @property trong GameController

</code_context>

<deferred>
## Deferred Ideas

- **Combo Milestone Timer Freeze:** Khi đạt x10, x25, x50 → timer dừng 10 giây (hoa vẫn phát triển bình thường). Đây là mechanic mới thay đổi game balance, cần phase riêng hoặc v2. Yêu cầu thay đổi `GameState` timer logic.
- Score count-up animation (số chạy lên) — nếu Phase 5 cảm thấy cần thêm
- Phase transition visual/audio khi bước vào Phase 2 và Phase 3 difficulty — v2 POLSH-02

</deferred>

---

*Phase: 05-juice-and-polish*
*Context gathered: 2026-03-15*
