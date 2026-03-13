# Phase 2 Context: Core Game Logic

**Phase:** 2 — Core Game Logic
**Goal:** Pure, testable TypeScript — FlowerFSM, Grid, ComboSystem, SpawnManager — no canvas dependency
**Created:** 2026-03-14
**Requirements:** GRID-01, GRID-02, FLOW-01, FLOW-02, FLOW-04

---

## 1. Config 5 Loại Hoa

### Bảng thông số

| Loài | Type ID | Chu kỳ | Tap Window | BLOOMING (2/3) | FULL_BLOOM (1/3) | Tàn | Chết | Điểm Nở Hé | Điểm Nở Rực Rỡ |
|------|---------|--------|-----------|----------------|------------------|-----|------|------------|----------------|
| Anh Đào | CHERRY | 3s | 30% (0.9s) | 0.6s | 0.3s | 0.45s | 0.3s | 80đ | 120đ |
| Sen | LOTUS | 4.5s | 40% (1.8s) | 1.2s | 0.6s | 0.63s | 0.36s | 60đ | 90đ |
| Cúc | CHRYSANTHEMUM | 6s | 50% (3s) | 2s | 1s | 0.78s | 0.42s | 40đ | 60đ |
| Hồng | ROSE | 8s | 60% (4.8s) | 3.2s | 1.6s | 0.88s | 0.48s | 25đ | 40đ |
| Hướng Dương | SUNFLOWER | 10s | 70% (7s) | 4.67s | 2.33s | 0.8s | 0.5s | 15đ | 25đ |

Thời gian BUD = chu kỳ − tap window − tàn − chết (xem bảng trên).

### Công thức tính điểm khi tap

Điểm nội suy tuyến tính theo vị trí trong toàn bộ tap window:

```
score = điểm_Nở_Hé + (t / tap_window) × (điểm_Nở_Rực_Rỡ - điểm_Nở_Hé)
```

- `t` = giây đã trôi qua kể từ đầu BLOOMING
- `tap_window` = tổng thời gian BLOOMING + FULL_BLOOM
- Score tăng liên tục từ điểm_Nở_Hé đến điểm_Nở_Rực_Rỡ

### Công thức penalty khi tap sai

| Trường hợp | Công thức |
|-----------|-----------|
| Tap ô trống | −20đ cố định |
| Tap BUD | −(giây còn lại đến BLOOMING × điểm_Nở_Rực_Rỡ) |
| Tap WILTING/DEAD | −(giây đã tàn × điểm_Nở_Rực_Rỡ) |

- Tính theo **giây thực** (không phải % chu kỳ)
- Score có thể âm trong ván, tổng kết cuối ván floor về 0

---

## 2. FlowerFSM State Machine

### 6 trạng thái

```
BUD → BLOOMING → FULL_BLOOM → WILTING → DEAD → [auto-clear]
                     ↓
                 COLLECTED → EMPTY
```

| State | Mô tả |
|-------|-------|
| `BUD` | Hoa đang nảy mầm, chưa tap được |
| `BLOOMING` | Tap window bắt đầu (2/3 tap window) |
| `FULL_BLOOM` | Tap window cuối (1/3 tap window), điểm cao nhất |
| `WILTING` | Hoa đang tàn, tap bị phạt |
| `DEAD` | Hoa đã chết, tap bị phạt |
| `COLLECTED` | Tap FULL_BLOOM thành công — giữ brief để Phase 3 chạy effect |

### Hành vi khi tap

- **Tap BLOOMING** → cell xóa ngay lập tức (`EMPTY`)
- **Tap FULL_BLOOM** → chuyển sang `COLLECTED`, Phase 3 chạy effect điểm cao, sau đó `EMPTY`
- `COLLECTED` không cho spawn hoa mới vào cell

### Auto-clear sau DEAD

- Hết thời gian DEAD → cell đánh dấu là cleared (Phase 3 xử lý fade-out animation)
- Cell về `EMPTY` sau khi animation hoàn tất

### Cách tính state

FlowerFSM dùng timestamp-based derivation (KHÔNG dùng delta accumulation):

```
state = f(performance.now() - spawnTimestamp, flowerTypeConfig)
```

---

## 3. Combo System

### Quy tắc multiplier

- Khởi đầu: multiplier = **1×**, step = **0.5**, tapCount = **0**
- Mỗi tap đúng: `multiplier += currentStep`, `tapCount += 1`
- Tại các ngưỡng tapCount → step giảm còn ½:

| Ngưỡng tap đúng liên tiếp | Bước nhảy | Multiplier đạt được |
|--------------------------|-----------|-------------------|
| Tap 1–10 | +0.5 | lên đến **6×** |
| Tap 11–50 | +0.25 | lên đến **16×** |
| Tap 51–100 | +0.125 | lên đến **22.25×** |
| Tap 101+ | +0.125 (không giảm thêm) | tiếp tục tăng |

### Reset

- **Tap sai** → multiplier về `1×`, step về `0.5`, tapCount về `0`
- **Hoa tàn không tap** → không ảnh hưởng combo *(pending — review sau playtesting)*

### Áp dụng multiplier

```
finalScore = interpolatedScore × currentMultiplier
```

---

## 4. SpawnManager

### Cơ chế

- **Interval-based + max alive cap**
- Cứ mỗi X giây → thử spawn 1 hoa vào ô trống ngẫu nhiên
- Nếu số hoa đang sống ≥ N → **skip**, đợi interval tiếp theo (không retry)

### Config 3 giai đoạn

| Giai đoạn | Thời gian | Interval (X) | Max alive (N) |
|-----------|-----------|-------------|---------------|
| Phase 1 | 0–40s | 3s | 8 hoa |
| Phase 2 | 40–80s | 2s | 16 hoa |
| Phase 3 | 80–120s | 1s | 28 hoa |

### Trọng số loại hoa theo giai đoạn

| Loài | Phase 1 | Phase 2 | Phase 3 |
|------|---------|---------|---------|
| Hướng Dương | 35% | 15% | 5% |
| Hồng | 30% | 20% | 10% |
| Cúc | 20% | 30% | 20% |
| Sen | 10% | 20% | 30% |
| Anh Đào | 5% | 15% | 35% |

Phase 1 ưu tiên hoa chậm (tap window rộng, dễ học). Phase 3 ưu tiên hoa nhanh (cần phản xạ tốt, penalty nặng nếu sai).

*Tất cả giá trị để nguyên test — tune lại sau playtesting Phase 4.*

---

## Deferred Decisions

| Quyết định | Ghi chú |
|-----------|---------|
| Combo reset khi hoa tàn không tap | Hiện tại không ảnh hưởng — review sau playtesting |
| Balance giá trị spawn rate / max alive | Tune sau khi có Phase 3 chạy được |
| Thời lượng COLLECTED state | Phase 3 quyết định dựa theo animation duration |

---

## Code Context

- Không có code nào (Phase 1 chưa thực thi)
- Tất cả logic Phase 2 là pure TypeScript, không import Phaser
- FlowerFSM dùng `performance.now()` — nhất quán với kiến trúc timestamp-based đã ghi trong STATE.md
- Grid là flat 64-cell array, không phụ thuộc rendering

---

*Context created: 2026-03-14*
