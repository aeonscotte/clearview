import { Injectable } from '@angular/core';
import { Scene, Color3 } from '@babylonjs/core';
import { TimeService } from '../physics/time.service';
import { CelestialService } from './celestial.service';

@Injectable({
  providedIn: 'root'
})
export class AtmosphereService {
    constructor(
        private timeService: TimeService,
        private celestialService: CelestialService
    ) {}

    setup(scene: Scene): void {
        scene.fogMode = Scene.FOGMODE_EXP2;
        scene.fogDensity = 0.001;
        scene.fogColor = new Color3(0.04, 0.04, 0.08); // Initial midnight color
        scene.ambientColor = new Color3(0.05, 0.05, 0.15); // Initial midnight ambient
        
        // Apply atmosphere for current time immediately
        this.update(scene);
    }

    update(scene: Scene): void {
        const elapsed = this.timeService.getElapsed();
        
        // Get celestial factors and key times
        const celestialData = this.celestialService.getCelestialPositions();
        const { dayFactor, nightFactor, dawnFactor, duskFactor, keyTimes } = celestialData;
        const worldTime = this.timeService.getWorldTime();
        
        // Scientific atmospheric colors based on time of day
        // Matching the sky shader colors
        const nightFog = new Color3(0.04, 0.04, 0.08);        // Deep blue
        const dawnFog = new Color3(0.65, 0.4, 0.25);          // Warm orange-gold
        const dayFog = new Color3(0.7, 0.8, 0.95);            // Light blue
        const duskFog = new Color3(0.55, 0.25, 0.15);         // Deep orange-red
        
        // Scientific ambient light colors
        const nightAmbient = new Color3(0.05, 0.05, 0.1);     // Subtle blue
        const dawnAmbient = new Color3(0.35, 0.2, 0.15);      // Warm orange
        const dayAmbient = new Color3(0.55, 0.55, 0.6);       // Neutral
        const duskAmbient = new Color3(0.3, 0.15, 0.1);       // Warm red
        
        // Use the same sunrise/sunset transitions as the sky shader
        const { 
            midnight, 
            dawnStart, 
            sunrise, 
            dawnEnd, 
            noon,
            duskStart, 
            sunset, 
            duskEnd 
        } = keyTimes;
        
        // Get fog color using the same transition logic as the sky shader
        scene.fogColor = new Color3(0, 0, 0);
        
        // Morning transitions (midnight through dawn to day)
        if (worldTime >= midnight && worldTime < dawnStart) {
            // Night - steady
            scene.fogColor.copyFrom(nightFog);
        }
        else if (worldTime >= dawnStart && worldTime < sunrise) {
            // Dawn start to sunrise: night → dawn
            const t = this.smootherstep(dawnStart, sunrise, worldTime);
            Color3.LerpToRef(nightFog, dawnFog, t, scene.fogColor);
        }
        else if (worldTime >= sunrise && worldTime < dawnEnd) {
            // Sunrise to dawn end: dawn → day
            const t = this.smootherstep(sunrise, dawnEnd, worldTime);
            Color3.LerpToRef(dawnFog, dayFog, t, scene.fogColor);
        }
        else if (worldTime >= dawnEnd && worldTime < duskStart) {
            // Full day - steady
            scene.fogColor.copyFrom(dayFog);
        }
        else if (worldTime >= duskStart && worldTime < sunset) {
            // Dusk start to sunset: day → dusk
            const t = this.smootherstep(duskStart, sunset, worldTime);
            Color3.LerpToRef(dayFog, duskFog, t, scene.fogColor);
        }
        else if (worldTime >= sunset && worldTime < duskEnd) {
            // Sunset to dusk end: dusk → night
            const t = this.smootherstep(sunset, duskEnd, worldTime);
            Color3.LerpToRef(duskFog, nightFog, t, scene.fogColor);
        }
        else {
            // Dusk end to midnight - steady night
            scene.fogColor.copyFrom(nightFog);
        }
        
        // Do the same for ambient light color
        scene.ambientColor = new Color3(0, 0, 0);
        
        // Morning transitions (midnight through dawn to day)
        if (worldTime >= midnight && worldTime < dawnStart) {
            // Night - steady
            scene.ambientColor.copyFrom(nightAmbient);
        }
        else if (worldTime >= dawnStart && worldTime < sunrise) {
            // Dawn start to sunrise: night → dawn
            const t = this.smootherstep(dawnStart, sunrise, worldTime);
            Color3.LerpToRef(nightAmbient, dawnAmbient, t, scene.ambientColor);
        }
        else if (worldTime >= sunrise && worldTime < dawnEnd) {
            // Sunrise to dawn end: dawn → day
            const t = this.smootherstep(sunrise, dawnEnd, worldTime);
            Color3.LerpToRef(dawnAmbient, dayAmbient, t, scene.ambientColor);
        }
        else if (worldTime >= dawnEnd && worldTime < duskStart) {
            // Full day - steady
            scene.ambientColor.copyFrom(dayAmbient);
        }
        else if (worldTime >= duskStart && worldTime < sunset) {
            // Dusk start to sunset: day → dusk
            const t = this.smootherstep(duskStart, sunset, worldTime);
            Color3.LerpToRef(dayAmbient, duskAmbient, t, scene.ambientColor);
        }
        else if (worldTime >= sunset && worldTime < duskEnd) {
            // Sunset to dusk end: dusk → night
            const t = this.smootherstep(sunset, duskEnd, worldTime);
            Color3.LerpToRef(duskAmbient, nightAmbient, t, scene.ambientColor);
        }
        else {
            // Dusk end to midnight - steady night
            scene.ambientColor.copyFrom(nightAmbient);
        }
        
        // Subtle atmospheric motion
        const fogPulse = 0.0005 * Math.sin(elapsed * 0.3);
        const fogDrift = 0.0003 * Math.cos(elapsed * 0.7);
        
        // Fog density changes with altitude and time of day
        const camera = scene.activeCamera;
        const camY = camera?.position.y ?? 0;
        const altitudeFactor = Math.exp(-camY / 150.0);
        
        // Scientific fog density variation through the day
        // More fog at dawn/dusk due to temperature variations
        const duskDawnFactor = Math.max(dawnFactor, duskFactor);
        const baseFog = 0.005 + nightFactor * 0.003 + duskDawnFactor * 0.01 - dayFactor * 0.002;
        
        // Final fog density calculation
        scene.fogDensity = Math.max(0.0002, (baseFog + fogPulse + fogDrift) * altitudeFactor);
    }
    
    /**
     * Enhanced smoothstep function for smoother transitions
     * More gradual than standard smoothstep
     */
    private smootherstep(edge0: number, edge1: number, x: number): number {
        // Handle edge case where edge0 > edge1 (for wrapping around midnight)
        if (edge0 > edge1 && x < edge0 && x < edge1) {
            x += 24; // Wrap around for time calculations
        }
        
        // Clamp x to 0..1 range
        x = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        
        // Evaluate 6x^5 - 15x^4 + 10x^3 (better for more gradual transitions)
        return x * x * x * (x * (x * 6 - 15) + 10);
    }
}