import { _decorator, Component, director, resources, JsonAsset, Node, Label, Button, assetManager } from 'cc';
import { parseGameConfig, initPowerUpConfig } from './logic/GameConfig';
import { initFlowerConfigs } from './logic/FlowerTypes';
import { initPhaseConfigs } from './logic/SpawnManager';
import { initGameSettings } from './logic/GameState';
const { ccclass, property } = _decorator;

@ccclass('BootController')
export class BootController extends Component {
    @property(Node)
    errorOverlay: Node | null = null;

    @property(Label)
    errorLabel: Label | null = null;

    @property(Button)
    reloadButton: Button | null = null;

    onLoad(): void {
        if (this.errorOverlay) this.errorOverlay.active = false;
        this.reloadButton?.node.on(Button.EventType.CLICK, this._onReload, this);
        this._loadConfigs();
    }

    private _loadConfigs(): void {
        resources.load('config/flowers', JsonAsset, (errF, flowersAsset) => {
            if (errF) { this._showError(); return; }
            resources.load('config/settings', JsonAsset, (errS, settingsAsset) => {
                if (errS) { this._showError(); return; }
                try {
                    const cfg = parseGameConfig(flowersAsset.json, settingsAsset.json);
                    initFlowerConfigs(cfg.flowers);
                    initPhaseConfigs(cfg.spawnPhases);
                    initGameSettings(cfg.settings);
                    if (cfg.powerUps) {
                        initPowerUpConfig(cfg.powerUps);
                    }
                    director.loadScene('GameScene');
                } catch (_e) {
                    this._showError();
                }
            });
        });
    }

    private _showError(): void {
        if (this.errorOverlay) this.errorOverlay.active = true;
        // errorLabel text is set in Inspector: "Game config loi. Vui long reload."
    }

    private _onReload(): void {
        assetManager.releaseAll();
        director.loadScene('Boot');
    }
}
