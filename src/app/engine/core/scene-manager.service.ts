// src/app/engine/core/scene-manager.service.ts
import { Injectable, Injector, Type } from '@angular/core';
import { Scene } from '@babylonjs/core/scene';
import { BaseScene } from '../base/scene';
import { EngineService } from './engine.service';

@Injectable({ providedIn: 'root' })
export class SceneManagerService {
    private currentSceneInstance?: BaseScene;

    constructor(
        private engineService: EngineService,
        private injector: Injector
    ) { }

    async loadScene(sceneType: Type<BaseScene>, canvas: HTMLCanvasElement): Promise<void> {
        if (this.currentSceneInstance) {
            this.currentSceneInstance.dispose();
        }

        // Get scene instance from Angular DI system
        this.currentSceneInstance = this.injector.get(sceneType);

        await this.currentSceneInstance!.init(canvas);

        // Initialize the render loop
        this.setupRenderLoop();
    }

    // Add this method to setup the render loop
    private setupRenderLoop(): void {
        const engine = this.engineService.getEngine();
        engine.runRenderLoop(() => {
            const delta = engine.getDeltaTime();
            this.currentSceneInstance?.update(delta);
            this.currentSceneInstance?.getScene().render();
        });
    }

    // Add this method to force a scene update regardless of pause state
    forceUpdate(): void {
        if (!this.currentSceneInstance) return;

        const engine = this.engineService.getEngine();
        const delta = engine.getDeltaTime();

        // Force a single update to synchronize all systems
        this.currentSceneInstance.update(delta);
    }

    // Restore the render loop
    restoreRenderLoop(): void {
        this.setupRenderLoop();
    }

    // Get the current scene
    getCurrentScene(): Scene | undefined {
        return this.currentSceneInstance?.getScene();
    }
}