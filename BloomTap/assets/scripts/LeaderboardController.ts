import { _decorator, Component, director, Label, Button, Node } from 'cc';
import { LeaderboardService } from './logic/LeaderboardService';
const { ccclass, property } = _decorator;

/**
 * LeaderboardController — Cocos Component for LeaderboardScene.
 *
 * Scene node wiring (set in Cocos Inspector):
 *   titleLabel      → TitleLabel node ("BẢNG XẾP HẠNG")
 *   btnBack         → BtnBack node (top-left "← Quay lại" button) → loads LobbyScene
 *   rows            → Array of 10 pre-allocated RowNode[0..9] from EntryList
 *   emptyStateLabel → EmptyStateLabel node (shown when no entries)
 *
 * Each RowNode MUST have 3 child nodes named exactly:
 *   - RankLabel   (Label component) — displays "#1", "#2", etc.
 *   - NameLabel   (Label component) — displays player name
 *   - ScoreLabel  (Label component) — displays score as string
 *
 * Data is always refreshed from LeaderboardService.getEntries() on onLoad —
 * ensuring the scene reflects the latest state every time it is loaded (D-08).
 */
@ccclass('LeaderboardController')
export class LeaderboardController extends Component {
    @property(Label)
    titleLabel: Label | null = null;

    /** Back button — top-left, navigates to LobbyScene (D-07). */
    @property(Button)
    btnBack: Button | null = null;

    /**
     * 10 pre-allocated row nodes from EntryList (D-08).
     * Bind all 10 RowNode[0..9] in Inspector order (index 0 = top row).
     * Each row needs children: RankLabel, NameLabel, ScoreLabel.
     */
    @property([Node])
    rows: Node[] = [];

    /**
     * Empty state label — shown when leaderboard has no entries (D-09).
     * Inspector text: "Chưa có ai lên bảng. Hãy chơi ngay!"
     */
    @property(Label)
    emptyStateLabel: Label | null = null;

    /**
     * onLoad — reads entries and renders immediately (not start() — data present on first frame).
     */
    onLoad(): void {
        // Wire back button (D-07)
        this.btnBack?.node.on(Button.EventType.CLICK, this._onBack, this);

        // Render leaderboard data (always fresh — re-read on each scene load)
        this._renderEntries();
    }

    /**
     * Renders up to 10 leaderboard entries.
     * - Shows EmptyStateLabel when no entries exist (D-09).
     * - Activates only rows with data; hides unused rows (D-08).
     * - Reads child nodes by exact name: RankLabel, NameLabel, ScoreLabel.
     */
    private _renderEntries(): void {
        const entries = LeaderboardService.getEntries();
        const hasEntries = entries.length > 0;

        // Show/hide empty state label
        if (this.emptyStateLabel) {
            this.emptyStateLabel.node.active = !hasEntries;
        }

        // Render rows (max 10)
        for (let i = 0; i < 10; i++) {
            const row = this.rows[i];
            if (!row) continue;

            if (i < entries.length) {
                row.active = true;

                // Access child labels by exact name (Inspector must match these names)
                const rankLabel = row.getChildByName('RankLabel')?.getComponent(Label);
                const nameLabel = row.getChildByName('NameLabel')?.getComponent(Label);
                const scoreLabel = row.getChildByName('ScoreLabel')?.getComponent(Label);

                if (rankLabel) rankLabel.string = `#${i + 1}`;
                if (nameLabel) nameLabel.string = entries[i].name;
                if (scoreLabel) scoreLabel.string = String(entries[i].score);
            } else {
                // Hide unused rows (fewer than 10 entries)
                row.active = false;
            }
        }
    }

    /**
     * Back button handler — returns to LobbyScene (D-07).
     */
    private _onBack(): void {
        director.loadScene('LobbyScene');
    }
}
