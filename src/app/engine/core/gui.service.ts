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
    }

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
            // First pause the time service
            this.timeService.pause();

            // Store current animation state before pausing
            this.previousAnimationPausedState = this.activeScene.animationsEnabled;

            // Pause scene animations and physics
            this.activeScene.animationsEnabled = false;

            if (this.activeScene.physicsEnabled) {
                this.activeScene.physicsEnabled = false;
            }

            // Stop render loop but keep the menu visible
            this.engine.stopRenderLoop();

            // Set up a minimal render loop just to keep UI visible
            this.engine.runRenderLoop(() => {
                // Only render, don't update anything
                this.activeScene?.render();
            });
        } else {
            // First stop the minimal render loop
            this.engine.stopRenderLoop();

            // Resume time service
            this.timeService.resume();

            // Restore previous animation state
            this.activeScene.animationsEnabled = this.previousAnimationPausedState;

            if (this.activeScene.physicsEnabled === false) {
                this.activeScene.physicsEnabled = true;
            }

            // Force a complete state update before restarting the render loop
            this.timeService.update(16); // Simulate a ~60fps frame
            this.sceneManager.forceUpdate();

            // Restart the render loop with full updates
            this.sceneManager.restoreRenderLoop();
        }

        // Update the pause state
        this.isPausedSubject.next(isPaused);
    }

    isPaused(): Observable<boolean> {
        return this.isPausedSubject.asObservable();
    }
}