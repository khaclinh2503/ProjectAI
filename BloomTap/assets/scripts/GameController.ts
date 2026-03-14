import { _decorator, Component, Label } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GameController')
export class GameController extends Component {
    @property(Label)
    titleLabel: Label | null = null;

    onLoad(): void {
        if (this.titleLabel) {
            this.titleLabel.string = 'Bloom Tap';
        }
    }
}
