// src/app/components/clearview/viewport/viewport.component.ts
import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, HostListener, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EngineService } from '../../../engine/core/engine.service';
import { SceneManagerService } from '../../../engine/core/scene-manager.service';
import { Scene001 } from '../../../engine/scenes/scene001.scene';
import { GuiService } from '../../../engine/core/gui.service';
import { AssetManagerService } from '../../../engine/core/asset-manager.service';
import { PauseMenuComponent } from '../../ui/pause-menu/pause-menu.component';
import { LoadingIndicatorComponent } from '../../ui/loading-indicator/loading-indicator.component';
import { FpsCounterComponent } from '../../ui/fps-counter/fps-counter.component';
import { PerformanceSettingsService } from '../../../engine/performance/performance-settings.service';

@Component({
    selector: 'clearview-viewport',
    standalone: true,
    imports: [
        CommonModule,
        PauseMenuComponent,
        LoadingIndicatorComponent,
        FpsCounterComponent
    ],
    templateUrl: './viewport.component.html',
    styleUrls: ['./viewport.component.less']
})
export class ViewportComponent implements AfterViewInit, OnDestroy {
    @ViewChild('renderCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
    private resizeListener: (() => void) | null = null;

    showFps = true;

    constructor(
        private ngZone: NgZone,
        private engineService: EngineService,
        private sceneManager: SceneManagerService,
        private guiService: GuiService,
        private assetManager: AssetManagerService,
        private perfSettings: PerformanceSettingsService
    ) {
        this.perfSettings.settings$.subscribe(s => this.showFps = s.showFps);
    }

    async ngAfterViewInit(): Promise<void> {
        this.ngZone.runOutsideAngular(async () => {
            await this.initializeScene();
        });
    }

    ngOnDestroy(): void {
        // Remove resize listener
        if (this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
            this.resizeListener = null;
        }

        // Clean up js resources
        this.sceneManager.cleanUp();
        this.engineService.cleanUp();
        this.guiService.cleanUp();
    }

    private async initializeScene(): Promise<void> {
        try {
            const canvas = this.canvasRef.nativeElement;

            // Load scene (creates fresh engine)
            await this.sceneManager.loadScene(Scene001, canvas);

            // Initialize GUI
            const scene = this.sceneManager.getCurrentScene();
            if (scene) {
                this.guiService.initialize(scene);
            }

            // Set up resize handler
            this.setupResizeHandler();
        } catch (error) {
            console.error('Error initializing scene:', error);
        }
    }

    private setupResizeHandler(): void {
        // Remove existing listener
        if (this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
        }

        // Add new resize listener
        const engine = this.engineService.getEngine();
        this.resizeListener = () => engine.resize();
        window.addEventListener('resize', this.resizeListener);
    }

    @HostListener('window:keydown', ['$event'])
    handleKeyDown(event: KeyboardEvent): void {
        // Toggle pause menu on ESC key
        if (event.key === 'Escape') {
            this.ngZone.run(() => {
                this.guiService.togglePause();
            });
        }
    }
}