// src/app/engine/world/light.service.ts
import { Injectable } from '@angular/core';
import { Scene } from '@babylonjs/core/scene';
import { DirectionalLight, HemisphericLight, Vector3, Color3, ShadowGenerator } from '@babylonjs/core';
import { TimeService } from '../physics/time.service';
import { CelestialService } from './celestial.service';

@Injectable({
  providedIn: 'root'
})
export class LightService {
    private sunLight!: DirectionalLight;
    private moonLight!: DirectionalLight;
    private skyGlowLight!: HemisphericLight;  // Ambient sky glow
    private shadowGenerator!: ShadowGenerator;

    // Sky color cache for smooth transitions
    private currentZenithColor: Color3 = new Color3(0, 0, 0);
    private currentHorizonColor: Color3 = new Color3(0, 0, 0);
    private targetZenithColor: Color3 = new Color3(0, 0, 0);
    private targetHorizonColor: Color3 = new Color3(0, 0, 0);
    private colorTransitionSpeed: number = 0.05;

    constructor(
        private timeService: TimeService,
        private celestialService: CelestialService
    ) {}

    createLights(scene: Scene): void {
        // Sun light - warm daylight
        this.sunLight = new DirectionalLight("SunLight", new Vector3(0, -1, 0), scene);
        this.sunLight.intensity = 0; // Start disabled
        this.sunLight.diffuse = new Color3(1.0, 0.95, 0.8);
        this.sunLight.specular = new Color3(1.0, 0.98, 0.8);
        this.sunLight.shadowEnabled = true;
        
        // Shadow configuration
        this.shadowGenerator = new ShadowGenerator(1024, this.sunLight);
        this.shadowGenerator.useBlurExponentialShadowMap = true;
        this.shadowGenerator.blurScale = 2;
        this.shadowGenerator.setDarkness(0.3);

        // Moon light - cool blue moonlight
        this.moonLight = new DirectionalLight("MoonLight", new Vector3(0, -1, 0), scene);
        this.moonLight.intensity = 0; // Start disabled
        this.moonLight.diffuse = new Color3(0.5, 0.5, 0.8);
        this.moonLight.specular = new Color3(0.2, 0.2, 0.4);
        
        // Sky glow light - hemispheric light for ambient sky illumination
        this.skyGlowLight = new HemisphericLight("SkyGlowLight", new Vector3(0, 1, 0), scene);
        this.skyGlowLight.intensity = 0.2; // Will be updated dynamically
        this.skyGlowLight.diffuse = new Color3(0.3, 0.3, 0.4); // Will be derived from sky colors
        this.skyGlowLight.groundColor = new Color3(0.1, 0.1, 0.15); // Darker for ground reflection
        this.skyGlowLight.specular = new Color3(0, 0, 0); // No specular from ambient sky glow
        
        // Initial update to set light properties
        this.update();
    }

    update(): void {
        // Get all celestial data from the celestial service
        const celestialData = this.celestialService.getCelestialPositions();
        const {
            sunDir,
            moonDir,
            sunHeight,
            moonHeight,
            sunVisibility,
            moonOpacity,
            sunIntensity,
            moonIntensity,
            sunColor,
            moonColor,
            keyTimes,
            worldTime
        } = celestialData;
        
        // Update light directions
        this.sunLight.direction = sunDir.scale(-1); // Lights point toward objects
        this.moonLight.direction = moonDir.scale(-1);
        
        // Sun light - only active when sun is visible
        if (sunVisibility > 0 && sunHeight > -0.05) {
            // Update sun properties
            this.sunLight.intensity = sunIntensity;
            this.sunLight.diffuse = sunColor;
            this.sunLight.setEnabled(true);
        } else {
            // Disable sun completely when not visible
            this.sunLight.setEnabled(false);
            this.sunLight.intensity = 0;
        }
        
        // Moon light - only active when moon is visible with some opacity
        if (moonOpacity > 0 && moonHeight > -0.05) {
            // Update moon properties
            this.moonLight.intensity = moonIntensity;
            this.moonLight.diffuse = moonColor;
            this.moonLight.setEnabled(true);
        } else {
            // Disable moon completely when not visible
            this.moonLight.setEnabled(false);
            this.moonLight.intensity = 0;
        }
        
        // Calculate sky colors for this time point
        this.calculateSkyColors(worldTime, keyTimes);
        
        // Update current colors with smooth transition to targets
        this.updateColorTransitions();
        
        // Calculate ambient lighting from sky colors
        this.updateAmbientLightFromSky(celestialData);
    }
    
    /**
     * Calculate the target zenith and horizon colors based on time of day
     */
    private calculateSkyColors(worldTime: number, keyTimes: any): void {
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
        
        // Scientifically accurate sky colors for each time period
        // These should match the colors used in the sky shader
        
        // Night colors - deep blue to dark blue
        const nightZenith = new Color3(0.015, 0.015, 0.04);    // Almost black with hint of blue
        const nightHorizon = new Color3(0.04, 0.04, 0.08);     // Deep blue
        
        // Sunrise/dawn colors
        const sunriseZenith = new Color3(0.12, 0.15, 0.32);    // Deepening blue with purple hints
        const sunriseHorizon = new Color3(0.92, 0.58, 0.32);   // Golden orange
        
        // Day colors - based on clear sky spectra
        const dayZenith = new Color3(0.18, 0.26, 0.48);        // Rich blue
        const dayHorizon = new Color3(0.7, 0.8, 0.95);         // Pale blue-white
        
        // Sunset/dusk colors
        const sunsetZenith = new Color3(0.15, 0.12, 0.25);     // Purple-blue
        const sunsetHorizon = new Color3(0.9, 0.35, 0.15);     // Deep orange-red
        
        // Determine target colors based on time of day
        if (worldTime >= midnight && worldTime < dawnStart) {
            // Night - steady
            this.targetZenithColor = nightZenith.clone();
            this.targetHorizonColor = nightHorizon.clone();
        }
        else if (worldTime >= dawnStart && worldTime < sunrise) {
            // Dawn start to sunrise: night → sunrise
            const t = this.smootherstep(dawnStart, sunrise, worldTime);
            this.targetZenithColor = Color3.Lerp(nightZenith, sunriseZenith, t);
            this.targetHorizonColor = Color3.Lerp(nightHorizon, sunriseHorizon, t);
        }
        else if (worldTime >= sunrise && worldTime < dawnEnd) {
            // Sunrise to dawn end: sunrise → day
            const t = this.smootherstep(sunrise, dawnEnd, worldTime);
            this.targetZenithColor = Color3.Lerp(sunriseZenith, dayZenith, t);
            this.targetHorizonColor = Color3.Lerp(sunriseHorizon, dayHorizon, t);
        }
        else if (worldTime >= dawnEnd && worldTime < duskStart) {
            // Full day - steady
            this.targetZenithColor = dayZenith.clone();
            this.targetHorizonColor = dayHorizon.clone();
        }
        else if (worldTime >= duskStart && worldTime < sunset) {
            // Dusk start to sunset: day → sunset
            const t = this.smootherstep(duskStart, sunset, worldTime);
            this.targetZenithColor = Color3.Lerp(dayZenith, sunsetZenith, t);
            this.targetHorizonColor = Color3.Lerp(dayHorizon, sunsetHorizon, t);
        }
        else if (worldTime >= sunset && worldTime < duskEnd) {
            // Sunset to dusk end: sunset → night
            const t = this.smootherstep(sunset, duskEnd, worldTime);
            this.targetZenithColor = Color3.Lerp(sunsetZenith, nightZenith, t);
            this.targetHorizonColor = Color3.Lerp(sunsetHorizon, nightHorizon, t);
        }
        else {
            // Dusk end to midnight - steady night
            this.targetZenithColor = nightZenith.clone();
            this.targetHorizonColor = nightHorizon.clone();
        }
    }
    
    /**
     * Update current colors with smooth transition to targets
     */
    private updateColorTransitions(): void {
        // Smoothly transition zenith color
        this.currentZenithColor = Color3.Lerp(
            this.currentZenithColor,
            this.targetZenithColor,
            this.colorTransitionSpeed
        );
        
        // Smoothly transition horizon color
        this.currentHorizonColor = Color3.Lerp(
            this.currentHorizonColor,
            this.targetHorizonColor,
            this.colorTransitionSpeed
        );
    }
    
    /**
     * Update ambient light using sky colors and celestial data
     * Modified to ensure more scientifically accurate time-of-day lighting with warm periods
     * during sunrise to dawn end and dusk start to sunset
     */
    private updateAmbientLightFromSky(celestialData: any): void {
        // Extract necessary data for ambient calculation
        const { 
            sunHeight, 
            sunVisibility, 
            moonIntensity, 
            worldTime, 
            keyTimes 
        } = celestialData;
        const { sunrise, sunset, dawnEnd, duskStart } = keyTimes;
        
        // Determine the time period more precisely
        const isMorningWarmPeriod = worldTime >= sunrise && worldTime <= dawnEnd;
        const isEveningWarmPeriod = worldTime >= duskStart && worldTime <= sunset;
        const isNighttime = worldTime > sunset || worldTime < sunrise;
        const isMidday = worldTime > dawnEnd && worldTime < duskStart;
        
        // Base ambient color using sky colors
        let ambientColor = Color3.Lerp(
            this.currentZenithColor, 
            this.currentHorizonColor, 
            isNighttime ? 0.5 : 0.65  // More zenith influence at night
        );
        
        // Now apply specific coloring for each time period
        if (isMorningWarmPeriod) {
            // Warm sunrise golden glow (sunrise to dawn end)
            const warmSunriseColor = new Color3(0.75, 0.6, 0.43); // Warm golden color
            
            // Smoothly ramp up the warmth as we get closer to dawn end
            const warmthFactor = this.smootherstep(sunrise, sunrise + 0.5, worldTime);
            ambientColor = Color3.Lerp(
                ambientColor,
                warmSunriseColor,
                warmthFactor * 0.6  // 60% influence of the warm color
            );
        } 
        else if (isEveningWarmPeriod) {
            // Warm sunset amber glow (dusk start to sunset)
            const warmSunsetColor = new Color3(0.7, 0.45, 0.3); // Warm amber/orange color
            
            // Smoothly ramp up the warmth as we get closer to sunset
            const warmthFactor = this.smootherstep(duskStart, sunset - 0.5, worldTime);
            ambientColor = Color3.Lerp(
                ambientColor,
                warmSunsetColor, 
                warmthFactor * 0.6  // 60% influence of the warm color
            );
        }
        else if (isMidday) {
            // Midday - whiter, more neutral light
            const noonFactor = 1.0 - Math.abs((worldTime - 12.0) / 6.0); // 1 at noon, 0 at edges
            ambientColor = Color3.Lerp(
                ambientColor,
                new Color3(0.9, 0.9, 0.95), // Slightly off-white for realism
                noonFactor * 0.45 // Stronger white influence at noon
            );
        }
        else if (isNighttime) {
            // Nighttime - cooler ambient with blue tones
            // Add cool nighttime tint - scientific studies show night ambient has blue shift
            const coolNightTint = new Color3(0.1, 0.15, 0.35); // Blue-dominant color
            ambientColor = Color3.Lerp(
                ambientColor,
                coolNightTint,
                0.5 // 50% cooling influence
            );
        }
        
        // Calculate ambient intensity based on time period
        let ambientIntensity;
        
        if (isNighttime) {
            // Nighttime intensity based partly on moon and reduced overall
            ambientIntensity = 0.03 + moonIntensity * 0.08; // 0.03-0.11 range at night (slightly reduced)
        } 
        else if (isMorningWarmPeriod || isEveningWarmPeriod) {
            // Golden/Magic hour slightly boosted intensity
            ambientIntensity = 0.12; // Fixed moderate intensity during golden hours
        }
        else {
            // Midday intensity peaks at noon, reduced overall
            const noonFactor = 1.0 - Math.abs((worldTime - 12.0) / 6.0);
            ambientIntensity = 0.08 + noonFactor * 0.15; // 0.08 at edges, 0.23 at noon (reduced)
        }
        
        // Extra smooth transitions at critical boundary points to prevent stutters
        // Specifically, handle sunrise transition with extra care
        if (Math.abs(worldTime - sunrise) < 0.1) {
            // Very close to sunrise - create ultra smooth transition
            const microTransition = (worldTime - (sunrise - 0.1)) / 0.2; // 0 to 1 over 0.2 hour window
            const smoothFactor = microTransition * microTransition * (3.0 - 2.0 * microTransition); // Smoothstep
            
            // Blend between night and sunrise colors
            const nightColor = Color3.Lerp(
                this.currentZenithColor,
                this.currentHorizonColor,
                0.5
            );
            const nightTint = new Color3(0.1, 0.15, 0.35);
            const coolNightAmbient = Color3.Lerp(nightColor, nightTint, 0.5);
            
            const warmSunriseColor = new Color3(0.75, 0.6, 0.43);
            const warmMorningAmbient = Color3.Lerp(ambientColor, warmSunriseColor, 0.3);
            
            // Ultra smooth blend at this critical point
            ambientColor = Color3.Lerp(
                coolNightAmbient,
                warmMorningAmbient,
                smoothFactor
            );
            
            // Also smooth intensity
            const nightIntensity = 0.03 + moonIntensity * 0.08;
            ambientIntensity = this.lerp(nightIntensity, 0.12, smoothFactor);
        }
        
        // Same careful handling at sunset
        if (Math.abs(worldTime - sunset) < 0.1) {
            // Very close to sunset - create ultra smooth transition
            const microTransition = (sunset + 0.1 - worldTime) / 0.2; // 0 to 1 over 0.2 hour window
            const smoothFactor = microTransition * microTransition * (3.0 - 2.0 * microTransition); // Smoothstep
            
            // Blend between evening and night colors
            const warmSunsetColor = new Color3(0.7, 0.45, 0.3);
            const warmEveningAmbient = Color3.Lerp(ambientColor, warmSunsetColor, 0.4);
            
            const nightColor = Color3.Lerp(
                this.currentZenithColor,
                this.currentHorizonColor,
                0.5
            );
            const nightTint = new Color3(0.1, 0.15, 0.35);
            const coolNightAmbient = Color3.Lerp(nightColor, nightTint, 0.5);
            
            // Ultra smooth blend at this critical point
            ambientColor = Color3.Lerp(
                coolNightAmbient,
                warmEveningAmbient,
                smoothFactor
            );
            
            // Also smooth intensity
            const nightIntensity = 0.03 + moonIntensity * 0.08;
            ambientIntensity = this.lerp(nightIntensity, 0.12, smoothFactor);
        }
        
        // Apply to the hemispheric light
        this.skyGlowLight.diffuse = ambientColor;
        
        // Slightly darkened ground color with subtle color shift for scientific accuracy
        // (ground surfaces reflect sky color but with reduced intensity)
        const groundTint = new Color3(
            Math.max(0, ambientColor.r * 0.3 - 0.03),
            Math.max(0, ambientColor.g * 0.3),
            Math.max(0, ambientColor.b * 0.3 + 0.04)
        );
        
        this.skyGlowLight.groundColor = groundTint;
        this.skyGlowLight.intensity = ambientIntensity;
    }
    
    // Linear interpolation helper
    private lerp(a: number, b: number, t: number): number {
        return a + t * (b - a);
    }
    
    // Enhanced smoothstep for smoother transitions
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
    
    // Register objects to cast shadows
    addShadowCaster(mesh: any): void {
        if (this.shadowGenerator) {
            this.shadowGenerator.addShadowCaster(mesh);
        }
    }
    
    // Provide sky colors for other services to use
    getSkyColors(): { zenith: Color3, horizon: Color3 } {
        return {
            zenith: this.currentZenithColor.clone(),
            horizon: this.currentHorizonColor.clone()
        };
    }
}