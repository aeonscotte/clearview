// src/app/engine/world/atmosphere.service.ts
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
        const { 
            dayFactor, 
            nightFactor, 
            dawnFactor, 
            duskFactor, 
            keyTimes,
            sunHeight,
            sunVisibility
        } = celestialData;
        const worldTime = this.timeService.getWorldTime();
        const { sunrise, sunset } = keyTimes;
        
        // Strict daytime check based on sun position
        const isDaytime = sunHeight > 0 && worldTime >= sunrise && worldTime <= sunset;
        
        // Get sky colors from the light service to ensure consistency
        const skyColors = this.lightService.getSkyColors();
        
        // Calculate target fog color - primarily influenced by horizon with small zenith influence
        if (isDaytime) {
            // Daytime fog - more horizon influence
            this.targetFogColor = Color3.Lerp(
                skyColors.horizon, 
                skyColors.zenith, 
                0.12  // 12% zenith influence for daytime (slightly reduced)
            );
        } else {
            // Nighttime fog - deeper blue color with more zenith influence
            this.targetFogColor = Color3.Lerp(
                skyColors.horizon, 
                skyColors.zenith, 
                0.25  // 25% zenith influence for nighttime (increased for deeper blues)
            );
            
            // Add subtle blue shift to night fog (scientifically accurate)
            const coolNightTint = new Color3(0.02, 0.03, 0.08); // Very subtle blue tint
            this.targetFogColor = Color3.Lerp(
                this.targetFogColor,
                coolNightTint,
                0.3 // 30% influence
            );
        }
        
        // Scientific fog density variations:
        // - Higher in dawn/dusk due to temperature differentials and humidity
        // - Lower during mid-day due to heating and atmospheric mixing
        // - Moderate at night due to cooling and condensation
        
        let baseFogDensity = 0.0015; // Reduced base fog density
        
        // Apply time-of-day multipliers with more scientific accuracy
        if (isDaytime) {
            // Daytime has reduced fog due to heating and mixing
            const noonFactor = 1.0 - Math.abs((worldTime - 12.0) / 6.0); // 1 at noon, 0 at sunrise/sunset
            baseFogDensity *= 0.4 + (0.2 * (1.0 - noonFactor)); // Least fog at noon, more at sunrise/sunset
        } else {
            // Nighttime has moderate fog due to cooling
            baseFogDensity *= 1.1;
            
            // Early night and pre-dawn have increased fog (temperature inversions)
            if (worldTime > sunset && worldTime < sunset + 3) {
                // Early evening fog peak - temperature dropping rapidly
                const earlyNightFactor = 1.0 - ((worldTime - sunset) / 3.0);
                baseFogDensity *= 1.0 + (earlyNightFactor * 0.7);
            } else if (worldTime > 0 && worldTime < sunrise - 1) {
                // Pre-dawn fog peak - coldest part of night
                const preDawnFactor = 1.0 - ((sunrise - 1 - worldTime) / 4.0);
                baseFogDensity *= 1.0 + (preDawnFactor * 0.9);
            }
        }
        
        // Special handling for dawn/dusk transitions
        if (dawnFactor > 0) {
            // Dawn fog - peaks just before sunrise (scientifically accurate)
            const sunriseProximity = Math.max(0, 1 - Math.abs(worldTime - sunrise) / 1.0);
            baseFogDensity *= 1.0 + (sunriseProximity * sunriseProximity * 0.9);
        } else if (duskFactor > 0) {
            // Dusk fog - peaks just after sunset (scientifically accurate)
            const sunsetProximity = Math.max(0, 1 - Math.abs(worldTime - sunset) / 1.0);
            baseFogDensity *= 1.0 + (sunsetProximity * sunsetProximity * 0.8);
        }
        
        // Additional subtle factors affecting fog density
        // Atmospheric movement and turbulence
        const fogPulse = 0.0004 * Math.sin(elapsed * 0.3);
        const fogDrift = 0.0002 * Math.cos(elapsed * 0.7);
        this.targetFogDensity = baseFogDensity + fogPulse + fogDrift;
        
        // Apply altitude adjustment for camera height
        const camera = scene.activeCamera;
        const camY = camera?.position.y ?? 0;
        
        // Scientific altitude fog falloff (exponential decrease with height)
        const altitudeFactor = Math.exp(-camY / 175.0); // Slightly increased scale height for less rapid falloff
        this.targetFogDensity *= altitudeFactor;
        
        // Ensure reasonable limits for fog density
        this.targetFogDensity = Math.max(0.0002, Math.min(0.008, this.targetFogDensity)); // Reduced upper limit
        
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