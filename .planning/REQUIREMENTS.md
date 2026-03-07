# Bloom Harvest — Requirements

## v1 Requirements

### Core — Flower Lifecycle

- [ ] **CORE-01**: Mỗi bông hoa trải qua 3 trạng thái rõ ràng: Nụ (bud) → Nở bung (full bloom) → Tàn (wilt)
- [ ] **CORE-02**: Mỗi trạng thái có animation/visual riêng biệt, dễ phân biệt
- [ ] **CORE-03**: Tốc độ phát triển của từng loài hoa khác nhau (5 loài, 5 tốc độ)
- [ ] **CORE-04**: Thời gian "nở bung" có cửa sổ tap nhất định (không quá dài, không quá ngắn)

### Core — Tap Timing & Scoring

- [ ] **SCORE-01**: Player tap vào hoa đang "nở bung" → thu hoạch được, nhận điểm dương
- [ ] **SCORE-02**: Player tap vào hoa đang "nụ" hoặc "tàn" → trừ điểm + mất hoa
- [ ] **SCORE-03**: Điểm thưởng tỉ lệ với độ chính xác (tap giữa cửa sổ = điểm max)
- [ ] **SCORE-04**: Hiển thị điểm realtime trên màn hình trong khi chơi
- [ ] **SCORE-05**: Hiển thị tổng điểm khi kết thúc màn

### Core — Flower Species (5 loài)

- [ ] **FLORA-01**: 5 loài hoa với tốc độ phát triển khác nhau (rất chậm → rất nhanh)
- [ ] **FLORA-02**: Mỗi loài hoa có visual design riêng (màu sắc, hình dạng)
- [ ] **FLORA-03**: Mỗi loài hoa có giá trị điểm cơ bản khác nhau

### Core — Juice & Feedback

- [ ] **JUICE-01**: Particle burst khi tap đúng lúc "nở bung"
- [ ] **JUICE-02**: Sound effect riêng cho: tap đúng (rewarding), tap sai (punishing), hoa tàn tự nhiên
- [ ] **JUICE-03**: Visual feedback ngay lập tức khi tap (không có input lag cảm nhận được)
- [ ] **JUICE-04**: Số điểm float lên tại vị trí tap ("+100", "-50")

### Gameplay — Level & Garden

- [ ] **LEVEL-01**: 1 màn chơi cố định để test tính năng (vườn với số lượng hoa nhất định)
- [ ] **LEVEL-02**: Màn kết thúc khi tất cả hoa trong vườn đã được thu hoạch hoặc tàn
- [ ] **LEVEL-03**: Màn hình kết quả sau khi chơi xong (điểm, số hoa thu hoạch, số hoa bị bỏ lỡ)

### Tutorial

- [ ] **TUT-01**: Tutorial tương tác hướng dẫn cơ chế nụ → nở → tàn
- [ ] **TUT-02**: Tutorial chỉ cần hoàn thành 1 lần, không lặp lại

### Platform & Technical

- [ ] **TECH-01**: Chạy trên Mobile (iOS + Android) qua Cocos Creator build
- [ ] **TECH-02**: Chạy trên Facebook Instant Games (HTML5/WebGL)
- [ ] **TECH-03**: Timing logic dùng wall-clock milliseconds (không phụ thuộc frame rate)
- [ ] **TECH-04**: Asset Bundle architecture đảm bảo FB Instant initial payload < 5MB
- [ ] **TECH-05**: Save/load trạng thái game (platform abstraction: FB Instant vs localStorage)

---

## v2 Requirements (Deferred)

### Collection & Gacha
- Hệ thống độ hiếm 4 bậc (Common → Legendary)
- Florarium / bộ sưu tập view
- Gacha system với pity mechanism
- Seasonal event hoa đặc biệt

### Progression
- Upgrade hoa (tốc độ phát triển, multiplier điểm)
- Currency system (kiếm và tiêu)
- Daily quests + achievements
- Login streak

### Social
- Global + Friends leaderboard
- Chia sẻ điểm cao lên mạng xã hội

### Monetization
- Rewarded Ads (đổi extra time / lives)
- Interstitial Ads (giữa màn)
- IAP: remove ads, currency bundles, hoa hiếm

### Content
- Campaign: 15+ levels với vườn khác nhau
- Endless mode
- Trang trí vườn (cosmetics)

---

## Out of Scope

- Multiplayer real-time PvP — phức tạp, sẽ không làm
- Story/narrative mode — không phù hợp casual loop
- PC/Desktop build — focus mobile + FB Instant
- Web browser (non-FB) — ngoài target platform

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| TECH-01 | Phase 1 — Project Foundation | Pending |
| TECH-02 | Phase 1 — Project Foundation | Pending |
| TECH-04 | Phase 1 — Project Foundation | Pending |
| TECH-03 | Phase 2 — Save & Timing Infrastructure | Pending |
| TECH-05 | Phase 2 — Save & Timing Infrastructure | Pending |
| CORE-01 | Phase 3 — Flower Lifecycle System | Pending |
| CORE-02 | Phase 3 — Flower Lifecycle System | Pending |
| CORE-03 | Phase 3 — Flower Lifecycle System | Pending |
| CORE-04 | Phase 3 — Flower Lifecycle System | Pending |
| FLORA-01 | Phase 4 — Flower Species Content | Pending |
| FLORA-02 | Phase 4 — Flower Species Content | Pending |
| FLORA-03 | Phase 4 — Flower Species Content | Pending |
| SCORE-01 | Phase 5 — Tap Detection & Scoring | Pending |
| SCORE-02 | Phase 5 — Tap Detection & Scoring | Pending |
| SCORE-03 | Phase 5 — Tap Detection & Scoring | Pending |
| SCORE-04 | Phase 5 — Tap Detection & Scoring | Pending |
| JUICE-01 | Phase 6 — Juice & Feedback | Pending |
| JUICE-02 | Phase 6 — Juice & Feedback | Pending |
| JUICE-03 | Phase 6 — Juice & Feedback | Pending |
| JUICE-04 | Phase 6 — Juice & Feedback | Pending |
| LEVEL-01 | Phase 7 — Level & Garden Shell | Pending |
| LEVEL-02 | Phase 7 — Level & Garden Shell | Pending |
| LEVEL-03 | Phase 7 — Level & Garden Shell | Pending |
| SCORE-05 | Phase 7 — Level & Garden Shell | Pending |
| TUT-01 | Phase 8 — Tutorial | Pending |
| TUT-02 | Phase 8 — Tutorial | Pending |
