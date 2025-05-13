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
        const { sunrise, sunset, dawnEnd, duskStart } = keyTimes;
        
        // Determine the time period more precisely
        const isMorningWarmPeriod = worldTime >= sunrise && worldTime <= dawnEnd;
        const isEveningWarmPeriod = worldTime >= duskStart && worldTime <= sunset;
        const isNighttime = worldTime > sunset || worldTime < sunrise;
        const isMidday = worldTime > dawnEnd && worldTime < duskStart;
        
        // Get sky colors from the light service to ensure consistency
        const skyColors = this.lightService.getSkyColors();
        
        // Calculate target fog color based on time period with smooth transitions
        if (isMidday) {
            // Midday fog - bright with more horizon influence
            this.targetFogColor = Color3.Lerp(
                skyColors.horizon, 
                skyColors.zenith, 
                0.12  // 12% zenith influence for daytime (slightly reduced)
            );
            
            // Make fog slightly bluer at high noon for scientifically accurate scattering
            const noonFactor = 1.0 - Math.abs((worldTime - 12.0) / 6.0); // 1 at noon, 0 at edges
            if (noonFactor > 0.7) {
                // Only at true midday, slightly enhance blue component
                const blueBoost = noonFactor - 0.7; // 0-0.3 range
                this.targetFogColor.b = Math.min(1.0, this.targetFogColor.b * (1.0 + blueBoost * 0.2));
            }
        } 
        else if (isMorningWarmPeriod) {
            // Morning golden fog - warm sunrise influence
            this.targetFogColor = Color3.Lerp(
                skyColors.horizon, 
                skyColors.zenith, 
                0.12  // 12% zenith influence
            );
            
            // Add subtle golden tint during sunrise period
            const warmSunriseTint = new Color3(0.85, 0.65, 0.45); // Golden tint
            const warmthFactor = this.smootherstep(sunrise, sunrise + 0.5, worldTime) * 0.4;
            this.targetFogColor = Color3.Lerp(
                this.targetFogColor,
                warmSunriseTint,
                warmthFactor
            );
        }
        else if (isEveningWarmPeriod) {
            // Evening amber fog - warm sunset influence
            this.targetFogColor = Color3.Lerp(
                skyColors.horizon, 
                skyColors.zenith, 
                0.12  // 12% zenith influence
            );
            
            // Add subtle amber tint during sunset period
            const warmSunsetTint = new Color3(0.8, 0.5, 0.35); // Amber tint
            const warmthFactor = this.smootherstep(duskStart, sunset - 0.3, worldTime) * 0.4;
            this.targetFogColor = Color3.Lerp(
                this.targetFogColor,
                warmSunsetTint,
                warmthFactor
            );
        }
        else if (isNighttime) {
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
        
        // Fix stutter at sunrise/sunset with ultra-smooth transitions
        if (Math.abs(worldTime - sunrise) < 0.1) {
            // Very close to sunrise - smooth transition
            const microTransition = (worldTime - (sunrise - 0.1)) / 0.2; // 0 to 1 over 0.2 hour window
            const smoothFactor = microTransition * microTransition * (3.0 - 2.0 * microTransition); // Smoothstep
            
            // Blend nighttime and morning fog colors
            const nightFogColor = Color3.Lerp(
                skyColors.horizon, 
                skyColors.zenith, 
                0.25
            );
            const coolNightTint = new Color3(0.02, 0.03, 0.08);
            const nightFog = Color3.Lerp(nightFogColor, coolNightTint, 0.3);
            
            const morningFogColor = Color3.Lerp(
                skyColors.horizon, 
                skyColors.zenith, 
                0.12
            );
            const warmSunriseTint = new Color3(0.85, 0.65, 0.45);
            const morningFog = Color3.Lerp(morningFogColor, warmSunriseTint, 0.1);
            
            // Ultra smooth blend
            this.targetFogColor = Color3.Lerp(nightFog, morningFog, smoothFactor);
        }
        
        if (Math.abs(worldTime - sunset) < 0.1) {
            // Very close to sunset - smooth transition
            const microTransition = (sunset + 0.1 - worldTime) / 0.2; // 0 to 1 over 0.2 hour window
            const smoothFactor = microTransition * microTransition * (3.0 - 2.0 * microTransition); // Smoothstep
            
            // Blend evening and nighttime fog colors
            const eveningFogColor = Color3.Lerp(
                skyColors.horizon, 
                skyColors.zenith, 
                0.12
            );
            const warmSunsetTint = new Color3(0.8, 0.5, 0.35);
            const eveningFog = Color3.Lerp(eveningFogColor, warmSunsetTint, 0.1);
            
            const nightFogColor = Color3.Lerp(
                skyColors.horizon, 
                skyColors.zenith, 
                0.25
            );
            const coolNightTint = new Color3(0.02, 0.03, 0.08);
            const nightFog = Color3.Lerp(nightFogColor, coolNightTint, 0.3);
            
            // Ultra smooth blend
            this.targetFogColor = Color3.Lerp(nightFog, eveningFog, smoothFactor);
        }
        
        // Scientific fog density variations:
        // - Higher in dawn/dusk due to temperature differentials and humidity
        // - Lower during mid-day due to heating and atmospheric mixing
        // - Moderate at night due to cooling and condensation
        
        let baseFogDensity = 0.0015; // Reduced base fog density
        
        // Apply time-of-day multipliers with more scientific accuracy
        if (isMidday) {
            // Daytime has reduced fog due to heating and mixing
            const noonFactor = 1.0 - Math.abs((worldTime - 12.0) / 6.0); // 1 at noon, 0 at sunrise/sunset
            baseFogDensity *= 0.4 + (0.2 * (1.0 - noonFactor)); // Least fog at noon, more at sunrise/sunset
        } 
        else if (isMorningWarmPeriod || isEveningWarmPeriod) {
            // Golden hour fog - slightly elevated for aesthetic effect
            baseFogDensity *= 1.1;
        }
        else if (isNighttime) {
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
        
        // Special handling for dawn/dusk peaks
        if (dawnFactor > 0) {
            // Dawn fog - peaks just before sunrise (scientifically accurate)
            const sunriseProximity = Math.max(0, 1 - Math.abs(worldTime - sunrise) / 1.0);
            baseFogDensity *= 1.0 + (sunriseProximity * sunriseProximity * 0.8); // Slightly reduced peak
        } else if (duskFactor > 0) {
            // Dusk fog - peaks just after sunset (scientifically accurate)
            const sunsetProximity = Math.max(0, 1 - Math.abs(worldTime - sunset) / 1.0);
            baseFogDensity *= 1.0 + (sunsetProximity * sunsetProximity * 0.7); // Slightly reduced peak
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