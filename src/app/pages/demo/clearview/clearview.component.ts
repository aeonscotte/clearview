// src/app/pages/demo/clearview/clearview.component.ts
import { Component } from '@angular/core';
import { ViewportComponent } from '../../../components/clearview/viewport/viewport.component';
import { MainMenuComponent } from '../../../components/ui/main-menu/main-menu.component';
import { AudioService } from '../../../engine/audio/audio.service';

@Component({
    selector: 'app-clearview',
    imports: [ViewportComponent, MainMenuComponent],
    templateUrl: './clearview.component.html',
    styleUrls: ['./clearview.component.less']
})
export class ClearviewComponent {
    showMenu = true;

    constructor(private audioService: AudioService) {}

    startScene(): void {
        this.showMenu = false;
        this.audioService.play('assets/audio/bgm.mp3', true);
    }
}