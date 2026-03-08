# Roadmap: Bloom Harvest

## Overview

Bloom Harvest v1 validates one thing: does tapping a flower at the exact moment of peak bloom feel satisfying enough to keep players coming back? Every phase serves that hypothesis. The build order is infrastructure first (so nothing is retrofitted), lifecycle system second (the heart of the mechanic), species and scoring third (variety and feedback), juice fourth (the product moment), then level structure and tutorial to make it a completable game. All 22 v1 requirements are mapped across 8 phases.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Project Foundation** - Cocos Creator project scaffold, mobile + FB Instant build targets, asset bundle architecture
- [ ] **Phase 2: Save & Timing Infrastructure** - Wall-clock millisecond timing system, save abstraction for native and FB Instant
- [ ] **Phase 3: Flower Lifecycle System** - Per-flower Bud → Bloom → Wilt state machine with configurable speed
- [ ] **Phase 4: Flower Species Content** - 5 species with distinct visuals, animation sets, growth speeds, and base point values
- [ ] **Phase 5: Tap Detection & Scoring** - Input handling, timing-quality scoring bands, realtime score HUD
- [ ] **Phase 6: Juice & Feedback** - Particle burst, sound effects, zero-lag visual confirmation, floating score numbers
- [ ] **Phase 7: Level & Garden Shell** - Fixed garden layout, session end condition, result screen with harvest summary
- [ ] **Phase 8: Tutorial** - One-time interactive tutorial that teaches the bloom-and-tap mechanic

## Phase Details

### Phase 1: Project Foundation
**Goal**: A Cocos Creator project exists that builds and runs on iOS, Android, and Facebook Instant Games with the asset bundle architecture in place and the initial payload budget enforced.
**Depends on**: Nothing (first phase)
**Requirements**: TECH-01, TECH-02, TECH-04
**Success Criteria** (what must be TRUE):
  1. A Cocos Creator project builds and deploys a blank scene to an iOS or Android device without errors.
  2. The same project builds and runs as a Facebook Instant Games HTML5 bundle without errors.
  3. The project uses Cocos Creator's Asset Bundle system; the initial payload bundle measures under 5 MB.
  4. All external SDK calls (FB Instant, AdMob, Firebase) are routed through platform adapter stub classes — no direct SDK imports exist in any game logic file.
**Plans**: 2 plans

Plans:
- [ ] 01-01-PLAN.md — Project scaffold: Cocos Creator project creation, folder hierarchy, TypeScript config, Boot/GameManager/EventBus scripts, and validate-build.sh
- [ ] 01-02-PLAN.md — Platform adapter layer (IPlatformAdapter, NullPlatformAdapter, FBInstantAdapter, PlatformDetector), Boot.ts wiring, FB Instant Games build, and payload measurement

### Phase 2: Save & Timing Infrastructure
**Goal**: A wall-clock millisecond timing system exists and a unified save abstraction works across native localStorage and FB Instant's async data API.
**Depends on**: Phase 1
**Requirements**: TECH-03, TECH-05
**Success Criteria** (what must be TRUE):
  1. Timing windows are expressed as wall-clock millisecond timestamps (Date.now()); no bloom window boundary uses frame counts or dt accumulation.
  2. Game state saved on the native build persists across app restarts using localStorage.
  3. Game state saved on the FB Instant build persists across sessions using FBInstant.player.setDataAsync.
  4. Both save paths share one abstract SaveSystem interface; swapping backends requires changing zero gameplay scripts.
**Plans**: 3 plans

Plans:
- [ ] 02-00-PLAN.md — Jest test infrastructure: install jest/ts-jest, write failing test stubs for TimingService and SaveSystem (Wave 0 — must run first)
- [ ] 02-01-PLAN.md — TimingService: Date.now() wrapper with bloom-window query helpers (TECH-03)
- [ ] 02-02-PLAN.md — SaveSystem: SaveData types, ISaveBackend interface, LocalStorageSaveBackend, FBInstantSaveBackend, retry logic, createSaveBackend factory (TECH-05)

### Phase 3: Flower Lifecycle System
**Goal**: A single flower on screen moves through Bud → Bloom → Wilt states with visually distinct animations, each state timed by the wall-clock system, and a configurable bloom window per species.
**Depends on**: Phase 2
**Requirements**: CORE-01, CORE-02, CORE-03, CORE-04
**Success Criteria** (what must be TRUE):
  1. A flower cycles through three visually distinct states (Bud, Bloom, Wilt) in sequence without any manual trigger.
  2. Each state has its own animation or visual treatment that is unambiguous at a glance.
  3. Growth speed differs between at least two species configured in FlowerDatabase — setting a faster speed in config produces a noticeably shorter lifecycle.
  4. The bloom window has a defined duration (neither instantaneous nor permanent) during which the flower is in the tappable state.
**Plans**: TBD

Plans:
- [ ] 03-01: FlowerLifecycleSystem state machine (Bud → Bloom → Wilt) with millisecond timing
- [ ] 03-02: Per-state animation wiring and FlowerDatabase species config (5 speeds)

### Phase 4: Flower Species Content
**Goal**: All 5 flower species are implemented with distinct visual designs, per-species growth speeds, and per-species base point values loadable from FlowerDatabase config.
**Depends on**: Phase 3
**Requirements**: FLORA-01, FLORA-02, FLORA-03
**Success Criteria** (what must be TRUE):
  1. Five species are selectable from FlowerDatabase config, each with a unique name and bloom speed value.
  2. Each species has a visually distinct design (color palette and/or petal shape) that is recognizable at gameplay scale.
  3. Each species has a different base point value in config; a slower species awards fewer points than a faster one by default.
  4. All flower state sprites share one or two texture atlases — no species uses individual loose PNG files in the gameplay scene.
**Plans**: TBD

Plans:
- [ ] 04-01: Sprite atlas for all 5 species (Bud, Bloom, Wilt states) with atlas discipline enforced
- [ ] 04-02: FlowerDatabase entries for all 5 species (speed, base points, animation keys, visual design)

### Phase 5: Tap Detection & Scoring
**Goal**: Players can tap flowers and receive correct score outcomes: positive points for tapping during Bloom, point penalty for tapping during Bud or Wilt, with score accuracy scaling by timing precision and a live score display.
**Depends on**: Phase 3
**Requirements**: SCORE-01, SCORE-02, SCORE-03, SCORE-04
**Success Criteria** (what must be TRUE):
  1. Tapping a flower in the Bloom state awards a positive score — the flower is harvested and removed from the garden.
  2. Tapping a flower in the Bud or Wilt state subtracts points and the flower is lost.
  3. Tapping at the center of the bloom window awards more points than tapping at the edge (at least two scoring bands are observable).
  4. A live score counter is visible on screen during gameplay and increments or decrements immediately after each tap.
**Plans**: TBD

Plans:
- [ ] 05-01: Tap detection and input routing to FlowerLifecycleSystem state check
- [ ] 05-02: ScoreSystem with Perfect/Good/Miss bands, combo tracking, and realtime HUD display

### Phase 6: Juice & Feedback
**Goal**: Every tap — correct or incorrect — produces immediate multi-sensory feedback: visual particle effect, sound effect, and a floating score number. The mechanic feels rewarding before any meta-system exists.
**Depends on**: Phase 5
**Requirements**: JUICE-01, JUICE-02, JUICE-03, JUICE-04
**Success Criteria** (what must be TRUE):
  1. A correct tap on a Bloom-state flower produces a visible particle burst at the tap position.
  2. Tapping a flower (correct or incorrect) plays the appropriate sound effect within one frame of the tap event.
  3. No perceptible input lag exists between tap and visual response when measured on a mid-range Android device (Snapdragon 680-class or equivalent).
  4. A floating score number (e.g., "+100" or "-50") appears at the tap position and animates upward after every tap.
  5. Three distinct sound effects exist: correct harvest, wrong-timing tap, and natural wilt.
**Plans**: TBD

Plans:
- [ ] 06-01: Particle burst system (pooled) and floating score number animation
- [ ] 06-02: Audio system with three SFX assets wired to lifecycle events

### Phase 7: Level & Garden Shell
**Goal**: A complete playable session exists: a fixed garden of flowers grows, the player harvests or misses them, the session ends automatically, and a result screen shows the outcome.
**Depends on**: Phase 5
**Requirements**: LEVEL-01, LEVEL-02, LEVEL-03, SCORE-05
**Success Criteria** (what must be TRUE):
  1. A garden loads with a fixed set of flowers (species and count defined in level config) and all flowers begin cycling immediately.
  2. The session ends automatically when every flower has been harvested or wilted — no manual stop required.
  3. A result screen appears after session end showing: total score, number of flowers successfully harvested, and number of flowers missed.
  4. The player can restart and play the same level again from the result screen.
**Plans**: TBD

Plans:
- [ ] 07-01: Garden scene with fixed flower slot layout and level config loader
- [ ] 07-02: Session end condition, result screen, and replay flow

### Phase 8: Tutorial
**Goal**: A first-time player who has never played a timing game can learn the Bud → Bloom → Wilt mechanic and tap correctly through a single guided interaction, and will never see the tutorial again.
**Depends on**: Phase 7
**Requirements**: TUT-01, TUT-02
**Success Criteria** (what must be TRUE):
  1. On first launch, a tutorial sequence appears that guides the player to tap a flower at peak bloom through explicit prompts (no text-wall instructions required).
  2. After the player successfully completes the tutorial tap, the tutorial ends and the main game session begins.
  3. On every subsequent launch, the tutorial is skipped automatically — the game goes directly to the garden.
  4. Tutorial completion state persists across app restarts (saved via SaveSystem).
**Plans**: TBD

Plans:
- [ ] 08-01: Interactive tutorial scene with prompted tap and positive feedback flow
- [ ] 08-02: Tutorial completion flag persisted via SaveSystem; skip logic on subsequent launches

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Project Foundation | 0/2 | Not started | - |
| 2. Save & Timing Infrastructure | 0/3 | Not started | - |
| 3. Flower Lifecycle System | 0/2 | Not started | - |
| 4. Flower Species Content | 0/2 | Not started | - |
| 5. Tap Detection & Scoring | 0/2 | Not started | - |
| 6. Juice & Feedback | 0/2 | Not started | - |
| 7. Level & Garden Shell | 0/2 | Not started | - |
| 8. Tutorial | 0/2 | Not started | - |
