# Requirements: Bloom Tap v1.1

**Defined:** 2026-03-17
**Core Value:** Cảm giác satisfying khi tap đúng thời điểm hoa nở rực rỡ — sự kết hợp giữa phản xạ nhanh và chiến thuật chọn hoa đúng lúc.

## v1.1 Requirements

### Config

- [x] **CFG-01**: Người dùng có thể chỉnh flower types (tốc độ chu kỳ, điểm gốc, tên) qua file JSON mà không cần recompile
- [x] **CFG-02**: Người dùng có thể chỉnh spawn parameters (initialCount, maxAlive per phase, spawn interval per phase) qua file JSON
- [x] **CFG-03**: Game hiển thị lỗi rõ ràng khi config JSON sai format, không crash silent — tất cả game params đều data-driven để playtest nhanh

### Spawn

- [x] **SPAWN-01**: Hoa xuất hiện ngay khi game bắt đầu (không delay 3 giây), số lượng ban đầu configurable từ JSON

### Pause

- [x] **PAUSE-01**: Người chơi có thể pause game bất cứ lúc nào và tiếp tục từ đúng trạng thái đó (timer, hoa, combo đều giữ nguyên)

### Special Flowers

- [ ] **SPECIAL-01**: Hoa đặc biệt xuất hiện ngẫu nhiên trên bàn với visual riêng biệt, tần suất configurable từ JSON
- [ ] **SPECIAL-02**: Người chơi tap hoa đặc biệt để kích hoạt score multiplier (x2–x5) cho tất cả hoa trong khoảng thời gian configurable (~6 giây)
- [ ] **SPECIAL-03**: Người chơi tap hoa đặc biệt để freeze đồng hồ đếm ngược trong khoảng thời gian configurable (~5 giây)
- [ ] **SPECIAL-04**: Người chơi tap hoa đặc biệt để làm chậm tốc độ phát triển của hoa mới trong khoảng thời gian configurable (~8 giây) — window tap rộng hơn

### Bug Fixes & Refactors

- [ ] **FIX-01**: comboLabel hiển thị `x1.0` từ đầu ván và tăng dần theo multiplier (không hiện tapCount)
- [ ] **FIX-02**: Màn hình rung khi tap sai
- [ ] **FIX-03**: GameController sử dụng JuiceHelpers exports thay vì inline logic trùng lặp

### Art Refresh

- [ ] **ART-01**: 5 loại hoa x 5 trạng thái được render bằng sprite thực thay thế placeholder màu
- [ ] **ART-02**: Background và lưới bàn cờ có visual cải thiện
- [ ] **ART-03**: UI elements (buttons, HUD, results screen) có visual cải thiện

## Future Requirements

### Audio

- **AUDIO-01**: Sound effect khi tap đúng
- **AUDIO-02**: Sound effect khi tap sai
- **AUDIO-03**: Sound effect khi đạt combo milestone
- **AUDIO-04**: Sound effect khi power-up kích hoạt
- **AUDIO-05**: Sound effect khi phase transition

### Polish

- **POLISH-01**: Phase transition visual cue khi bước vào Phase 2 (40s) và Phase 3 (80s)
- **POLISH-02**: Results screen score count-up animation
- **POLISH-03**: Pity mechanic — đảm bảo ít nhất 1 special flower mỗi 30s nếu chưa xuất hiện

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multiple simultaneous power-up effects | Exponential score explosion phá vỡ balance leaderboard — replacement semantics only |
| Hot-reload JSON config | Cần WebSocket server, không khả dụng trong HTML5 export runtime |
| Power-up upgrades / meta-progression | v2+ scope — validate core loop trước |
| Multiple special flower types (rarity tiers) | v2+ scope |
| Online leaderboard | Cần backend + anti-cheat (v2+) |
| Sprite animation per flower cell | 64 animated cells spike render cost trên mobile — static sprite-per-state là đúng |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CFG-01 | Phase 7 | Complete |
| CFG-02 | Phase 7 | Complete |
| CFG-03 | Phase 7 | Complete |
| SPAWN-01 | Phase 8 | Complete |
| PAUSE-01 | Phase 9 | Complete |
| SPECIAL-01 | Phase 10 | Pending |
| SPECIAL-02 | Phase 10 | Pending |
| SPECIAL-03 | Phase 10 | Pending |
| SPECIAL-04 | Phase 10 | Pending |
| FIX-01 | Phase 11 | Pending |
| FIX-02 | Phase 11 | Pending |
| FIX-03 | Phase 11 | Pending |
| ART-01 | Phase 12 | Pending |
| ART-02 | Phase 12 | Pending |
| ART-03 | Phase 12 | Pending |

**Coverage:**
- v1.1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-17 after v1.1 roadmap creation — traceability complete*
