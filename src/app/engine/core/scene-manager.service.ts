// src/app/engine/core/scene-manager.service.ts
import { Injectable, Injector, Type } from '@angular/core';
import { Scene } from '@babylonjs/core/scene';
import { BaseScene } from '../base/scene';
import { EngineService } from './engine.service';
import { Observable } from 'rxjs';
import { AssetManagerService } from '../core/asset-manager.service';

@Injectable({ providedIn: 'root' })
export class SceneManagerService {
    private currentSceneInstance: BaseScene | null = null;
    private renderLoopActive = false;

    constructor(
        private engineService: EngineService,
        private assetManager: AssetManagerService,
        private injector: Injector
    ) { }

    async loadScene(sceneType: Type<BaseScene>, canvas: HTMLCanvasElement): Promise<void> {
        // Clean up any existing scene first
        this.cleanUp();

        // Create a fresh engine with the new canvas
        const engine = this.engineService.createEngine(canvas);

        // Get scene instance from Angular DI system
        this.currentSceneInstance = this.injector.get(sceneType);

        try {
            // Initialize the scene
            await this.currentSceneInstance.init(canvas);

            // Start the render loop
            this.setupRenderLoop();
        } catch (error) {
            console.error('Error initializing scene:', error);
            this.cleanUp();
            throw error;
        }
    }

    private setupRenderLoop(): void {
        if (this.renderLoopActive) {
            this.stopRenderLoop();
        }

        const engine = this.engineService.getEngine();
        this.renderLoopActive = true;

        engine.runRenderLoop(() => {
            if (this.currentSceneInstance) {
                const delta = engine.getDeltaTime();
                this.currentSceneInstance.update(delta);
                const scene = this.currentSceneInstance.getScene();
                if (scene) {
                    scene.render();
                }
            }
        });
    }

    stopRenderLoop(): void {
        if (this.renderLoopActive) {
            const engine = this.engineService.getEngine();
            engine.stopRenderLoop();
            this.renderLoopActive = false;
        }
    }

    // Force a scene update regardless of pause state
    forceUpdate(): void {
        if (!this.currentSceneInstance) return;

        const engine = this.engineService.getEngine();
        const delta = engine.getDeltaTime();
        this.currentSceneInstance.update(delta);
    }

    // Restore the render loop
    restoreRenderLoop(): void {
        this.setupRenderLoop();
    }

    // Clean up all resources
    cleanUp(): void {
        // Stop the render loop
        this.stopRenderLoop();

        // Dispose current scene
        if (this.currentSceneInstance) {
            this.currentSceneInstance.dispose();
            this.currentSceneInstance = null;
        }
    }

    getCurrentScene(): Scene | undefined {
        return this.currentSceneInstance?.getScene();
    }

    hasActiveScene(): boolean {
        return !!this.currentSceneInstance;
    }

    // Get asset loading progress
    getAssetLoadingProgress(): Observable<number> {
        return this.assetManager.getLoadingProgress();
    }
}