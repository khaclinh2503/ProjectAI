---
phase: 01-project-foundation
plan: 02
subsystem: infra
tags: [cocos-creator, typescript, mobile-web, touch-action, build-template, scene-transition]

# Dependency graph
requires:
  - phase: 01-project-foundation plan 01
    provides: "Cocos Creator 3.8.8 project at BloomTap/ with BootScene and GameScene scenes"
provides:
  - "BootController.ts — Cocos component that transitions BootScene to GameScene on load"
  - "GameController.ts — placeholder Cocos component that sets title label to 'Bloom Tap'"
  - "build-templates/web-mobile/index.html — custom HTML template with touch-action:none on #GameCanvas"
affects: [02-core-game-logic, 03-renderer, 04-session, 05-juice, 06-results]

# Tech tracking
tech-stack:
  added: []
  patterns: [cocos-director-scene-transition, cocos-property-binding, build-template-touch-action]

key-files:
  created:
    - BloomTap/assets/scripts/BootController.ts
    - BloomTap/assets/scripts/GameController.ts
    - BloomTap/build-templates/web-mobile/index.html

key-decisions:
  - "build-templates/ placed at BloomTap/ (Cocos project root), not workspace root — Cocos looks for it relative to project.json"
  - "director.loadScene called in onLoad() per Cocos API spec — fires before scene renders, correct lifecycle hook"
  - "titleLabel guarded with null check in GameController — Inspector wiring may be absent during early development"

patterns-established:
  - "Scene transition pattern: use director.loadScene('SceneName') in onLoad() — never in constructor"
  - "Inspector property binding pattern: @property(Label) labelProp: Label | null = null with null guard in onLoad()"
  - "Build template pattern: build-templates/web-mobile/index.html at project root with touch-action: none"

requirements-completed: [FOUND-01, FOUND-03]

# Metrics
duration: ~5min
completed: 2026-03-14
---

# Phase 1 Plan 02: TypeScript Components and Build Template Summary

**BootController (instant scene transition), GameController (title placeholder), and web-mobile build template (touch-action:none) — enabling mobile web game flow from BootScene to GameScene**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-14T04:18:26Z
- **Completed:** 2026-03-14
- **Tasks:** 2 (auto) + 1 checkpoint (human-verify, pending)
- **Files modified:** 3

## Accomplishments
- BootController.ts written with director.loadScene('GameScene') in onLoad()
- GameController.ts written as Phase 1 placeholder, sets titleLabel.string to 'Bloom Tap'
- Build template at BloomTap/build-templates/web-mobile/index.html with touch-action:none on #GameCanvas and overflow:hidden on html/body

## Task Commits

Each task was committed atomically:

1. **Task 1: Write BootController.ts and GameController.ts** - `50b46f0` (feat)
2. **Task 2: Create build template with touch-action:none CSS** - `9596dee` (feat)

## Files Created/Modified
- `BloomTap/assets/scripts/BootController.ts` - Cocos component, transitions to GameScene in onLoad()
- `BloomTap/assets/scripts/GameController.ts` - Cocos placeholder component, sets title label to 'Bloom Tap'
- `BloomTap/build-templates/web-mobile/index.html` - Custom HTML build template with touch-action:none on canvas

## Decisions Made
- Build template placed at `BloomTap/build-templates/web-mobile/index.html` (Cocos project root) — Cocos Creator reads build-templates relative to project.json location, not workspace root
- Used `onLoad()` lifecycle hook for director.loadScene — fires before first render, no delay or dependency on other components
- Null-guarded titleLabel in GameController — allows component to work even before Inspector wiring is complete

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required (Manual Steps in Editor)

The following steps must be performed manually in Cocos Creator editor before the checkpoint verification:

**Attach BootController to BootScene:**
1. Open BootScene (double-click in Assets panel)
2. Select the Canvas node in Hierarchy
3. Click "Add Component" in Properties panel → search "BootController" → add it
4. Save scene (Ctrl+S)

**Attach GameController to GameScene:**
1. Open GameScene
2. Select the Canvas node in Hierarchy
3. Click "Add Component" → search "GameController" → add it
4. Drag the Label node from Hierarchy into the "Title Label" slot in Inspector
5. Save scene (Ctrl+S)

**Add both scenes to build scene list:**
1. Menu → Project → Build (or Build & Publish)
2. Under "Scene" section, add BootScene and GameScene
3. Set BootScene as the first scene (start scene)
4. Save build config

## Issues Encountered
None.

## Next Phase Readiness
- BootController and GameController files ready — need editor attachment and scene wiring (manual steps above)
- Build template ready for web-mobile build output
- After checkpoint verification, Phase 1 is complete and Phase 2 (Core Game Logic) can begin

---
*Phase: 01-project-foundation*
*Completed: 2026-03-14*
