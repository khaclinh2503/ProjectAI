# Requirements: Bloom Tap v1.2

**Defined:** 2026-03-25
**Core Value:** Cảm giác satisfying khi tap đúng thời điểm hoa nở rực rỡ — sự kết hợp giữa phản xạ nhanh và chiến thuật chọn hoa đúng lúc.

## v1.2 Requirements

### Lobby

- [x] **LOBBY-01**: Người chơi thấy màn hình lobby sau boot với 5 nút: Chơi Ngay, Vườn Hoa, Túi Đồ, BXH, Setting — Vườn Hoa/Túi Đồ/Setting hiển thị "Sắp ra mắt" khi nhấn
- [ ] **LOBBY-02**: Nhấn Chơi Ngay từ lobby → vào game; kết thúc ván → về lobby (không về trực tiếp màn chơi lại)

### Player Identity

- [x] **PLAYER-01**: Lần đầu chạy app, người chơi được yêu cầu nhập tên (tối đa 12 ký tự); tên lưu vào localStorage và hiển thị trên lobby

### Leaderboard

- [x] **LB-01**: Người chơi xem bảng xếp hạng offline top 10: hiển thị thứ hạng, tên, điểm số — persist qua localStorage
- [x] **LB-02**: Sau mỗi ván kết thúc, điểm tự động được lưu vào leaderboard nếu vào top 10; màn kết quả hiển thị thứ hạng đạt được

## Future Requirements

### v1.3 — Meta-game Loop

- **HARVEST-01**: Tap hoa FULL_BLOOM có xác suất nhận được hoa thực tế vào túi đồ
- **GARDEN-01**: Người chơi trồng hoa thu hoạch được trong vườn hoa
- **GARDEN-02**: Hoa trong vườn lên cấp → buff trong game (giảm thời gian phát triển, tăng bloom window)
- **GARDEN-03**: Hoa nở trong vườn tạo ra item dùng trong game chính

### v1.4 — Items & Buffs

- **ITEM-01**: Người chơi sử dụng item từ túi đồ trước hoặc trong game
- **ITEM-02**: Các loại item với hiệu ứng khác nhau (tăng điểm, kéo dài thời gian, v.v.)

### Art & Audio (chờ assets)

- **ART-01**: Sprite hoa thực (5 loại × 5 trạng thái)
- **ART-02**: Background/board visuals
- **ART-03**: UI elements (buttons, HUD, results)
- **AUDIO-01–05**: Sound effects (tap, wrong, combo, power-up, phase)

## Out of Scope (v1.2)

| Feature | Reason |
|---------|--------|
| Vườn hoa, túi đồ chức năng đầy đủ | v1.3 scope |
| BXH online | Cần backend + anti-cheat (v2+) |
| Art/Audio | Chờ assets |
| Multiple game modes | v1 phải hoàn hảo 1 mode trước |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LOBBY-01 | Phase 14 | Complete |
| LOBBY-02 | Phase 15 | Pending |
| PLAYER-01 | Phase 13 + Phase 14 | Complete |
| LB-01 | Phase 13 + Phase 14 | Complete |
| LB-02 | Phase 13 + Phase 15 | Complete |

**Coverage:**
- v1.2 requirements: 5 total
- Mapped to phases: 5/5 (100%) across Phases 13–15

---
*Requirements defined: 2026-03-25*
*Traceability updated: 2026-03-25 — Phases 13–15 assigned*
