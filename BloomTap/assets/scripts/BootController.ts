import { _decorator, Component, director } from 'cc';
const { ccclass } = _decorator;

@ccclass('BootController')
export class BootController extends Component {
    onLoad(): void {
        director.loadScene('GameScene');
    }
}
