// src/app/engine/physics/time.service.ts
import { inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TimeService {
    private startTime = performance.now();
    private lastFrameTime = performance.now();
    private elapsed = 0;
    public readonly dayDurationInSeconds = 1440; // [seconds] day-night cycle length
    private continuousRotation = 0; // Track continuous rotation angle
    private starRotationFactor: number; // Factor to scale star rotation properly
    
    // Allow setting initial time (e.g., start at midnight)
    constructor() {
        // Set initial time if needed
        this.elapsed = (0 / 24) * this.dayDurationInSeconds;
        
        // Calculate scientifically accurate star rotation factor
        // Stars complete one full rotation every sidereal day (23h 56m 4s)
        // which is slightly faster than the solar day (24h)
        // The ratio is approximately 0.9973 rotations per solar day
        const siderealToSolarRatio = 0.9973;
        
        // Stars should complete siderealToSolarRatio rotations during one day cycle
        this.starRotationFactor = (2 * Math.PI * siderealToSolarRatio) / this.dayDurationInSeconds;
    }

    update(): void {
        const now = performance.now();
        this.elapsed = (now - this.startTime) / 1000; // seconds
        
        // Calculate continuous rotation using scientifically accurate star rotation speed
        // This simulates Earth's rotation relative to the stars (sidereal rotation)
        this.continuousRotation = this.elapsed * this.starRotationFactor;
        
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
        
        // Update continuous rotation to match the new time while preserving
        // the realistic rotation mapping
        this.continuousRotation = this.elapsed * this.starRotationFactor;
    }
}