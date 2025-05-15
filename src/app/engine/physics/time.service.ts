// src/app/engine/physics/time.service.ts
import { inject, Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class TimeService {
    private startTime = performance.now();
    private lastFrameTime = performance.now();
    private elapsed = 0;
    private deltaSec = 0;
    public readonly dayDurationInSeconds = 1440; // Day-night cycle length in seconds
    private continuousRotation = 0; // Track continuous rotation angle
    private starRotationFactor: number; // Factor to scale star rotation properly

    constructor() {
        // Set initial time if needed
        this.elapsed = (0 / 24) * this.dayDurationInSeconds;

        // Simple one rotation per day
        this.starRotationFactor = (2 * Math.PI) / this.dayDurationInSeconds;
    }

    update(deltaTime?: number): void {
        const now = performance.now();
        
        // Calculate delta time in seconds
        if (deltaTime !== undefined) {
            this.deltaSec = deltaTime * 0.001; // Convert ms to seconds if provided
        } else {
            this.deltaSec = (now - this.lastFrameTime) * 0.001; // Fallback calculation
        }
        
        // Add delta to elapsed time (frame-rate independent)
        this.elapsed += this.deltaSec;
        
        // Update continuous rotation for Earth's sidereal rotation relative to stars
        this.continuousRotation += this.deltaSec * this.starRotationFactor;
        
        this.lastFrameTime = now;
    }

    // Convert elapsed seconds to hours (0-24)
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

    // Get continuous rotation value for stars
    getContinuousRotation(): number {
        return this.continuousRotation;
    }

    // Helper to set time to a specific hour (0-24)
    setWorldTime(hour: number): void {
        hour = hour % 24; // Ensure hour is in 0-24 range
        this.elapsed = (hour / 24) * this.dayDurationInSeconds;
        this.startTime = performance.now() - (this.elapsed * 1000);

        // Update continuous rotation to match the new time while preserving realistic rotation
        this.continuousRotation = this.elapsed * this.starRotationFactor;
    }
}