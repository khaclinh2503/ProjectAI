# Bloom Tap

## What This Is

Bloom Tap là casual tapping game mobile trên bàn cờ 8x8. Các bông hoa nảy mầm và trải qua 5 trạng thái sinh trưởng — người chơi phải tap đúng thời điểm hoa nở để gom điểm trước khi hoa tàn. Mỗi ván kéo dài 120 giây, chia 3 giai đoạn độ khó tăng dần. Combo multiplier thưởng cho streak tap đúng liên tiếp. Highscore lưu giữa các session.

**Platform:** Web export (Cocos Creator 3.8.8 + TypeScript) — mobile native export sau v1

## Core Value

Cảm giác satisfying khi tap đúng thời điểm hoa nở rực rỡ — sự kết hợp giữa phản xạ nhanh và chiến thuật chọn hoa đúng lúc.

## Requirements

### Validated (v1.0)

- ✓ Bàn cờ 8x8, 64 ô tap riêng biệt — v1.0 (GridRenderer pre-allocated pooled nodes)
- ✓ 5 loại hoa, mỗi loại có tốc độ chu kỳ và điểm gốc khác nhau — v1.0 (FlowerTypes.ts, 5 FLOWER_CONFIGS)
- ✓ Chu kỳ hoa 5 trạng thái: Nụ → Nở Hé → Nở Rực Rỡ → Tàn → Chết — v1.0 (FlowerFSM, timestamp-based)
- ✓ Tap "Nở Hé" hoặc "Nở Rực Rỡ" để thu thập; Nở Rực Rỡ cho nhiều điểm hơn — v1.0
- ✓ Tap sai (Nụ hoặc Tàn/Chết) bị trừ điểm — v1.0 (penalty = 10)
- ✓ Hệ thống combo: tap liên tiếp đúng × điểm; multiplier tăng dần, reset khi tap sai — v1.0
- ✓ Ván chơi 120 giây, chia 3 giai đoạn spawn 0–40s/40–80s/80–120s — v1.0
- ✓ Điểm số và countdown timer realtime HUD — v1.0
- ✓ Juice: tap pulse, score float, red flash, combo break, milestone celebration, timer urgency — v1.0
- ✓ Màn kết quả: score + highscore + bestCombo + accuracy; NEW BEST! animation — v1.0
- ✓ Highscore persist qua localStorage (bloomtap_ prefix, silent-fail) — v1.0

## Shipped: v1.1 Polish & Power-ups (2026-03-25)

**12/15 requirements shipped** (ART-01/02/03 deferred — no sprite assets available)

Key additions:
- Config-driven flower types + spawn params từ JSON
- Hoa xuất hiện ngay khi bắt đầu (không delay 3s)
- 3 power-up special flowers: score multiplier, freeze time, slow growth
- Pause/resume với đầy đủ state preservation
- Bug fixes: combo label, screen shake, JuiceHelpers decoupling
- Score & combo visual effects: punch-in, color flash, zigzag float

**244 tests passing · 2,800+ LOC TypeScript**

[Full archive](milestones/v1.1-ROADMAP.md)

## Current Milestone: v1.2 Lobby & Leaderboard

**Goal:** Thêm màn hình lobby làm điểm trung tâm điều hướng và bảng xếp hạng offline top 10 — nền tảng cho meta-game loop sau này.

**Target features:**
- Lobby screen: Chơi Ngay, Vườn Hoa (placeholder), Túi Đồ (placeholder), BXH, Setting (placeholder)
- Flow: Boot → Lobby → Game → Results → Lobby
- Nhập tên người chơi (lần đầu, lưu localStorage)
- Bảng xếp hạng offline top 10 (tên + điểm, localStorage)

### Active (v1.2)

- [ ] **LOBBY-01:** Màn hình lobby với 5 nút điều hướng
- [ ] **LOBBY-02:** Flow Boot → Lobby → Game → Results → Lobby (thay Results → restart trực tiếp)
- [ ] **PLAYER-01:** Nhập tên người chơi lần đầu chạy app, lưu localStorage
- [ ] **LB-01:** Bảng xếp hạng offline top 10: hiển thị tên + điểm, lưu persist
- [ ] **LB-02:** Sau mỗi ván: tự động lưu score vào leaderboard nếu vào top 10

**Deferred to v1.3+:**
- Vườn hoa, túi đồ, thu hoạch hoa (meta-loop)
- Âm thanh, art (chờ assets)
- BXH online (v2+)

### Out of Scope

- Meta-progression / unlock hoa — v2+ (validate core loop trước)
- Online leaderboard — cần backend, anti-cheat (v2+)
- In-app purchase / monetization — v2+
- FB Instant Games integration — StorageService abstraction sẵn sàng; phần còn lại là v2 scope
- Multiple game modes / endless mode — v1 phải hoàn hảo 1 mode trước
- Tutorial / onboarding UI — giai đoạn 0–40s chậm là tutorial tự nhiên

## Context

**Current state (v1.1 shipped — 2026-03-25):**
- Phase 12 complete — score HUD punch+flash, combo punch-in per streak level, score float zigzag + gold color when multiplier active
- Phase 11 complete — combo label fix (x1.0 từ đầu), screen shake, JuiceHelpers decoupling
- Phase 10 complete — 3 power-up special flowers (SCORE_MULTIPLIER, TIME_FREEZE, SLOW_GROWTH), PowerUpHUDRenderer countdown arc
- Phase 09 complete — pause/resume với zero timer drift; GridRenderer.freezeAt()
- Phase 08 complete — flowers spawn immediately, initialCount=5 configurable
- Phase 07 complete — config-driven flowers.json + settings.json + BootController async load
- Bloom Tap v1.1 shipped (Cocos Creator HTML5 export)
- 2,800+ LOC TypeScript (game code) + 244/244 tests passing
- Architecture: pure logic tier (no cc imports) + Cocos renderer layer — fully separated
- StorageService in place for clean FB Instant Games migration path

**Tech stack:** Cocos Creator 3.8.8 · TypeScript strict · Vitest 3.2.4 · Web Mobile export

**Known issues:**
- comboLabel shows tapCount not multiplier (minor display bug)
- JuiceHelpers orphaned exports (dead code, no runtime impact)
- Phase 3 VERIFICATION.md missing (evidence in 03-03-SUMMARY human checkpoint)

## Constraints

- **Platform v1**: Web (HTML5 export) — test easily; v2 export native iOS/Android
- **Scope v1**: Core gameplay validated — expand from working foundation
- **Architecture**: Pure logic tier separation must be maintained (enables Vitest, enables FB port)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Cocos Creator + TypeScript | Mobile-native export built-in; TypeScript first-class | ✓ Good — clean architecture, fast iteration |
| Timestamp-based state derivation | Prevents timer drift over 120s session | ✓ Good — no drift observed |
| Object pools for 64 flower nodes + 8 float labels | Prevents GC spikes in hot tap loop | ✓ Good — no GC pauses |
| Pure logic tier (no cc imports) | Testable with Vitest in Node | ✓ Good — 150 tests, fast feedback |
| StorageService abstraction over localStorage | Enables FB Instant Games swap | ✓ Good — path clear for v2 |
| Score can go negative (no floor at 0) | Intentional penalty clarity | ✓ Good — accepted by playtest |
| Empty cell tap triggers wrong-tap penalty | Prevents dead flower race condition exploit | ✓ Good — discovered in Phase 3 verification |
| Input gate via flag pattern not add/remove listener | Prevents duplicate listener risk | ✓ Good — no listener leak |
| 5 loại hoa mở sẵn (không unlock) | Đơn giản hóa v1, tập trung core loop | ✓ Good — sufficient variety |
| Nở Rực Rỡ > Nở Hé về điểm | Risk/reward: đợi lâu = điểm cao hơn nhưng có thể lỡ | ✓ Good — creates natural tension |
| 3 giai đoạn spawn trong 120s | Arc cảm xúc tự nhiên: dễ vào → căng dần → bùng nổ | ✓ Good — confirmed in playtest |
| JuiceHelpers helpers inlined in GameController | Phase 5 execution inlined instead of importing | ⚠ Revisit — logic duplication, candidate for v1.1 refactor |

---
*Last updated: 2026-03-25 — v1.2 milestone started*
