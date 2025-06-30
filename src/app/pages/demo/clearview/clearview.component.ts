// src/app/pages/demo/clearview/clearview.component.ts
import { Component, Type } from '@angular/core';
import { ViewportComponent } from '../../../components/clearview/viewport/viewport.component';
import { MainMenuComponent } from '../../../components/ui/main-menu/main-menu.component';
import { Scene001 } from '../../../engine/scenes/scene001.scene';
import { BaseScene } from '../../../engine/base/scene';

@Component({
    selector: 'app-clearview',
    imports: [ViewportComponent, MainMenuComponent],
    templateUrl: './clearview.component.html',
    styleUrls: ['./clearview.component.less']
})
export class ClearviewComponent {
    showMenu = true;
    sceneType: Type<BaseScene> = Scene001;

    startScene(): void {
        this.showMenu = false;
    }

    selectScene(type: Type<BaseScene>): void {
        this.sceneType = type;
    }

    returnToMenu(): void {
        this.showMenu = true;
    }
}
