// src/app/engine/physics/time.service.ts
import { inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TimeService {
    private startTime = performance.now();
    private lastFrameTime = performance.now();
    private elapsed = 0;
    public readonly dayDurationInSeconds = 120; // [seconds] day-night cycle length
    private continuousRotation = 0; // Track continuous rotation angle

    // Allow setting initial time (e.g., start at midnight)
    constructor() {
        // Set initial time if needed
        this.elapsed = (0 / 24) * this.dayDurationInSeconds;
    }

    update(): void {
        const now = performance.now();
        this.elapsed = (now - this.startTime) / 1000; // seconds
        
        // Calculate continuous rotation - this never resets
        // We'll use a much slower cycle for the stars than the day/night cycle
        // This simulates the year-long cycle of stars relative to Earth's position
        this.continuousRotation = this.elapsed * 0.1; // Slow rotation speed
        
        this.lastFrameTime = now;
    }

    getWorldTime(): number {
        // Convert elapsed seconds to hours (0-24)
        const hoursPerSecond = 24 / this.dayDurationInSeconds;
        return (this.elapsed * hoursPerSecond) % 24;
    }

    getDelta(): number {
        return (performance.now() - this.lastFrameTime) / 1000;
    }

    getElapsed(): number {
        return this.elapsed;
    }
    
    // New method to get continuous rotation value for stars
    getContinuousRotation(): number {
        return this.continuousRotation;
    }
    
    // Helper method to set time to a specific hour
    setWorldTime(hour: number): void {
        hour = hour % 24; // Ensure hour is in 0-24 range
        this.elapsed = (hour / 24) * this.dayDurationInSeconds;
        this.startTime = performance.now() - (this.elapsed * 1000);
    }
}