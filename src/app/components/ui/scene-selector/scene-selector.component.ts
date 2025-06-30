import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Scene001 } from '../../../engine/scenes/scene001.scene';
import { Type } from '@angular/core';

interface SceneOption { name: string; type: Type<any>; }

@Component({
    selector: 'app-scene-selector',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './scene-selector.component.html',
    styleUrls: ['./scene-selector.component.less']
})
export class SceneSelectorComponent {
    @Output() scene = new EventEmitter<Type<any>>();
    @Output() close = new EventEmitter<void>();

    scenes: SceneOption[] = [
        { name: 'Scene 1', type: Scene001 }
    ];

    selectScene(option: SceneOption): void {
        this.scene.emit(option.type);
        this.close.emit();
    }

    closeDialog(): void {
        this.close.emit();
    }
}
