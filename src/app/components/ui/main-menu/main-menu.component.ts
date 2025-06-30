import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsMenuComponent } from '../settings-menu/settings-menu.component';
import { SceneSelectorComponent } from '../scene-selector/scene-selector.component';
import { Type } from '@angular/core';

@Component({
    selector: 'app-main-menu',
    standalone: true,
    imports: [CommonModule, SettingsMenuComponent, SceneSelectorComponent],
    templateUrl: './main-menu.component.html',
    styleUrls: ['./main-menu.component.less']
})
export class MainMenuComponent {
    @Output() start = new EventEmitter<void>();
    @Output() scene = new EventEmitter<Type<any>>();

    showSettings = false;
    showSceneSelector = false;

    openSettings(): void {
        this.showSettings = true;
    }

    openSceneSelector(): void {
        this.showSceneSelector = true;
    }

    closeSettings(): void {
        this.showSettings = false;
    }

    sceneSelected(type: Type<any>): void {
        this.scene.emit(type);
        this.showSceneSelector = false;
    }
}
