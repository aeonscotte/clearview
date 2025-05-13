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
        
        // Get celestial factors from the shared service
        const { sunHeight, dayFactor, nightFactor, dawnFactor, duskFactor } = 
            this.celestialService.getCelestialPositions();
        
        // Define colors for different times of day - more realistic values
        const nightFog = new Color3(0.015, 0.015, 0.04);  // Very dark blue-black matching sky
        const dawnFog = new Color3(0.65, 0.4, 0.25);      // Warm orange-gold matching sunrise
        const dayFog = new Color3(0.7, 0.8, 0.95);        // Light blue matching daytime sky
        const duskFog = new Color3(0.6, 0.25, 0.15);      // Deep orange-red matching sunset
            
        // Ambient light colors - adjusted for physical realism
        const nightAmbient = new Color3(0.05, 0.05, 0.1); // Subtle blue night ambient
        const dawnAmbient = new Color3(0.35, 0.2, 0.15);  // Warm sunrise ambient
        const dayAmbient = new Color3(0.55, 0.55, 0.6);   // Neutral daytime ambient
        const duskAmbient = new Color3(0.3, 0.15, 0.1);   // Warm sunset ambient
        
        // Blend fog colors based on time periods
        scene.fogColor = new Color3(0, 0, 0);
        scene.fogColor.addInPlace(nightFog.scale(nightFactor));
        scene.fogColor.addInPlace(dayFog.scale(dayFactor));
        scene.fogColor.addInPlace(dawnFog.scale(dawnFactor));
        scene.fogColor.addInPlace(duskFog.scale(duskFactor));
        
        // Normalize fog color to avoid over-brightening
        const totalWeight = Math.min(1.0, nightFactor + dayFactor + dawnFactor * 0.8 + duskFactor * 0.8);
        if (totalWeight > 0) {
            scene.fogColor.scaleInPlace(1.0 / totalWeight);
        }
        
        // Blend ambient colors similarly
        scene.ambientColor = new Color3(0, 0, 0);
        scene.ambientColor.addInPlace(nightAmbient.scale(nightFactor));
        scene.ambientColor.addInPlace(dayAmbient.scale(dayFactor));
        scene.ambientColor.addInPlace(dawnAmbient.scale(dawnFactor));
        scene.ambientColor.addInPlace(duskAmbient.scale(duskFactor));
        
        // Normalize ambient color
        if (totalWeight > 0) {
            scene.ambientColor.scaleInPlace(1.0 / totalWeight);
        }
        
        // Subtle fog movement effect
        const fogPulse = 0.0005 * Math.sin(elapsed * 0.3);
        const fogDrift = 0.0003 * Math.cos(elapsed * 0.7);
        
        // Fog density changes with altitude and time of day
        const camera = scene.activeCamera;
        const camY = camera?.position.y ?? 0;
        const altitudeFactor = Math.exp(-camY / 150.0);
        
        // More fog at dawn/dusk, slightly more at night
        const duskDawnFactor = Math.max(dawnFactor, duskFactor);
        const baseFog = 0.005 + nightFactor * 0.003 + duskDawnFactor * 0.01 - dayFactor * 0.002;
        
        // Final fog density calculation
        scene.fogDensity = Math.max(0.0002, (baseFog + fogPulse + fogDrift) * altitudeFactor);
    }
}