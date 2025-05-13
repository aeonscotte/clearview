import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TimeService {
    private startTime = performance.now();
    private lastFrameTime = performance.now();
    private elapsed = 0;

    update(): void {
        const now = performance.now();
        this.elapsed = (now - this.startTime) / 1000; // seconds
        this.lastFrameTime = now;
    }

    getWorldTime(): number {
        // Simulate 24h day every 120 seconds
        return (this.elapsed / 120.0) * 24.0;
    }

    getDelta(): number {
        return (performance.now() - this.lastFrameTime) / 1000;
    }

    getElapsed(): number {
        return this.elapsed;
    }
}

