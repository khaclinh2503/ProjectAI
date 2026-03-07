# Phase 2: Save & Timing Infrastructure - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Xây dựng wall-clock millisecond timing system và unified save abstraction hoạt động trên cả native (localStorage) và FB Instant (FBInstant.player.setDataAsync). Chưa có gameplay logic — chỉ là infrastructure plumbing phục vụ các phase sau.

</domain>

<decisions>
## Implementation Decisions

### Timing System
- Tất cả bloom window boundary dùng wall-clock milliseconds (`Date.now()`) — không bao giờ dùng frame count hoặc dt accumulation (đã khóa từ project init)
- Timing system expose API cho gameplay code query trạng thái bloom

### Phạm vi dữ liệu lưu
- Lưu: high score, tiến trình level/campaign, danh sách hoa đã unlock, level nâng cấp per-flower, player settings
- Schema nâng cấp hoa: per-flower level — `{ rose: 3, tulip: 1, ... }`
- **Không** lưu mid-session state — nếu crash giữa level thì restart từ đầu level đó (acceptable với casual game)
- Data loss khi xoá app trên native (iOS/Android) là chấp nhận được — không cần cloud save cho v1

### Save Trigger Policy
- Save được trigger: (1) sau khi kết thúc level, (2) sau khi upgrade hoặc unlock hoa
- **Không** save khi app vào background
- Save chạy nền (non-blocking) — không block UI trong khi save

### Xử lý khi Save Thất Bại
- FBInstant.setDataAsync fail: silent fail + retry 1 lần sau vài giây
- Sau retry vẫn lỗi: log vào console ở development build, im lặng ở production
- Load data lúc khởi động fail hoặc không có data (lần đầu): khởi động với default state, không hiển thị thông báo lỗi

### Platform Abstraction
- Tất cả SDK calls (localStorage, FBInstant) đi qua platform adapter class — không có direct SDK import trong gameplay code (đã khóa từ project init)
- SaveSystem interface chung cho cả 2 backend — swapping backend không cần thay gameplay scripts

### Claude's Discretion
- Cấu trúc cụ thể của SaveData type/interface
- Thời gian delay trước khi retry (vài giây)
- Tên class và method cụ thể của SaveSystem

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Chưa có code (Phase 1 chưa được execute) — Phase 2 sẽ xây từ đầu

### Established Patterns
- Engine: Cocos Creator — TypeScript
- Platform adapter pattern đã được quyết định: mọi SDK call đi qua adapter

### Integration Points
- Gameplay scripts (Phase 3+) sẽ gọi vào SaveSystem để read/write state
- Timing system sẽ được dùng bởi flower lifecycle system (Phase 3) và tap detection (Phase 5)

</code_context>

<specifics>
## Specific Ideas

- Không có yêu cầu cụ thể — open to standard approaches cho timing và save API design

</specifics>

<deferred>
## Deferred Ideas

- Cloud save / cross-device sync — ngoài scope v1
- Save khi app vào background — có thể thêm sau nếu cần
- Analytics tracking save failures — v2

</deferred>

---

*Phase: 02-save-timing-infrastructure*
*Context gathered: 2026-03-07*
