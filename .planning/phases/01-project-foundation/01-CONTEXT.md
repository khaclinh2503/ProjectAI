# Phase 1 Context: Project Foundation

**Phase:** 1 — Project Foundation
**Goal:** Môi trường dev đúng và mobile-ready trước khi viết bất kỳ game logic nào
**Created:** 2026-03-14
**Requirements:** FOUND-01, FOUND-02, FOUND-03

---

## 1. Screen Orientation và Design Resolution

**Quyết định:** Portrait, `720 × 1280` (width × height)

- Hướng: **Portrait** — điện thoại cầm thẳng, ngón cái tự nhiên với grid 8×8
- Design resolution: **720 × 1280**
- Fit mode: `FIXED_WIDTH` — giữ nguyên width 720px, scale height theo màn hình; phù hợp với các tỷ lệ màn hình khác nhau (16:9, 19.5:9, 20:9)
- DPR scaling: Cocos Creator 3.8.x xử lý tự động qua `cc.view.enableRetina(true)` — không cần can thiệp thủ công

---

## 2. BootScene Behavior

**Quyết định:** Chuyển thẳng sang GameScene, không có splash, không có delay

- BootScene chỉ làm 1 việc: gọi `director.loadScene("GameScene")` ngay lập tức
- Màn hình tối trong thời gian Cocos load — không cần xử lý thêm ở v1
- Không preload asset ở BootScene (chưa có art; sẽ thêm khi Phase 5 có assets)
- GameScene ở Phase 1 chỉ là placeholder — 1 Label "Bloom Tap" để xác nhận scene transition hoạt động

---

## 3. Cocos Creator Version

**Quyết định:** Cocos Creator **3.8.8** (đã cài sẵn)

- Dùng đúng bản 3.8.8 — không upgrade, không downgrade
- TypeScript strict mode bật từ đầu (`"strict": true` trong tsconfig)
- Target web build (HTML5) cho v1 — export qua `Build & Publish → Web Mobile`

---

## 4. Touch Input

**Quyết định:** Đã locked từ STATE.md — ghi lại để researcher/planner không hỏi lại

- Dùng `pointerdown` (không phải `touchend` hay `click`) — tránh 100–300ms latency mobile
- Canvas cần `touch-action: none` trong CSS web export để tắt scroll
- Cocos Creator 3.8.x dùng `EventTouch` / `Node.on(Node.EventType.TOUCH_START)` — map đúng sang pointerdown behavior

---

## 5. Scene Structure Tối Thiểu (Phase 1)

Chỉ cần đủ để pass success criteria — không build game logic ở phase này:

```
scenes/
  BootScene     — load xong → chuyển GameScene ngay
  GameScene     — placeholder: Label "Bloom Tap" + nền tối
```

GameScene sẽ được mở rộng ở Phase 3 (Renderer & Input). Phase 1 chỉ cần confirm transition hoạt động và canvas scale đúng.

---

## Deferred Decisions

| Quyết định | Ghi chú |
|-----------|---------|
| Audio unlock ("Tap to Start" splash) | Cần thiết cho iOS Safari — defer sang Phase 4/5 khi có sound |
| Asset preloading strategy | Chưa có art — quyết định ở Phase 5 |
| Màu nền GameScene | Chưa có visual style — tạm dùng màu tối trung tính (#1a1a2e hoặc tương tự) |

---

## Code Context

- Chưa có code nào (Phase 1 là phase đầu tiên)
- Cocos Creator 3.8.8 tạo project mới với TypeScript template
- Tất cả game logic (FlowerFSM, Grid, v.v.) sẽ được viết ở Phase 2 — Phase 1 không động đến logic

---

*Context created: 2026-03-14*
