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
            keyTimes
        } = celestialData;
        
        const worldTime = this.timeService.getWorldTime();
        
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
        this.updateAmbientLightFromSky();
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
     * Update ambient light using sky colors
     */
    private updateAmbientLightFromSky(): void {
        // The ambient light color is derived from a blend of zenith and horizon colors
        // Scientifically, ambient light is a contribution from the entire sky dome
        
        // Calculate ambient color as a weighted mix of zenith and horizon
        // Horizon has more influence as it covers more of the visible sky dome
        const ambientColor = Color3.Lerp(
            this.currentZenithColor, 
            this.currentHorizonColor, 
            0.7  // 70% horizon influence, 30% zenith
        );
        
        // Calculate ambient intensity based on color brightness
        // Brighter skies provide more ambient illumination
        const colorBrightness = (ambientColor.r + ambientColor.g + ambientColor.b) / 3;
        
        // Base ambient intensity with some adjustments for dawn/dusk
        let ambientIntensity = 0.2 + colorBrightness * 0.4;
        
        // Slightly boost ambient during dawn/dusk to account for atmospheric scattering
        const isDawnOrDusk = 
            (this.targetHorizonColor.r > 0.5 && this.targetHorizonColor.g < 0.7) || 
            (this.targetHorizonColor.r > 0.6 && this.targetHorizonColor.b < 0.3);
            
        if (isDawnOrDusk) {
            ambientIntensity *= 1.4;  // 40% boost during dawn/dusk
        }
        
        // Apply to the hemispheric light
        this.skyGlowLight.diffuse = ambientColor;
        
        // Ground color is darker and tinted slightly toward the complementary color
        // This simulates how the ground reflects less light and often with color bias
        const groundTint = new Color3(
            Math.max(0, ambientColor.r * 0.35 - 0.05),
            Math.max(0, ambientColor.g * 0.35),
            Math.max(0, ambientColor.b * 0.35 + 0.05)
        );
        
        this.skyGlowLight.groundColor = groundTint;
        this.skyGlowLight.intensity = ambientIntensity;
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