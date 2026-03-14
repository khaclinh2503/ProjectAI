# Requirements: Bloom Tap

**Defined:** 2026-03-13
**Core Value:** Cảm giác satisfying khi tap đúng thời điểm hoa nở rực rỡ — sự kết hợp giữa phản xạ nhanh và chiến thuật chọn hoa đúng lúc.

## v1 Requirements

### Foundation

- [x] **FOUND-01**: Project chạy được trên browser với Cocos Creator + TypeScript
- [x] **FOUND-02**: Game canvas scale đúng trên mobile (DPR scaling, viewport lock)
- [ ] **FOUND-03**: Touch input chuẩn (không scroll trang, pointerdown events, touch-action: none)

### Grid

- [ ] **GRID-01**: 8x8 grid render với 64 ô tap riêng biệt
- [ ] **GRID-02**: Grid scale responsive theo màn hình mobile

### Flower

- [ ] **FLOW-01**: 5 loại hoa, mỗi loại có tốc độ chu kỳ và điểm gốc khác nhau
- [ ] **FLOW-02**: Mỗi hoa có 5 trạng thái: Nụ → Nở Hé → Nở Rực Rỡ → Tàn → Chết
- [ ] **FLOW-03**: 5 trạng thái nhìn là phân biệt được ngay, không cần đọc text
- [ ] **FLOW-04**: Hoa nảy mầm ở ô trống với tốc độ spawn có thể cấu hình theo phase

### Gameplay

- [ ] **GAME-01**: Tap "Nở Hé" thu thập hoa và cộng điểm gốc của loại hoa đó
- [ ] **GAME-02**: Tap "Nở Rực Rỡ" cộng nhiều điểm hơn "Nở Hé" cùng loại hoa
- [ ] **GAME-03**: Tap "Nụ" hoặc "Tàn/Chết" bị trừ điểm
- [ ] **GAME-04**: Tap đúng liên tiếp tăng combo multiplier; điểm tap đó được nhân với multiplier hiện tại
- [ ] **GAME-05**: Tap sai reset combo multiplier về 1

### Session

- [ ] **SESS-01**: Mỗi ván chính xác 120 giây
- [ ] **SESS-02**: Giai đoạn 1 (0–40s): spawn ngẫu nhiên chậm — học luật tự nhiên
- [ ] **SESS-03**: Giai đoạn 2 (40–80s): spawn đều ở tốc độ vừa, combo chain xuất hiện
- [ ] **SESS-04**: Giai đoạn 3 (80–120s): làn sóng spawn nhanh dồn dập
- [ ] **SESS-05**: Ván kết thúc khi timer về 0

### HUD

- [ ] **HUD-01**: Điểm số hiển thị và cập nhật realtime
- [ ] **HUD-02**: Countdown timer hiển thị suốt ván
- [ ] **HUD-03**: Combo multiplier hiện trên màn và có animation khi tăng

### Juice / Game Feel

- [ ] **JUICE-01**: Ô tap scale phồng lên rồi về khi nhấn (scale pulse ~100ms)
- [ ] **JUICE-02**: Điểm nổi lên từ ô hoa vừa tap ("+120 x3" float animation)
- [ ] **JUICE-03**: Visual flash khi tap sai và combo bị reset
- [ ] **JUICE-04**: Timer đổi màu hoặc nhấp nháy trong 15 giây cuối

### Results

- [ ] **RSLT-01**: Màn kết quả hiển thị điểm ván vừa chơi + highscore all-time
- [ ] **RSLT-02**: Người chơi có thể restart ngay từ màn kết quả
- [ ] **RSLT-03**: Highscore lưu giữ giữa các session qua localStorage

## v2 Requirements

### Polish

- **POLSH-01**: Sound effects (tap đúng, tap sai, combo, phase change, game over)
- **POLSH-02**: Phase transition cue — visual/audio signal khi bước vào phase 2 và 3
- **POLSH-03**: Results screen score count-up animation (đếm lên thay vì hiện ngay)
- **POLSH-04**: Screen shake ngắn khi tap sai
- **POLSH-05**: Flower sprite transition micro-animations giữa các trạng thái

### Platform

- **PLAT-01**: FB Instant Games integration (async init, FBInstant.player.setDataAsync storage)
- **PLAT-02**: Mobile app packaging (PWA hoặc Capacitor wrapper)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Meta-progression / unlock hoa | v2+ — cần validate core loop trước, không thêm scope cho v1 |
| Online leaderboard | Cần backend, auth, anti-cheat — scope quá lớn cho v1 chưa có audience |
| Tutorial / onboarding UI | Phase 1 (0-40s) chậm chính là tutorial tự nhiên — không cần UI riêng |
| Multiple game modes | Dilutes focus — v1 phải hoàn hảo 1 mode trước |
| Power-ups / special tiles | Combo multiplier ĐÃ là cơ chế depth — không cần thêm |
| Endless mode (không timer) | Đây là game khác hoàn toàn, không phải variant |
| In-app purchase / monetization | Cần audience trước, không premature |
| Particle-heavy VFX từ đầu | Đầu tư art trước khi validate gameplay là lãng phí |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 1 | Pending |
| GRID-01 | Phase 2 + 3 | Pending |
| GRID-02 | Phase 2 + 3 | Pending |
| FLOW-01 | Phase 2 | Pending |
| FLOW-02 | Phase 2 | Pending |
| FLOW-03 | Phase 3 | Pending |
| FLOW-04 | Phase 2 | Pending |
| GAME-01 | Phase 3 | Pending |
| GAME-02 | Phase 3 | Pending |
| GAME-03 | Phase 3 | Pending |
| GAME-04 | Phase 4 | Pending |
| GAME-05 | Phase 4 | Pending |
| SESS-01 | Phase 4 | Pending |
| SESS-02 | Phase 4 | Pending |
| SESS-03 | Phase 4 | Pending |
| SESS-04 | Phase 4 | Pending |
| SESS-05 | Phase 4 | Pending |
| HUD-01 | Phase 4 | Pending |
| HUD-02 | Phase 4 | Pending |
| HUD-03 | Phase 4 | Pending |
| JUICE-01 | Phase 5 | Pending |
| JUICE-02 | Phase 5 | Pending |
| JUICE-03 | Phase 5 | Pending |
| JUICE-04 | Phase 5 | Pending |
| RSLT-01 | Phase 6 | Pending |
| RSLT-02 | Phase 6 | Pending |
| RSLT-03 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0

---
*Requirements defined: 2026-03-13*
*Last updated: 2026-03-13 after roadmap creation (traceability populated)*
