import { _decorator, Component, Node, Graphics, Color, UITransform } from 'cc';
import { PowerUpState, SpecialEffectType } from './logic/PowerUpState';
import { PowerUpsConfig } from './logic/GameConfig';

const { ccclass } = _decorator;

const ICON_RADIUS = 16;
const SLOT_GAP = 12;
const TOTAL_WIDTH = 3 * (ICON_RADIUS * 2) + 2 * SLOT_GAP; // 3 icons + 2 gaps

// Effect colors (same as GridRenderer overlay — consistent visual language)
const EFFECT_COLORS: Record<SpecialEffectType, Color> = {
    SCORE_MULTIPLIER: new Color(255, 215,   0, 255), // gold
    TIME_FREEZE:      new Color( 64, 164, 255, 255), // ice blue
    SLOW_GROWTH:      new Color( 80, 220,  80, 255), // green
};

const BG_RING_COLOR = new Color(60, 60, 70, 255);

const EFFECT_ORDER: SpecialEffectType[] = ['SCORE_MULTIPLIER', 'TIME_FREEZE', 'SLOW_GROWTH'];

interface SlotView {
    node: Node;
    graphics: Graphics;
    effect: SpecialEffectType;
}

@ccclass('PowerUpHUDRenderer')
export class PowerUpHUDRenderer extends Component {
    private _slots: SlotView[] = [];
    private _powerUpConfig: PowerUpsConfig | null = null;

    onLoad(): void {
        this._buildSlots();
        this.node.active = false; // hidden by default (D-20)
    }

    /** Called by GameController to provide config for duration lookups. */
    init(config: PowerUpsConfig): void {
        this._powerUpConfig = config;
    }

    private _buildSlots(): void {
        for (let i = 0; i < 3; i++) {
            const effect = EFFECT_ORDER[i];
            const slotNode = new Node(`powerup_slot_${i}`);
            slotNode.layer = this.node.layer;

            const uiT = slotNode.addComponent(UITransform);
            uiT.setContentSize(ICON_RADIUS * 2, ICON_RADIUS * 2);

            const g = slotNode.addComponent(Graphics);

            // Position: centered horizontal row
            const x = i * (ICON_RADIUS * 2 + SLOT_GAP) - TOTAL_WIDTH / 2 + ICON_RADIUS;
            slotNode.setPosition(x, 0, 0);

            this.node.addChild(slotNode);
            this._slots.push({ node: slotNode, graphics: g, effect });
        }
    }

    /**
     * Called by GameController every frame during PLAYING phase.
     * Shows/hides the entire HUD row based on active count (D-20).
     * Renders circular arc timer for each active effect (D-21, D-22).
     */
    tick(powerUpState: PowerUpState, nowMs: number): void {
        const activeCount = powerUpState.getActiveCount(nowMs);

        // D-20: hide entire area when no effects active
        if (activeCount === 0) {
            if (this.node.active) this.node.active = false;
            return;
        }

        if (!this.node.active) this.node.active = true;

        for (const slot of this._slots) {
            const g = slot.graphics;
            g.clear();

            if (!powerUpState.isActive(slot.effect, nowMs)) {
                // Inactive slot: faint ring only
                this._paintInactiveSlot(g);
                continue;
            }

            // Active slot: colored fill + arc timer
            const remainingMs = powerUpState.getRemaining(slot.effect, nowMs);
            const totalMs = this._getTotalDuration(slot.effect);
            const fraction = totalMs > 0 ? remainingMs / totalMs : 0;
            const color = EFFECT_COLORS[slot.effect];

            this._paintActiveSlot(g, fraction, color);
        }
    }

    private _getTotalDuration(effect: SpecialEffectType): number {
        if (!this._powerUpConfig) return 1; // fallback
        switch (effect) {
            case 'SCORE_MULTIPLIER': return this._powerUpConfig.scoreMultiplier.durationMs;
            case 'TIME_FREEZE':      return this._powerUpConfig.timeFreeze.durationMs;
            case 'SLOW_GROWTH':      return this._powerUpConfig.slowGrowth.durationMs;
        }
    }

    private _paintInactiveSlot(g: Graphics): void {
        g.strokeColor = BG_RING_COLOR;
        g.lineWidth = 2;
        g.circle(0, 0, ICON_RADIUS);
        g.stroke();
    }

    private _paintActiveSlot(g: Graphics, fraction: number, color: Color): void {
        // Background ring
        g.strokeColor = BG_RING_COLOR;
        g.lineWidth = 4;
        g.circle(0, 0, ICON_RADIUS);
        g.stroke();

        // Inner fill circle (effect color, semi-transparent)
        g.fillColor = new Color(color.r, color.g, color.b, 80);
        g.circle(0, 0, ICON_RADIUS - 3);
        g.fill();

        // Foreground arc (clockwise from top, shrinking as timer runs out)
        if (fraction > 0.001) {
            const startAngle = -Math.PI / 2;
            const endAngle = startAngle + fraction * Math.PI * 2;
            g.strokeColor = color;
            g.lineWidth = 4;
            g.arc(0, 0, ICON_RADIUS, startAngle, endAngle, false);
            g.stroke();
        }
    }
}
