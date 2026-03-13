# Phase 1 Context: Project Foundation

**Phase:** 1 — Project Foundation
**Goal:** Môi trường dev đúng và mobile-ready trước khi viết bất kỳ game logic nào
**Created:** 2026-03-14
**Requirements:** FOUND-01, FOUND-02, FOUND-03

---

## 1. Canvas Sizing Strategy

### Quyết định

| Tham số | Giá trị |
|---------|---------|
| Orientation | Portrait-only — không xử lý landscape |
| Logical width | **390px** (baseline iPhone 14) |
| Logical height | Dynamic — tính theo `window.innerHeight` trừ safe area |
| Safe area | Có padding tránh notch và home indicator (CSS `env(safe-area-inset-*)`) |
| Overflow handling | HUD mở rộng theo chiều dọc; vùng grid giữ tỉ lệ cố định |
| Phaser scale mode | `SCALE_MODE.FIT` với parent div chiếm viewport trừ safe area |

### Cách triển khai

- Container div dùng CSS: `height: 100dvh`, padding theo `safe-area-inset`
- Phaser config: `width: 390`, `height` tính runtime từ container
- DPR: set `resolution: window.devicePixelRatio` tại Phaser game config — **bắt buộc**, không được bỏ (pitfall #4)
- Canvas CSS: `touch-action: none` — **bắt buộc** (pitfall #5)

### Tác động xuống Phase 3

- Grid 8×8 có logical width ~390px → mỗi ô ~40–44px (tính chính xác tại Phase 3)
- HUD nằm ngoài vùng grid, tận dụng khoảng thừa trên/dưới

---

## 2. BootScene Behavior

### Quyết định

| Tham số | Giá trị |
|---------|---------|
| Loại splash | Tên game ("Bloom Tap") + text "Tap to Start" |
| Assets | Text only — không dùng graphic, không cần asset loader |
| Chuyển scene | Fade out BootScene → Fade in GameScene (~300ms mỗi chiều) |
| Loading bar | Không có — Phase 1 không có assets nặng |
| Audio unlock | Tap vào "Tap to Start" là user gesture — AudioContext unlock tại đây |

### Lý do chọn splash thay vì pass-through

- iOS Safari yêu cầu user gesture trước khi khởi tạo AudioContext (pitfall #6)
- "Tap to Start" là user gesture duy nhất trước game loop — unlock audio tại đây, không cần thêm cơ chế khác
- Phase 5 (Juice) sẽ thêm sound effects — nếu Phase 1 không unlock audio, Phase 5 sẽ im lặng trên iOS

### Scene flow

```
BootScene (hiển thị "Bloom Tap" + "Tap to Start")
    → [user tap]
    → AudioContext.resume() / unlock
    → Camera fade out (300ms)
    → GameScene.start()
    → Camera fade in (300ms)
    → [placeholder GameScene]
```

---

## 3. Scene Structure

### Scenes cần tạo ở Phase 1

| Scene | Mục đích |
|-------|---------|
| `BootScene` | Splash "Tap to Start", audio unlock, chuyển sang GameScene |
| `GameScene` | Placeholder — canvas trống, confirm scene system hoạt động |

- `GameScene` Phase 1 chỉ cần là scene rỗng, không có game logic
- Các scene sau (ResultScene v.v.) thêm ở phase tương ứng

---

## 4. Touch Input

### Quyết định (từ STATE.md — không thay đổi)

- Dùng **`pointerdown`** — không dùng `touchend`, `touchstart`, `click`
- Lý do: `touchend`/`click` có latency 100–300ms trên mobile, phá vỡ timing balance của game
- Phaser InputPlugin tự wrap pointer events — dùng `scene.input.on('pointerdown', ...)` là đủ

---

## Deferred Decisions

| Quyết định | Ghi chú |
|-----------|---------|
| Visual style của BootScene | Phase 1 dùng text đơn giản — Phase 5 (Juice) có thể thêm animation |
| Exact grid cell size | Tính tại Phase 3 dựa trên logical height thực tế |
| GameScene layout chi tiết | Phase 3 quyết định vị trí grid vs HUD |

---

## Code Context

- Chưa có code nào — repo rỗng
- Stack đã chốt: **Phaser 3 + TypeScript + Vite**
- Verify Phaser version mới nhất trước `npm install` (TODO từ STATE.md)
- Tất cả tọa độ trong code dùng logical 390px — Phaser tự scale lên màn hình thật

---

*Context created: 2026-03-14*
