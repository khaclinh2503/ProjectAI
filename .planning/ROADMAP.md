# Roadmap: Bloom Tap

## Milestones

- ✅ **v1.0 MVP** — Phases 1–6 (shipped 2026-03-16) — [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Polish & Power-ups** — Phases 7–12 (shipped 2026-03-25) — [archive](milestones/v1.1-ROADMAP.md)
- 🔄 **v1.2 Lobby & Leaderboard** — Phases 13–15 (in progress)

## Phases

- [x] **Phase 13: LeaderboardService** - Pure logic tier: player name storage, leaderboard data model, auto-save entry on game end (completed 2026-03-25)
- [x] **Phase 14: Lobby & Leaderboard UI** - LobbyScene with 5 navigation buttons, name-input prompt on first run, LeaderboardScene top-10 display (completed 2026-04-02)
- [ ] **Phase 15: Scene Flow Wiring** - Boot → Lobby → Game → Results → Lobby navigation; results screen shows achieved rank

---

## Phase Details

### Phase 13: LeaderboardService
**Goal**: The game can persist player identity and maintain a ranked top-10 leaderboard with no UI dependency
**Depends on**: Nothing (pure logic, uses existing StorageService)
**Requirements**: PLAYER-01 (storage side), LB-01 (data model), LB-02 (save logic)
**Success Criteria** (what must be TRUE):
  1. A player name (max 12 chars) can be saved and retrieved from localStorage via StorageService
  2. A new score entry is inserted into the leaderboard and the list is kept sorted descending, capped at 10 entries
  3. Submitting a score below the 10th entry does not alter the leaderboard
  4. LeaderboardService.getRank(score) returns the rank a score would achieve before insertion (used by results screen)
  5. All logic has Vitest unit tests; 0 cc imports in LeaderboardService
**Plans:** 1/1 plans complete
Plans:
- [ ] 13-01-PLAN.md — TDD: LeaderboardService (player name + leaderboard data model + save/rank logic)

### Phase 14: Lobby & Leaderboard UI
**Goal**: Players see a lobby on boot, can enter their name on first run, and can view the top-10 leaderboard
**Depends on**: Phase 13
**Requirements**: LOBBY-01, PLAYER-01 (UI side), LB-01 (display side)
**Success Criteria** (what must be TRUE):
  1. LobbyScene renders with 5 buttons: Chơi Ngay, Vườn Hoa, Túi Đồ, BXH, Setting
  2. Tapping Vườn Hoa, Túi Đồ, or Setting shows a "Sắp ra mắt" message (no crash, no scene change)
  3. On first app run (no stored name), a name-input prompt appears before the lobby; entered name persists across reloads
  4. Player name is visible on the lobby screen after being set
  5. Tapping BXH opens a LeaderboardScene showing rank, name, and score for up to 10 entries (empty state handled gracefully)
**Plans:** 2/2 plans complete
Plans:
- [x] 14-01-PLAN.md — Write LobbyController.ts and LeaderboardController.ts (TypeScript controllers)
- [x] 14-02-PLAN.md — Create scenes in Cocos Editor, wire @property bindings, verify UI
**UI hint**: yes

### Phase 15: Scene Flow Wiring
**Goal**: Navigation between all scenes works end-to-end: Boot → Lobby → Game → Results → Lobby
**Depends on**: Phase 14
**Requirements**: LOBBY-02, LB-02 (results integration)
**Success Criteria** (what must be TRUE):
  1. Launching the app loads Lobby (not GameScene directly); BootController routes through LobbyScene
  2. Tapping Chơi Ngay from lobby starts a game session; completing the session returns to lobby (not to a restart prompt)
  3. After a game ends, the player's score is automatically saved to the leaderboard if it qualifies for top 10
  4. The results screen displays the rank achieved (e.g., "#3") when the score enters the leaderboard
**Plans**: TBD
**UI hint**: yes

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 13. LeaderboardService | 0/1 | Complete    | 2026-03-25 |
| 14. Lobby & Leaderboard UI | 2/2 | Complete   | 2026-04-02 |
| 15. Scene Flow Wiring | 0/? | Not started | - |

---

*Last updated: 2026-03-28 — Phase 14 planned (2 plans, 2 waves)*
