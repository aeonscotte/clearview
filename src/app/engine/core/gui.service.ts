// src/app/engine/core/gui.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Scene } from '@babylonjs/core/scene';
import { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import { SceneManagerService } from './scene-manager.service';

@Injectable({
    providedIn: 'root'
})
export class GuiService {
    private isPausedSubject = new BehaviorSubject<boolean>(false);
    private activeScene: Scene | null = null;
    private engine: AbstractEngine | null = null;
    private previousAnimationPausedState = false;

    constructor(private sceneManager: SceneManagerService) { }

    initialize(scene: Scene): void {
        this.activeScene = scene;
        this.engine = scene.getEngine();
    }

    togglePause(): void {
        const newState = !this.isPausedSubject.getValue();
        this.setPaused(newState);
    }

    setPaused(isPaused: boolean): void {
        if (!this.activeScene || !this.engine) return;

        if (isPaused) {
            // Store current animation state before pausing
            this.previousAnimationPausedState = this.activeScene.animationsEnabled;

            // Pause scene animations and physics
            this.activeScene.animationsEnabled = false;

            if (this.activeScene.physicsEnabled) {
                this.activeScene.physicsEnabled = false;
            }

            // Stop render loop
            this.engine.stopRenderLoop();
        } else {
            // Restore previous animation state
            this.activeScene.animationsEnabled = this.previousAnimationPausedState;

            if (this.activeScene.physicsEnabled === false) {
                this.activeScene.physicsEnabled = true;
            }

            // Let the SceneManager restore the proper render loop with full updates
            this.sceneManager.restoreRenderLoop();
        }

        this.isPausedSubject.next(isPaused);
    }

    isPaused(): Observable<boolean> {
        return this.isPausedSubject.asObservable();
    }
}