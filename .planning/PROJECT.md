# Bloom Harvest

## What This Is

Bloom Harvest là casual game mobile về vườn hoa, nơi người chơi phải thu hoạch hoa đúng lúc chúng nở to nhất. Mỗi loài hoa có vòng đời riêng (nụ → nở → tàn) với tốc độ khác nhau — người chơi phải tap đúng thời điểm "nở bung" để ghi điểm cao. Game kết hợp gameplay timing/reaction với hệ thống sưu tập, nâng cấp, và trang trí vườn. Target: Mobile (iOS/Android) và Facebook Instant Games.

## Core Value

Cảm giác satisfying khi tap đúng khoảnh khắc hoa nở bung — timing hoàn hảo tạo ra vòng lặp reward không thể cưỡng lại.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Core Gameplay**
- [ ] Hoa trải qua 3 trạng thái: nụ → nở bung → tàn
- [ ] Mỗi loài hoa có tốc độ phát triển khác nhau
- [ ] Player tap "nở bung" → điểm cao; tap sai thời điểm → trừ điểm + mất hoa
- [ ] Vườn hoa cố định theo từng màn chơi (số lượng và loại hoa)
- [ ] Chế độ Campaign: level tăng dần độ khó (nhiều loài hoa, tốc độ nhanh hơn)
- [ ] Chế độ Endless: tốc độ tăng dần cho đến khi thua

**Hệ thống Hoa & Độ Hiếm**
- [ ] Phân loại hoa theo độ hiếm (Common → Rare → Epic → Legendary)
- [ ] Mỗi độ hiếm có multiplier điểm khác nhau
- [ ] Unlock hoa qua gameplay (level, quest) và gacha (dùng currency)
- [ ] Seasonal events: hoa đặc biệt theo mùa/sự kiện

**Bộ Sưu Tập & Progression**
- [ ] Bộ sưu tập hoa: xem tất cả hoa đã mở khóa
- [ ] Hệ thống nâng cấp: cải thiện tốc độ phát triển, tăng điểm thưởng
- [ ] Trang trí vườn: mua và sắp xếp vật trang trí

**Social & Engagement**
- [ ] Daily quest và hệ thống achievement
- [ ] Leaderboard: so sánh điểm với bạn bè và toàn cầu
- [ ] Chia sẻ điểm cao (khoe điểm)

**Monetization**
- [ ] Rewarded ads và interstitial ads
- [ ] IAP: premium currency, skin vườn, hoa hiếm

### Out of Scope

- Multiplayer real-time PvP — phức tạp, để sau v2
- Story/narrative — không phù hợp casual loop
- PC/Desktop build — focus mobile + FB Instant trước

## Context

- **Engine**: Cocos Creator (tốt cho mobile + HTML5/FB Instant Games)
- **Platform**: iOS, Android, Facebook Instant Games
- **Target audience**: Casual gamers, yêu thích theme hoa/thiên nhiên
- **Monetization model**: Hybrid Ads + IAP (phổ biến với casual mobile)
- **Seasonal content**: Cần hệ thống event để duy trì retention dài hạn

## Constraints

- **Platform**: Cocos Creator — phải support cả native mobile và WebGL/FB Instant
- **Performance**: FB Instant Games có giới hạn file size (~200MB), cần optimize assets
- **Monetization**: Tuân thủ chính sách ads của Apple, Google, Facebook

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Cocos Creator | Hỗ trợ cả mobile native và HTML5/FB Instant trong 1 codebase | — Pending |
| Hybrid Ads + IAP | Tối đa doanh thu casual, phù hợp behavior người chơi | — Pending |
| Gacha + Gameplay unlock | Gacha tăng monetization, gameplay unlock giữ F2P player | — Pending |
| Seasonal events | Tăng retention dài hạn, tạo lý do quay lại game | — Pending |

---
*Last updated: 2026-03-07 after initialization*
