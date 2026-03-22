import { _decorator, Component, Graphics, Color, Sprite, SpriteFrame, Texture2D, resources } from 'cc';
import { EffectType, PowerUpState } from './logic/PowerUpState';
import { PowerUpConfig } from './logic/GameConfig';

const { ccclass, property } = _decorator;

@ccclass('PowerUpHUDRenderer')
export class PowerUpHUDRenderer extends Component {
    @property(Sprite)
    iconSprite: Sprite | null = null;

    @property(Graphics)
    arcGraphics: Graphics | null = null;

    private _cellSpriteFrames: Partial<Record<EffectType, SpriteFrame>> = {};
    private _arcRadius: number = 20;
    private _powerUpConfig: PowerUpConfig | null = null;

    onLoad(): void {
        // Hide on start to prevent first-frame flash (Pitfall 5 from RESEARCH.md)
        this.node.active = false;
        this._loadCellSprites();
    }

    public setPowerUpConfig(config: PowerUpConfig): void {
        this._powerUpConfig = config;
    }

    /**
     * Called each frame by GameController.update().
     * Pure read — never mutates powerUpState.
     */
    public tick(powerUpState: PowerUpState, nowMs: number): void {
        if (!powerUpState.isActive(nowMs)) {
            this.node.active = false;
            return;
        }
        this.node.active = true;

        const effect = powerUpState.activeEffect!;

        // Update icon sprite
        if (this.iconSprite && this._cellSpriteFrames[effect]) {
            this.iconSprite.spriteFrame = this._cellSpriteFrames[effect]!;
        }

        // Draw countdown arc
        const remaining = powerUpState.getRemainingMs(nowMs);
        const total = this._getDurationForEffect(effect);
        const pct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
        this._drawCountdownArc(pct);
    }

    private _getDurationForEffect(effect: EffectType): number {
        if (!this._powerUpConfig) return 6000; // fallback
        switch (effect) {
            case EffectType.SCORE_MULTIPLIER: return this._powerUpConfig.scoreMultiplier.durationMs;
            case EffectType.TIME_FREEZE: return this._powerUpConfig.timeFreeze.durationMs;
            case EffectType.SLOW_GROWTH: return this._powerUpConfig.slowGrowth.durationMs;
        }
    }

    private _drawCountdownArc(fraction: number): void {
        if (!this.arcGraphics) return;
        const g = this.arcGraphics;
        g.clear();
        // Background circle (dim gray)
        g.strokeColor = new Color(80, 80, 80, 200);
        g.lineWidth = 4;
        g.circle(0, 0, this._arcRadius);
        g.stroke();
        // Foreground arc — clockwise from top (12 o'clock = -PI/2)
        if (fraction > 0) {
            const startAngle = -Math.PI / 2;
            const endAngle = startAngle + 2 * Math.PI * fraction;
            g.strokeColor = new Color(255, 255, 255, 255);
            g.lineWidth = 4;
            g.arc(0, 0, this._arcRadius, startAngle, endAngle, false);
            g.stroke();
        }
    }

    private _loadCellSprites(): void {
        this._loadAsSpriteFrame('flowers/cell_fire', sf => {
            this._cellSpriteFrames[EffectType.SCORE_MULTIPLIER] = sf;
        });
        this._loadAsSpriteFrame('flowers/cell_freeze', sf => {
            this._cellSpriteFrames[EffectType.TIME_FREEZE] = sf;
        });
        this._loadAsSpriteFrame('flowers/cell_grass', sf => {
            this._cellSpriteFrames[EffectType.SLOW_GROWTH] = sf;
        });
    }

    private _loadAsSpriteFrame(path: string, onLoaded: (sf: SpriteFrame) => void): void {
        resources.load(`${path}/spriteFrame`, SpriteFrame, (err, sf) => {
            if (!err) { onLoaded(sf); return; }
            resources.load(path, Texture2D, (err2, tex) => {
                if (err2) { console.warn(`[PowerUpHUD] Sprite not found: ${path}`); return; }
                const fallbackSf = new SpriteFrame();
                fallbackSf.texture = tex;
                onLoaded(fallbackSf);
            });
        });
    }
}
