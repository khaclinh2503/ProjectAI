# Phase 13: LeaderboardService - Discussion Log

**Date:** 2026-03-25
**Mode:** Interactive discuss-phase

---

## Area Selection

**Q:** Which gray areas to discuss for Phase 13?
**A:** All 3 — Same-player dedup, getRank boundary, Entry data shape

---

## Same-player dedup

**Q:** Nếu "Alice" chơi 3 lần (500, 300, 700 điểm), leaderboard hiển thị thế nào?

**Options presented:**
- Chỉ giữ best score (Alice xuất hiện 1 lần với 700 điểm)
- Giữ tất cả entries (Alice xuất hiện 3 lần: 700, 500, 300)

**A:** Giữ tất cả — là top 10 lượt chơi, không phải top 10 người. Thêm cả thông tin về thời gian khi đạt điểm để phân biệt.

**Decision captured:** D-01, D-02, D-03 in CONTEXT.md

---

## getRank boundary

**Q:** getRank(score) trả về gì khi score không đủ vào top 10?

**Options presented:**
- null (results screen hiển thị "10+" khi thấy null)
- Số thực tế (11, 12...) để results screen tự format

**A:** "Hãy ghi là 10+." → "10+ nhé" (confirmed on follow-up)

**Decision captured:** D-04 in CONTEXT.md — user wants visible result to be "10+"; planner decides concrete return type.

---

## Entry data shape

**Decision:** Captured from same-player dedup discussion — user explicitly requested timestamp be included in every entry to distinguish entries with same score.

**Decision captured:** D-01, D-02 in CONTEXT.md — `{ name, score, timestamp }`.

---

*Log generated: 2026-03-25*
