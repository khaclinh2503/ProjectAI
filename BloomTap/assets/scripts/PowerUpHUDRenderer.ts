import { _decorator, Component, Graphics, Color, Node, Sprite, SpriteFrame, Texture2D, UITransform, resources } from 'cc';
import { EffectType, PowerUpState } from './logic/PowerUpState';
import { getPowerUpConfig } from './logic/GameConfig';

const { ccclass, property } = _decorator;

const EFFECT_ORDER: EffectType[] = [
    EffectType.SCORE_MULTIPLIER,
    EffectType.TIME_FREEZE,
    EffectType.SLOW_GROWTH,
];
const SLOT_SIZE  = 50;
const SLOT_GAP   = 60;
const ARC_RADIUS = 20;

interface EffectSlot {
    node:      Node;
    icon:      Sprite;
    arc:       Graphics;
    effect:    EffectType;
}

@ccclass('PowerUpHUDRenderer')
export class PowerUpHUDRenderer extends Component {
    // Keep inspector properties for backward compatibility (no longer used at runtime)
    @property(Sprite)
    iconSprite: Sprite | null = null;

    @property(Graphics)
    arcGraphics: Graphics | null = null;

    private _slots: EffectSlot[] = [];
    private _cellSpriteFrames: Partial<Record<EffectType, SpriteFrame>> = {};

    onLoad(): void {
        this.node.active = false;
        this._buildSlots();
        this._loadCellSprites();
    }

    /**
     * Called each frame by GameController.update().
     * Pure read — never mutates powerUpState.
     */
    public tick(powerUpState: PowerUpState, nowMs: number): void {
        const anyActive = powerUpState.isAnyActive(nowMs);
        this.node.active = anyActive;
        if (!anyActive) return;

        for (const slot of this._slots) {
            const active = powerUpState.isEffectActive(slot.effect, nowMs);
            slot.node.active = active;
            if (!active) continue;

            // Update icon sprite
            const sf = this._cellSpriteFrames[slot.effect];
            if (sf) slot.icon.spriteFrame = sf;

            // Draw countdown arc
            const remaining = powerUpState.getRemainingMs(slot.effect, nowMs);
            const total     = this._getDurationForEffect(slot.effect);
            const pct       = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
            this._drawArc(slot.arc, pct);
        }
    }

    private _buildSlots(): void {
        const totalWidth = EFFECT_ORDER.length * SLOT_SIZE + (EFFECT_ORDER.length - 1) * (SLOT_GAP - SLOT_SIZE);
        const startX = -(totalWidth / 2) + SLOT_SIZE / 2;

        EFFECT_ORDER.forEach((effect, i) => {
            const slotNode = new Node(`slot_${effect}`);
            slotNode.layer = this.node.layer;
            slotNode.addComponent(UITransform).setContentSize(SLOT_SIZE, SLOT_SIZE);
            slotNode.setPosition(startX + i * SLOT_GAP, 0, 0);
            this.node.addChild(slotNode);

            const iconNode = new Node('icon');
            iconNode.layer = this.node.layer;
            iconNode.addComponent(UITransform).setContentSize(SLOT_SIZE, SLOT_SIZE);
            const icon = iconNode.addComponent(Sprite);
            icon.sizeMode = Sprite.SizeMode.CUSTOM;
            slotNode.addChild(iconNode);

            const arcNode = new Node('arc');
            arcNode.layer = this.node.layer;
            arcNode.addComponent(UITransform).setContentSize(SLOT_SIZE, SLOT_SIZE);
            const arc = arcNode.addComponent(Graphics);
            slotNode.addChild(arcNode);

            this._slots.push({ node: slotNode, icon, arc, effect });
            this._drawArc(arc, 1.0);
        });
    }

    private _getDurationForEffect(effect: EffectType): number {
        const cfg = getPowerUpConfig();
        switch (effect) {
            case EffectType.SCORE_MULTIPLIER: return cfg.scoreMultiplier.durationMs;
            case EffectType.TIME_FREEZE:      return cfg.timeFreeze.durationMs;
            case EffectType.SLOW_GROWTH:      return cfg.slowGrowth.durationMs;
        }
    }

    private _drawArc(g: Graphics, fraction: number): void {
        g.clear();
        const bgAlpha = Math.floor((1 - fraction) * 220);
        if (bgAlpha > 0) {
            g.strokeColor = new Color(40, 40, 40, bgAlpha);
            g.lineWidth = 6;
            g.circle(0, 0, ARC_RADIUS);
            g.stroke();
        }
        if (fraction > 0) {
            const top  = Math.PI / 2;
            const tail = top - 2 * Math.PI * fraction;
            g.strokeColor = new Color(255, 255, 255, 255);
            g.lineWidth = 6;
            g.arc(0, 0, ARC_RADIUS, top, tail, true);
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
