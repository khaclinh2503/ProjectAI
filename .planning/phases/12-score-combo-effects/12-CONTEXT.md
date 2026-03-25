# Phase 12: Score & Combo Effects — Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Score display và combo system được polish với animations và visual effects — punch-in combo labels theo streak, score HUD punch+color flash, score float với zigzag path và màu khi multiplier active.

**KHÔNG bao gồm:** Sprite art thay thế cho hoa/board/UI (ART-01/02/03 intentionally deferred sang phase sau).
</domain>

<decisions>
## Implementation Decisions

### Score HUD
- **D-01:** Score label react mỗi khi điểm tăng — kết hợp **punch scale** (to → co lại) VÀ **color flash** cùng lúc
- **D-02:** Color flash thresholds và exact colors: Claude's Discretion dựa trên MILESTONE_THRESHOLDS từ JuiceHelpers

### Combo Display
- **D-03:** Combo label punch-in **mỗi lần streak tăng** (x2, x3, x4...) — animation: scale to + fade in (mờ đập vào màn hình → rõ dần)
- **D-04:** Starting scale của punch-in **tỉ lệ với streak level** — streak cao hơn → bắt đầu to hơn (ví dụ x2 = 1.5x scale, x10 = 3x scale)
- **D-05:** **Combo break flash mạnh hơn** hiện tại — chi tiết implementation: Claude's Discretion (flash đỏ trên label + screen region)

### Score Float (SCORE_MULTIPLIER active)
- **D-06:** Float **đổi màu** khi `powerUpMultiplier > 1` — màu khác với normal float (Claude's Discretion: gold/orange hoặc match multiplier color)
- **D-07:** Float animation sequence khi multiplier active:
  1. Spawn to + mờ → rõ dần (punch-in effect)
  2. Count-up từ base → final score (đã có, giữ nguyên)
  3. Bay lên theo **zigzag path**
- **D-08:** Zigzag path = **random bounce** — mỗi segment ngẫu nhiên hướng trái/phải trong khi di chuyển lên. Số segment và displacement: Claude's Discretion
- **D-09:** **Normal float** (không có multiplier): giữ nguyên behavior hiện tại — straight up + fade

### Claude's Discretion
- Score HUD color flash thresholds (milestone values và màu tương ứng)
- Combo break flash exact implementation (label flash vs partial screen flash vs cả hai)
- Punch scale magnitude values (1.5x? 2x? tùy streak level)
- Zigzag segment count, displacement magnitude, duration

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Score & Animation Logic
- `BloomTap/assets/scripts/GridRenderer.ts` — `spawnScoreFloat()` (lines ~410–445), `paintFlash()`, `playTapPulse()`, `shakeGrid()` pattern
- `BloomTap/assets/scripts/GameController.ts` — `_updateScoreLabel()`, combo tracking (streak var), `handleCorrectTap()` return signature, `handleWrongTap()`
- `BloomTap/assets/scripts/logic/JuiceHelpers.ts` — `MILESTONE_THRESHOLDS`, `getMilestoneLabel()`, `getFloatLabelString()`, `getFloatFontSize()`

### Architecture Reference
- `BloomTap/assets/scripts/logic/PowerUpState.ts` — `EffectType`, `powerUpMultiplier` semantics
- `BloomTap/assets/scripts/FlowerColors.ts` — existing flash color constants

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tween()` từ 'cc': dùng rộng rãi trong GridRenderer — score float count-up, shakeGrid, tap pulse
- `UIOpacity` component: đã có trên float label nodes
- `FloatSlot` pool: 8 pre-allocated `{ node, label, opacity, inUse }` — float spawn dùng pool này
- `spawnScoreFloat(row, col, rawScore, multiplier, powerUpMultiplier)`: signature đã có `powerUpMultiplier`

### Established Patterns
- **Score float count-up:** plain JS object `{value}` tweened với `cubicOut`, `onUpdate` updates label string — pattern này đang hoạt động tốt, keep và extend
- **Tween chaining:** `.to(dur, props).to(dur, props)...` pattern dùng trong `shakeGrid()` — zigzag dùng pattern tương tự
- **Flash overlay:** `flashGraphics` (Graphics layer 3 trên mỗi cell) dùng cho wrong tap flash
- **Scale animation:** `playTapPulse()` dùng `tween(node.scale)` — pattern cho punch scale

### Integration Points
- **Score float color + zigzag:** thêm vào `spawnScoreFloat()` trong GridRenderer — check `powerUpMultiplier > 1` để branch behavior
- **Combo label punch-in:** `GameController` quản lý combo state và streak value; cần expose streak sang GridRenderer hoặc handle animation trong GameController trực tiếp trên comboLabel node
- **Score HUD punch+flash:** `GameController._updateScoreLabel()` — thêm tween ở đây
- **Combo break flash:** `handleWrongTap()` trong GameController — thêm strong flash effect ở đây

### Scope Note
ART-01, ART-02, ART-03 (sprite replacement cho hoa 5 trạng thái, board background, UI elements) remain open — deferred sang future phase.
</code_context>
