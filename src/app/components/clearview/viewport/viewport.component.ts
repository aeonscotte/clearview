// src/app/components/viewport/viewport.component.ts
import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { EngineService } from '../../../engine/core/engine.service';
import { SceneManagerService } from '../../../engine/core/scene-manager.service';
import { Scene001 } from '../../../engine/scenes/scene001.scene';

@Component({
    selector: 'clearview-viewport',
    templateUrl: './viewport.component.html',
    styleUrls: ['./viewport.component.less'],
})
export class ViewportComponent implements AfterViewInit {
    @ViewChild('renderCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

    constructor(
        private engineService: EngineService,
        private sceneManager: SceneManagerService
    ) { }

    async ngAfterViewInit(): Promise<void> {
        const canvas = this.canvasRef.nativeElement;

        this.engineService.createEngine(canvas);

        await this.sceneManager.loadScene(Scene001, canvas);
    }
}
