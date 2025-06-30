// src/app/engine/core/gui.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Scene } from '@babylonjs/core/scene';
import { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import { SceneManagerService } from './scene-manager.service';
import { TimeService } from '../physics/time.service';

@Injectable({
    providedIn: 'root'
})
export class GuiService {
    private isPausedSubject = new BehaviorSubject<boolean>(false);
    private activeScene: Scene | null = null;
    private engine: AbstractEngine | null = null;
    private previousAnimationPausedState = false;

    constructor(
        private sceneManager: SceneManagerService,
        private timeService: TimeService
    ) { }

    initialize(scene: Scene): void {
        this.activeScene = scene;
        this.engine = scene.getEngine();

        // Reset pause state when initializing with a new scene
        if (this.isPausedSubject.getValue()) {
            this.isPausedSubject.next(false);
        }
    }

    // Clean up method for resource management
    cleanUp(): void {
        this.activeScene = null;
        this.engine = null;

        // Reset pause state
        if (this.isPausedSubject.getValue()) {
            this.isPausedSubject.next(false);
        }
    }

    // Existing methods...
    togglePause(): void {
        const newState = !this.isPausedSubject.getValue();
        this.setPaused(newState);
    }

    setPaused(isPaused: boolean): void {
        if (!this.activeScene || !this.engine) return;

        // Only apply changes if the state is actually changing
        if (isPaused === this.isPausedSubject.getValue()) {
            return;
        }

        if (isPaused) {
            // Pause time and animations
            this.timeService.pause();
            this.previousAnimationPausedState = this.activeScene.animationsEnabled;
            this.activeScene.animationsEnabled = false;

            if (this.activeScene.physicsEnabled) {
                this.activeScene.physicsEnabled = false;
            }

            // Minimal render loop for UI
            this.engine.stopRenderLoop();
            this.engine.runRenderLoop(() => {
                if (this.activeScene) this.activeScene.render();
            });
        } else {
            // Resume regular function
            this.engine.stopRenderLoop();
            this.timeService.resume();

            if (this.activeScene) {
                this.activeScene.animationsEnabled = this.previousAnimationPausedState;
                if (this.activeScene.physicsEnabled === false) {
                    this.activeScene.physicsEnabled = true;
                }
            }

            // Force state update and restore render loop
            this.timeService.update(16);
            this.sceneManager.forceUpdate();
            this.sceneManager.restoreRenderLoop();
        }

        // Update pause state
        this.isPausedSubject.next(isPaused);
    }

    isPaused(): Observable<boolean> {
        return this.isPausedSubject.asObservable();
    }
}