import { _decorator, Component, director, Label, Button, Node, EditBox, tween, Tween, UIOpacity } from 'cc';
import { LeaderboardService } from './logic/LeaderboardService';
const { ccclass, property } = _decorator;

/**
 * LobbyController — Cocos Component for LobbyScene.
 *
 * Scene node wiring (set in Cocos Inspector):
 *   titleLabel     → TitleLabel node ("BLOOM TAP")
 *   greetingLabel  → GreetingLabel node ("Xin chào, [name] 🌸")
 *   btnChoiNgay    → BtnChơiNgay → loads GameScene
 *   btnVuonHoa     → BtnVườnHoa → shows "Sắp ra mắt!" toast
 *   btnTuiDo       → BtnTúiĐồ → shows "Sắp ra mắt!" toast
 *   btnBXH         → BtnBXH → loads LeaderboardScene
 *   btnSetting     → BtnSetting → shows "Sắp ra mắt!" toast
 *   nameInputOverlay → NameInputOverlay root node (active when no stored name)
 *   nameEditBox    → NameEditBox (max 12 chars)
 *   btnBatDau      → BtnBắtĐầu confirm button (disabled when EditBox empty)
 *   toastLabel     → ToastLabel shared node (initially active=false)
 *
 * NameInputOverlay MUST have a UIOpacity component for fade animation.
 * ToastLabel node MUST have a UIOpacity component for fade animation.
 */
@ccclass('LobbyController')
export class LobbyController extends Component {
    @property(Label)
    titleLabel: Label | null = null;

    @property(Label)
    greetingLabel: Label | null = null;

    @property(Button)
    btnChoiNgay: Button | null = null;

    @property(Button)
    btnVuonHoa: Button | null = null;

    @property(Button)
    btnTuiDo: Button | null = null;

    @property(Button)
    btnBXH: Button | null = null;

    @property(Button)
    btnSetting: Button | null = null;

    /** Overlay root node — active when player name is not set (D-01). */
    @property(Node)
    nameInputOverlay: Node | null = null;

    /** EditBox for player name input — max 12 chars (D-02, Pitfall 5). */
    @property(EditBox)
    nameEditBox: EditBox | null = null;

    /** Confirm button — disabled until EditBox has >= 1 character (D-03). */
    @property(Button)
    btnBatDau: Button | null = null;

    /** Shared toast label node — displayed for coming-soon buttons (D-15). */
    @property(Label)
    toastLabel: Label | null = null;

    /**
     * onLoad — runs before first frame (D-01: check name here, not start(), to avoid flicker).
     */
    onLoad(): void {
        // --- Name check (D-01) ---
        const name = LeaderboardService.getPlayerName();
        if (name === null) {
            // First run: show name input overlay
            if (this.nameInputOverlay) this.nameInputOverlay.active = true;
            // Bat Dau starts disabled — no name entered yet (D-03)
            if (this.btnBatDau) this.btnBatDau.interactable = false;
        } else {
            // Name exists: hide overlay, show greeting
            if (this.nameInputOverlay) this.nameInputOverlay.active = false;
            if (this.greetingLabel) this.greetingLabel.string = `Xin chào, ${name} \u{1F338}`;
        }

        // --- EditBox setup ---
        // Pitfall 5: set maxLength programmatically as well as Inspector (belt-and-suspenders)
        if (this.nameEditBox) {
            this.nameEditBox.maxLength = 12;
            this.nameEditBox.node.on(EditBox.EventType.TEXT_CHANGED, this._onNameChanged, this);
        }

        // --- Bat Dau confirm wiring ---
        this.btnBatDau?.node.on(Button.EventType.CLICK, this._confirmName, this);

        // --- Main button wiring ---
        this.btnChoiNgay?.node.on(Button.EventType.CLICK, this._onChoiNgay, this);
        this.btnVuonHoa?.node.on(Button.EventType.CLICK, this._showToast, this);
        this.btnTuiDo?.node.on(Button.EventType.CLICK, this._showToast, this);
        this.btnBXH?.node.on(Button.EventType.CLICK, this._onBXH, this);
        this.btnSetting?.node.on(Button.EventType.CLICK, this._showToast, this);

        // --- Toast initial state ---
        if (this.toastLabel) this.toastLabel.node.active = false;
    }

    /**
     * Reactive validation for name EditBox (D-03).
     * Enables BtnBắtĐầu only when there is at least 1 character.
     */
    private _onNameChanged(): void {
        const hasText = (this.nameEditBox?.string?.length ?? 0) >= 1;
        if (this.btnBatDau) {
            this.btnBatDau.interactable = hasText;
        }
    }

    /**
     * Confirms name entry: saves name, updates greeting, fades overlay out (D-04, D-12).
     */
    private _confirmName(): void {
        const name = this.nameEditBox?.string?.trim() ?? '';
        if (!name) return;

        // Persist name
        LeaderboardService.setPlayerName(name);

        // Update greeting immediately (D-12)
        if (this.greetingLabel) {
            this.greetingLabel.string = `Xin chào, ${name} \u{1F338}`;
        }

        // Fade overlay out (D-04): UIOpacity 255→0 over 0.3s, then deactivate
        const overlay = this.nameInputOverlay;
        if (!overlay) return;
        const uiOp = overlay.getComponent(UIOpacity);
        if (!uiOp) return;

        // Always stop previous tween before starting new one (anti-accumulation pattern)
        Tween.stopAllByTarget(uiOp);
        tween(uiOp)
            .to(0.3, { opacity: 0 })
            .call(() => {
                // isValid guard: scene might be destroyed by the time callback fires (Pitfall 2)
                if (overlay && overlay.isValid) overlay.active = false;
                if (uiOp) uiOp.opacity = 255;
            })
            .start();
    }

    /**
     * Chơi Ngay button — loads GameScene (D-10).
     * Phase 15 will change routing once Boot→Lobby→Game flow is wired.
     */
    private _onChoiNgay(): void {
        director.loadScene('GameScene');
    }

    /**
     * BXH button — loads LeaderboardScene (D-06).
     */
    private _onBXH(): void {
        director.loadScene('LeaderboardScene');
    }

    /**
     * Shared toast handler for Vườn Hoa, Túi Đồ, Setting buttons (D-13, D-14, D-15).
     *
     * Toast animation: fade-in 0→255 (0.2s) → hold 1.5s → fade-out 255→0 (0.2s).
     * Interruptible: Tween.stopAllByTarget cancels any in-progress animation before restart.
     * Non-blocking: does not disable other buttons (D-14).
     */
    private _showToast(): void {
        const toast = this.toastLabel;
        if (!toast) return;
        const uiOp = toast.node.getComponent(UIOpacity);
        if (!uiOp) return;

        // Kill any in-flight toast tween before restarting (D-15 interrupt behavior)
        Tween.stopAllByTarget(uiOp);

        // Set opacity to 0 BEFORE activating and starting tween (anti-pattern guard)
        uiOp.opacity = 0;
        toast.node.active = true;

        tween(uiOp)
            .to(0.2, { opacity: 255 })
            .delay(1.5)
            .to(0.2, { opacity: 0 })
            .call(() => {
                // isValid guard: scene might be destroyed mid-animation (Pitfall 2)
                if (toast.node && toast.node.isValid) toast.node.active = false;
            })
            .start();
    }
}
