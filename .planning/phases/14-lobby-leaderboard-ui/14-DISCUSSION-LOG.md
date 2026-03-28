# Phase 14: Lobby & Leaderboard UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 14-lobby-leaderboard-ui
**Areas discussed:** Name input prompt, Leaderboard display, Lobby layout

---

## Name Input Prompt

**Q: Khi lần đầu chạy app (chưa có tên), prompt nhập tên xuất hiện như thế nào?**
- Options: Modal overlay trên LobbyScene / Trước LobbyScene — scene/step riêng
- **Selected:** Modal overlay trên LobbyScene

**Q: Nút Confirm trong overlay nhập tên hoạt động thế nào khi field trống?**
- Options: Disable nút khi chưa nhập / Enable nút, báo lỗi khi tap
- **Selected:** Disable nút khi chưa nhập

**Q: Sau khi confirm tên, overlay đóng ra sao?**
- Options: Fade out rồi ẩn / Ẩn ngược (instant)
- **Selected:** Fade out rồi ẩn (~0.3s UIOpacity tween)

---

## Leaderboard Display

**Q: Khi nhấn BXH từ Lobby, màn bảng xếp hạng xuất hiện thế nào?**
- Options: Scene mới LeaderboardScene / Overlay panel trên LobbyScene
- **Selected:** Scene mới LeaderboardScene (director.loadScene)

**Q: Khi bảng xếp hạng chưa có entry nào (empty state), hiện gì?**
- Options: Text đơn giản / 10 dòng placeholder
- **Selected:** Text đơn giản — "Chưa có ai lên bảng. Hãy chơi ngay!"

---

## Lobby Layout

**Q: 5 nút trong LobbyScene sắp xếp thế nào?**
- Options: Dọc (vertical stack) / Grid 2-3 cột
- **Selected:** Dọc (vertical stack) — title + greeting + 5 nút dọc

**Q: Lobby có title game và background không?**
- Options: Title text + solid background / Không title
- **Selected:** Title text + solid background

**Q: "Sắp ra mắt" feedback khi nhấn Vườn Hoa / Túi Đồ / Setting hiện thế nào?**
- Options: Toast nhỏ fade in/out / Alert dialog
- **Selected:** Toast nhỏ fade in/out (~1.5s, không block UI)

---

*Discussion completed: 2026-03-28*
