// src/app/engine/world/atmosphere.service.ts
import { Injectable } from '@angular/core';
import { Scene, Color3 } from '@babylonjs/core';
import { TimeService } from '../physics/time.service';
import { CelestialService } from './celestial.service';
import { LightService } from './light.service';
import { MathUtils } from '../utils/math-utils.service';

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
    
    // Pre-allocated Color3 objects for day period tints
    private _tempDaytimeTint: Color3 = new Color3(0.85, 0.85, 0.9);
    private _tempSunriseTint: Color3 = new Color3(0.85, 0.65, 0.45);
    private _tempSunsetTint: Color3 = new Color3(0.8, 0.5, 0.35);
    private _tempNightTint: Color3 = new Color3(0.02, 0.03, 0.08);
    
    // Temporary workspace Color3 for calculations
    private _tempColor: Color3 = new Color3(0, 0, 0);

    constructor(
        private timeService: TimeService,
        private celestialService: CelestialService,
        private lightService: LightService,
        private mathUtils: MathUtils
    ) { }

    setup(scene: Scene): void {
        scene.fogMode = Scene.FOGMODE_EXP2;
        scene.fogDensity = 0.001;
        scene.fogColor = new Color3(0.04, 0.04, 0.08); // Initial midnight color
        scene.ambientColor = new Color3(0.05, 0.05, 0.15); // Initial midnight ambient
        this.update(scene); // Apply atmosphere for current time immediately
    }

    update(scene: Scene): void {
        const elapsed = this.timeService.getElapsed();

        // Get celestial data for time-based calculations
        const celestialData = this.celestialService.getCelestialPositions();
        const {
            dayFactor, nightFactor, sunHeight, sunVisibility,
            moonIntensity, keyTimes, worldTime
        } = celestialData;
        const { sunrise, sunset, dawnEnd, duskStart, noon, midnight } = keyTimes;

        // Get sky colors from the light service to ensure consistency
        const skyColors = this.lightService.getSkyColors();

        // PART 1: FOG COLOR - Unified approach to match ambient lighting
        // Base fog color is primarily from the horizon with some zenith influence
        const midnightFactor = this.mathUtils.bellCurve(worldTime, midnight, 8);
        const noonFactor = this.mathUtils.bellCurve(worldTime, noon, 6);
        const sunriseFactor = this.mathUtils.bellCurve(worldTime, sunrise + 0.3, 1.0);
        const sunsetFactor = this.mathUtils.bellCurve(worldTime, sunset - 0.3, 1.0);

        // Start with base horizon/zenith blend based on time of day
        const zenithInfluence = 0.12 + midnightFactor * 0.13; // 12% at day, up to 25% at night
        
        // Using LerpToRef instead of Lerp to avoid creating a new Color3
        Color3.LerpToRef(
            skyColors.horizon,
            skyColors.zenith,
            zenithInfluence,
            this.targetFogColor
        );

        // Apply tinting based on time of day with bell curve blending
        if (noonFactor > 0) {
            // Midday - slightly enhance blue for atmospheric scattering
            Color3.LerpToRef(this.targetFogColor, this._tempDaytimeTint, noonFactor * 0.2, this.targetFogColor);
        }
        if (sunriseFactor > 0) {
            // Sunrise golden hour
            Color3.LerpToRef(this.targetFogColor, this._tempSunriseTint, sunriseFactor * 0.4, this.targetFogColor);
        }
        if (sunsetFactor > 0) {
            // Sunset golden hour
            Color3.LerpToRef(this.targetFogColor, this._tempSunsetTint, sunsetFactor * 0.4, this.targetFogColor);
        }
        if (midnightFactor > 0) {
            // Nighttime blue shift
            Color3.LerpToRef(this.targetFogColor, this._tempNightTint, midnightFactor * 0.3, this.targetFogColor);
        }

        // PART 2: FOG DENSITY - Continuous function with time-based modulation
        const normalizedTime = (worldTime / 24) % 1; // Normalized time (0-1)
        
        // Base density curve with scientific fog density variations
        let dayCurve = 0.5 - 0.5 * Math.cos(normalizedTime * Math.PI * 2);
        
        // Create sunrise/sunset peaks
        const sunrisePeak = this.mathUtils.bellCurve(worldTime, sunrise, 1.0);
        const sunsetPeak = this.mathUtils.bellCurve(worldTime, sunset, 1.0);
        
        // Combine to form our base density
        let baseFogDensity = 0.0012; // Base minimum density
        baseFogDensity += dayCurve * 0.0003; // Add day/night variation
        baseFogDensity += sunrisePeak * 0.0035; // Add sunrise peak
        baseFogDensity += sunsetPeak * 0.0035; // Add sunset peak
        
        // Altitude-based modulation
        const camera = scene.activeCamera;
        const camY = camera?.position.y ?? 0;
        const altitudeFactor = Math.exp(-camY / 175.0); // Exponential decrease with height
        baseFogDensity *= altitudeFactor;
        
        // Add subtle time-based variations for atmospheric movement
        const fogPulse = 0.00015 * Math.sin(elapsed * 0.3);
        const fogDrift = 0.0001 * Math.cos(elapsed * 0.7);
        this.targetFogDensity = baseFogDensity + fogPulse + fogDrift;
        
        // Ensure reasonable limits for fog density
        this.targetFogDensity = Math.max(0.0002, Math.min(0.008, this.targetFogDensity));

        // PART 3: SMOOTH TRANSITIONS
        // Using LerpToRef for smooth color transition
        Color3.LerpToRef(
            this.currentFogColor,
            this.targetFogColor,
            this.fogTransitionSpeed,
            this.currentFogColor
        );

        this.currentFogDensity = this.mathUtils.lerp(
            this.currentFogDensity,
            this.targetFogDensity,
            this.fogTransitionSpeed
        );

        // Apply to scene
        scene.fogColor.copyFrom(this.currentFogColor);
        scene.fogDensity = this.currentFogDensity;
    }
}