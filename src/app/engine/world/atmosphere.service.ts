import { Injectable } from '@angular/core';
import { Scene, Color3 } from '@babylonjs/core';
import { TimeService } from '../physics/time.service';
import { CelestialService } from './celestial.service';
import { LightService } from './light.service';

@Injectable({
  providedIn: 'root'
})
export class AtmosphereService {
    // Fog transition properties for smooth changes
    private currentFogColor: Color3 = new Color3(0.04, 0.04, 0.08);
    private targetFogColor: Color3 = new Color3(0.04, 0.04, 0.08);
    private currentFogDensity: number = 0.001;
    private targetFogDensity: number = 0.001;
    private fogTransitionSpeed: number = 0.05;
    
    constructor(
        private timeService: TimeService,
        private celestialService: CelestialService,
        private lightService: LightService
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
        
        // Get celestial data for time-based calculations
        const celestialData = this.celestialService.getCelestialPositions();
        const { dayFactor, nightFactor, dawnFactor, duskFactor, keyTimes } = celestialData;
        const worldTime = this.timeService.getWorldTime();
        
        // Get sky colors from the light service to ensure consistency
        const skyColors = this.lightService.getSkyColors();
        
        // Calculate target fog color based on sky colors
        // Fog color is primarily influenced by the horizon color with some zenith influence
        this.targetFogColor = Color3.Lerp(
            skyColors.horizon, 
            skyColors.zenith, 
            0.15  // 15% zenith influence for slightly deeper fog color
        );
        
        // Calculate target fog density based on time of day
        // Scientific fog density variations:
        // - Higher in dawn/dusk due to temperature differentials and humidity
        // - Lower during mid-day due to heating and atmospheric mixing
        // - Moderate at night due to cooling and condensation
        
        let baseFogDensity = 0.002; // Base fog density
        
        // Apply time-of-day multipliers
        if (dawnFactor > 0.5) {
            // Dawn has increased fog due to morning dew and temperature changes
            baseFogDensity *= 1.8;
        } else if (dayFactor > 0.5) {
            // Daytime has reduced fog due to heating
            baseFogDensity *= 0.6;
        } else if (duskFactor > 0.5) {
            // Dusk has increased fog due to cooling air meeting warmer ground
            baseFogDensity *= 1.6;
        } else if (nightFactor > 0.5) {
            // Night has moderate fog
            baseFogDensity *= 1.2;
        }
        
        // Additional subtle factors affecting fog density
        
        // Time-based modulation for sunrise/sunset peaks
        const { sunrise, sunset } = keyTimes;
        
        // Enhanced fog near sunrise and sunset (atmospheric scattering)
        const sunriseEffect = Math.max(0, 1 - Math.abs(worldTime - sunrise) / 1.0) * 0.003;
        const sunsetEffect = Math.max(0, 1 - Math.abs(worldTime - sunset) / 1.0) * 0.003;
        
        // Combine all density factors
        this.targetFogDensity = baseFogDensity + sunriseEffect + sunsetEffect;
        
        // Add subtle atmospheric movement for realism
        const fogPulse = 0.0005 * Math.sin(elapsed * 0.3);
        const fogDrift = 0.0003 * Math.cos(elapsed * 0.7);
        this.targetFogDensity += fogPulse + fogDrift;
        
        // Apply altitude adjustment for camera height
        const camera = scene.activeCamera;
        const camY = camera?.position.y ?? 0;
        const altitudeFactor = Math.exp(-camY / 150.0);
        this.targetFogDensity *= altitudeFactor;
        
        // Ensure reasonable limits for fog density
        this.targetFogDensity = Math.max(0.0002, Math.min(0.01, this.targetFogDensity));
        
        // Smooth fog color transition
        this.currentFogColor = Color3.Lerp(
            this.currentFogColor,
            this.targetFogColor,
            this.fogTransitionSpeed
        );
        
        // Smooth fog density transition
        this.currentFogDensity = this.lerp(
            this.currentFogDensity,
            this.targetFogDensity,
            this.fogTransitionSpeed
        );
        
        // Apply to scene
        scene.fogColor = this.currentFogColor;
        scene.fogDensity = this.currentFogDensity;
        
        // Note: ambientColor is now fully managed by the LightService
    }
    
    // Linear interpolation helper
    private lerp(a: number, b: number, t: number): number {
        return a + t * (b - a);
    }
    
    // Enhanced smoothstep function
    private smootherstep(edge0: number, edge1: number, x: number): number {
        // Handle edge case where edge0 > edge1 (for wrapping around midnight)
        if (edge0 > edge1 && x < edge0 && x < edge1) {
            x += 24; // Wrap around for time calculations
        }
        
        // Clamp x to 0..1 range
        x = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        
        // Evaluate 6x^5 - 15x^4 + 10x^3 (better for gradual transitions)
        return x * x * x * (x * (x * 6 - 15) + 10);
    }
}