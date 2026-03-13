# Bloom Tap

## What This Is

Bloom Tap là casual game mobile dạng tapping trên bàn cờ 8x8. Các bông hoa nảy mầm và trải qua chu kỳ sinh trưởng tự nhiên — người chơi phải tap đúng thời điểm hoa nở để gom điểm trước khi hoa tàn. Mỗi ván kéo dài 120 giây với độ khó tăng dần qua 3 giai đoạn.

## Core Value

Cảm giác satisfying khi tap đúng thời điểm hoa nở rực rỡ — sự kết hợp giữa phản xạ nhanh và chiến thuật chọn hoa đúng lúc.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Bàn cờ 8x8, mỗi ô có thể chứa một bông hoa
- [ ] 5 loại hoa mở sẵn từ đầu, mỗi loại có tốc độ chu kỳ và điểm khác nhau
- [ ] Chu kỳ hoa: Nụ → Nở Hé → Nở Rực Rỡ → Tàn → Chết
- [ ] Tap "Nở Hé" hoặc "Nở Rực Rỡ" để thu thập — Nở Rực Rỡ cho nhiều điểm hơn
- [ ] Tap sai (Nụ hoặc Tàn/Chết) bị trừ điểm
- [ ] Hệ thống combo: tap liên tiếp đúng × điểm của bông hoa đó
- [ ] Ván chơi 120 giây, chia 3 giai đoạn:
  - 0–40s: Spawn ngẫu nhiên chậm (làm quen)
  - 40–80s: Spawn đều, combo chain xuất hiện
  - 80–120s: Làn sóng nhanh dồn dập (bùng nổ cuối ván)
- [ ] Hiển thị điểm số realtime và countdown timer
- [ ] Màn hình kết quả cuối ván (score, highscore)

### Out of Scope

- Meta-progression / unlock hoa mới — để version sau, v1 tập trung core gameplay
- Multiplayer / leaderboard online — v1 chỉ cần local highscore
- In-app purchase / monetization — v2+
- FB Instant Games / mobile app build — target sau khi core game hoàn thiện
- Visual style cố định — quyết định sau khi có prototype chạy được

## Context

- Game nhắm đến casual players trên Mobile và FB Instant Games (long-term)
- V1 build như web game (HTML5/Canvas hoặc framework game) để dễ port sau
- Độ khó tăng tự nhiên qua 3 giai đoạn 120s — không cần level system riêng ở v1
- Combo multiplier là cơ chế chiều sâu chính: tap nhanh đúng × điểm cao hơn

## Constraints

- **Platform v1**: Web (HTML5) — dễ test, dễ port sang mobile/FB Instant sau
- **Scope v1**: Core gameplay only — 5 hoa, 1 game mode, local highscore
- **Visual**: Chưa cố định — cần prototype gameplay trước khi đầu tư art

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 5 loại hoa mở sẵn từ đầu (không unlock) | Đơn giản hóa v1, tập trung balance core loop | — Pending |
| Nở Rực Rỡ > Nở Hé về điểm | Tạo risk/reward — đợi lâu hơn = điểm cao hơn nhưng có thể lỡ | — Pending |
| Tap sai bị trừ điểm (không phải freeze) | Tạo penalty rõ ràng, thúc đẩy chú ý hơn | — Pending |
| 3 giai đoạn tốc độ trong 120s | Tạo arc cảm xúc tự nhiên — dễ vào → căng dần → bùng nổ | — Pending |

---
*Last updated: 2026-03-13 after initialization*
