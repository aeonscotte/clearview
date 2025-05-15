// src/app/engine/physics/time.service.ts
import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class TimeService {
    private startTime = performance.now();
    private lastFrameTime = performance.now();
    private elapsed = 0;
    private deltaSec = 0;
    private _isPaused = false;
    private pauseStartTime = 0;
    public readonly dayDurationInSeconds = 1440;
    private continuousRotation = 0;
    private starRotationFactor: number;

    constructor() {
        this.elapsed = (0 / 24) * this.dayDurationInSeconds;
        this.starRotationFactor = (2 * Math.PI) / this.dayDurationInSeconds;
    }

    update(deltaTime?: number): void {
        if (this._isPaused) return;

        const now = performance.now();

        if (deltaTime !== undefined) {
            this.deltaSec = deltaTime * 0.001;
        } else {
            this.deltaSec = (now - this.lastFrameTime) * 0.001;
        }

        this.elapsed += this.deltaSec;
        this.continuousRotation += this.deltaSec * this.starRotationFactor;
        this.lastFrameTime = now;
    }

    pause(): void {
        if (this._isPaused) return;
        this._isPaused = true;
        this.pauseStartTime = performance.now();
    }

    resume(): void {
        if (!this._isPaused) return;
        this._isPaused = false;
        const pauseDuration = performance.now() - this.pauseStartTime;
        this.lastFrameTime += pauseDuration;
    }

    // Add this method to allow other services to check pause state
    isPaused(): boolean {
        return this._isPaused;
    }

    getWorldTime(): number {
        const hoursPerSecond = 24 / this.dayDurationInSeconds;
        return (this.elapsed * hoursPerSecond) % 24;
    }

    getDelta(): number {
        return this.deltaSec;
    }

    getElapsed(): number {
        return this.elapsed;
    }

    getContinuousRotation(): number {
        return this.continuousRotation;
    }

    setWorldTime(hour: number): void {
        hour = hour % 24;
        this.elapsed = (hour / 24) * this.dayDurationInSeconds;
        this.startTime = performance.now() - (this.elapsed * 1000);
        this.continuousRotation = this.elapsed * this.starRotationFactor;
    }
}