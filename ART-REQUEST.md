# Bloom Tap — Art Request Brief

**Game:** Bloom Tap — casual tapping game, bàn cờ 8×8, mobile web  
**Engine:** Cocos Creator 3.8.8 (TypeScript)  
**Design resolution:** 720 × 1280 px (portrait)  
**Style:** "Moonlight Garden" — Flat + soft glow. Hoa phát sáng nhẹ trên nền tối như vườn hoa dưới ánh trăng. Mystical nhưng cute.

---

## 1. Flower Sprites (ART-01) — CRITICAL

Mỗi hoa cần **5 frame riêng biệt** tương ứng 5 trạng thái game:

| State | Mô tả | Scale in-game | Gợi ý visual |
|-------|-------|---------------|--------------|
| **BUD** | Nụ chưa mở | 30% | Nụ nhỏ, tối màu, chưa thấy cánh — gần như silhouette |
| **BLOOMING** | Đang nở hé | 60% | Hoa hé nửa, màu cánh bắt đầu hiện, glow yếu |
| **FULL_BLOOM** | Nở rực rỡ ★ | 100% | Hoa mở hoàn toàn, cánh rực + **outer glow ~8px** cùng màu hoa — đây là trạng thái tap đẹp nhất |
| **WILTING** | Tàn | 85% | Cánh cụp, màu desaturate, glow tắt |
| **DEAD** | Chết | 50% | Cánh rụng/khô, gần xám, không còn glow |

### 5 loại hoa cần vẽ:

| ID | Loài | Màu chủ đạo | Tốc độ chu kỳ | Điểm gốc |
|----|------|-------------|---------------|----------|
| `cherry` | Hoa anh đào | `#FFB7C5` → `#FF6B9D` (hồng phấn → hồng đậm) | Nhanh nhất (3s) | 10 |
| `lotus` | Hoa sen | `#E040FB` → `#9C27B0` (tím hồng → tím đậm) | Nhanh (4.5s) | 20 |
| `chrysanthemum` | Cúc | `#FFD54F` → `#FF8F00` (vàng → cam) | Trung bình (6s) | 30 |
| `rose` | Hồng | `#FF5252` → `#C62828` (đỏ tươi → đỏ đậm) | Chậm (8s) | 50 |
| `sunflower` | Hướng dương | `#FFEE58` → `#F9A825` (vàng sáng → vàng gold) | Chậm nhất (10s) | 80 |

### Spec kỹ thuật:
- **Kích thước canvas sprite:** 128 × 128 px (hiển thị trong ô 68×68 px, có padding)
- **Background:** Trong suốt (PNG với alpha)
- **Format:** PNG
- **Tên file:** `{loai}_{state}.png` — ví dụ: `cherry_bud.png`, `cherry_blooming.png`, `rose_full_bloom.png`
- **Đường dẫn đặt vào:** `BloomTap/assets/resources/flowers/{loai}/{state}.png`

> Tổng: 5 loài × 5 trạng thái = **25 sprites**

---

## 2. Cell Background Sprites (ART-02) — HIGH

Nền ô trên bàn cờ 8×8. Hiện tại render bằng code `Graphics`, cần thay bằng sprite.
Có **4 loại ô** — mỗi loại 1 file PNG riêng.

| File | Dùng khi | Kích thước |
|------|----------|-----------|
| `cell_empty.png` | Ô thường — không có hoa hoặc hoa bình thường | 72 × 72 px |
| `cell_fire.png` | Ô chứa hoa **Score Multiplier** (×2 điểm) | 72 × 72 px |
| `cell_freeze.png` | Ô chứa hoa **Time Freeze** (đóng băng đồng hồ) | 72 × 72 px |
| `cell_grass.png` | Ô chứa hoa **Slow Growth** (hoa nở chậm lại) | 72 × 72 px |

### Mô tả chi tiết từng loại:

**`cell_empty.png`**
- Màu nền: `#2A1F3D` (tím xỉn tối)
- Bo góc radius ~8px
- Không có glow, không có viền nổi bật
- Subtle texture nhẹ hoặc flat thuần đều được

**`cell_fire.png`** — Score Multiplier
- Màu nền: `#3D1A0A` (đen đỏ tối)
- Viền glow: `#FF641E` (cam lửa), ~3–4px, blur nhẹ
- Có thể thêm họa tiết lửa nhỏ / tia sáng góc ô
- Cảm giác: nguy hiểm, hấp dẫn, "đáng tap"

**`cell_freeze.png`** — Time Freeze
- Màu nền: `#0A1A2E` (đen xanh tối)
- Viền glow: `#32C8FF` (cyan băng), ~3–4px, blur nhẹ
- Có thể thêm họa tiết tinh thể băng / tuyết nhỏ ở góc
- Cảm giác: lạnh lẽo, thần bí

**`cell_grass.png`** — Slow Growth
- Màu nền: `#0A1E0A` (đen xanh lá tối)
- Viền glow: `#50DC50` (xanh lá), ~3–4px, blur nhẹ
- Có thể thêm họa tiết lá nhỏ / nhánh cây ở góc
- Cảm giác: tự nhiên, sinh động

### Spec kỹ thuật chung:
- **Background:** Trong suốt (PNG alpha)
- **Đường dẫn:** `BloomTap/assets/resources/flowers/cell_empty.png`, `cell_fire.png`, `cell_freeze.png`, `cell_grass.png`
- Lưu ý: đặt cùng thư mục với flower sprites (code load chung 1 path `flowers/`)

---

## 3. UI Icons & Decorative (ART-03) — MEDIUM

| Asset | Mô tả | Kích thước |
|-------|-------|-----------|
| `icon_pause.png` | Nút pause trong game | 48 × 48 px |
| `icon_back.png` | Nút quay lại | 48 × 48 px |
| `icon_settings.png` | Icon settings | 48 × 48 px |
| `lobby_title_bg.png` | Background decorative cho title "BLOOM TAP" ở Lobby | 400 × 80 px |
| `lobby_bg.png` | Background toàn màn hình Lobby | 720 × 1280 px |

---

## 4. Power-up Visual Indicators (ART-04) — MEDIUM

Khi người chơi tap hoa special, effect kích hoạt và thể hiện ở **3 tầng đồng thời**:

### Tầng 1: HUD Icon (góc màn hình)
Icon nhỏ hiển thị countdown khi effect đang active.

| Power-up | Icon gợi ý | Màu chủ đạo |
|----------|-----------|-------------|
| Score Multiplier (×2) | Ngôi sao / nhân `×2` | Orange `#FF641E` |
| Time Freeze | Đồng hồ đóng băng / tinh thể | Cyan `#32C8FF` |
| Slow Growth | Lá cây / đồng hồ cát chậm | Green `#50DC50` |

- **Kích thước:** 48 × 48 px, PNG alpha
- **Đường dẫn:** `BloomTap/assets/resources/powerups/icon_score.png`, `icon_freeze.png`, `icon_slow.png`

---

### Tầng 2: Border Glow quanh toàn bộ grid (đã có trong code)
Khi effect active, **viền bao quanh bàn cờ 8×8 phát sáng** liên tục theo màu effect.

| Effect | Màu viền | Gợi ý style |
|--------|---------|-------------|
| Score Multiplier | `#FF641E` cam lửa, alpha 70% | Viền rực, pulse nhẹ |
| Time Freeze | `#32C8FF` cyan băng, alpha 70% | Viền sáng đều, shimmer lạnh |
| Slow Growth | `#50DC50` xanh lá, alpha 70% | Viền mềm, breathe chậm |

> Code đã xử lý bật/tắt viền. Art chỉ cần đảm bảo màu sắc từng loại đủ phân biệt khi nhìn nhanh.

---

### Tầng 3: Cell Background đổi màu (đã mô tả ở ART-02)
Ô chứa hoa special đổi nền sang `cell_fire` / `cell_freeze` / `cell_grass` trước khi tap.
Sau khi tap → effect kích hoạt → ô trở về `cell_empty` bình thường.

---

### Tổng quan trải nghiệm người chơi khi tap hoa special:

```
Trước tap:   Ô hiển thị cell_fire/freeze/grass  ← báo hiệu "đây là special"
Tap:         Hoa thu hoạch, effect bật
Sau tap:     Border glow bùng sáng + HUD icon xuất hiện + timer đếm ngược
Hết effect:  Border tắt, HUD icon biến mất
```

---

## Color Palette — "Moonlight Garden"

```
── Nền ──────────────────────────────────────────
Background:       #1E142D  (tím đen — game scene, lobby)
Cell empty:       #2A1F3D  (tím xỉn)
Cell special:     #3D2060  (tím sáng hơn + viền glow)

── Hoa ──────────────────────────────────────────
Cherry:           #FFB7C5 (bud/wilting) → #FF6B9D (full bloom)
Lotus:            #CE93D8 (bud/wilting) → #E040FB (full bloom)
Chrysanthemum:    #FFD54F (bud/wilting) → #FF8F00 (full bloom)
Rose:             #EF9A9A (bud/wilting) → #FF5252 (full bloom)
Sunflower:        #FFE082 (bud/wilting) → #FFEE58 (full bloom)

── UI ───────────────────────────────────────────
Accent yellow:    #FFDC3C  (Chơi Ngay button, score flash)
Accent green:     #50DC50  (correct tap flash, slow-growth glow)
Accent red:       #DC3232  (wrong tap flash)
Text primary:     #FFFFFF
Text secondary:   #C8A0FF  (greeting, placeholder)
Secondary panel:  #37284B  (overlay, leaderboard rows)

── Power-up glow ────────────────────────────────
Score ×2:         #FF641E  (orange)
Time Freeze:      #32C8FF  (cyan)
Slow Growth:      #50DC50  (green)
```

**Nguyên tắc glow (FULL_BLOOM):** Outer glow = màu hoa full bloom, blur radius 8px, opacity 60–80%. BUD không có glow. WILTING/DEAD desaturate về phía xám.

---

## Priority

| Priority | Asset | Unblock gì |
|----------|-------|-----------|
| 🔴 P0 | Flower sprites (5 loài × 5 states) | ART-01 — core visual của game |
| 🟠 P1 | Cell backgrounds (2 files) | ART-02 — grid look |
| 🟡 P2 | Power-up icons (3 files) | ART-04 — HUD polish |
| 🟢 P3 | UI icons + lobby bg | ART-03 — lobby polish |

---

## Demo / Reference

Hiện tại game render hoa bằng **màu solid** (không có sprite):

| State | Màu hiện tại (placeholder) |
|-------|---------------------------|
| BUD | Xanh lá `#50DC50` nhỏ |
| BLOOMING | Màu theo loài, scale 60% |
| FULL_BLOOM | Màu theo loài, scale 100%, rực nhất |
| WILTING | Màu xỉn, opacity 51% |
| DEAD | Gần trong suốt, opacity 20% |

Xem video/screenshot demo để thấy layout thực tế: chạy game tại `BloomTap/` bằng Cocos Preview.

---

*Generated: 2026-04-02 | Bloom Tap v1.2*
