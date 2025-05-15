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
            sunHeight,
            sunVisibility,
            moonIntensity,
            keyTimes,
            worldTime
        } = celestialData;
        const { sunrise, sunset, dawnEnd, duskStart, noon, midnight } = keyTimes;

        // Get sky colors from the light service to ensure consistency
        const skyColors = this.lightService.getSkyColors();

        // PART 1: FOG COLOR - Unified approach to match ambient lighting
        // -------------------------------------------------------------

        // Base fog color is primarily from the horizon with some zenith influence
        // The mix varies based on time of day

        // Calculate night factor using a bell curve around midnight
        const midnightFactor = this.mathUtils.bellCurve(worldTime, midnight, 8);
        // const noon = 12;
        const noonFactor = this.mathUtils.bellCurve(worldTime, noon, 6);

        // Calculate sun-based periods using bell curves
        const sunriseFactor = this.mathUtils.bellCurve(worldTime, sunrise + 0.3, 1.0);
        const sunsetFactor = this.mathUtils.bellCurve(worldTime, sunset - 0.3, 1.0);

        // Start with base horizon/zenith blend based on time of day
        const zenithInfluence = 0.12 + midnightFactor * 0.13; // 12% at day, up to 25% at night

        this.targetFogColor = Color3.Lerp(
            skyColors.horizon,
            skyColors.zenith,
            zenithInfluence
        );

        // Apply time-specific tinting with smooth transitions
        // Define our key colors for different periods
        const daytimeTint = new Color3(0.85, 0.85, 0.9);      // Slight blue tint during day
        const sunriseTint = new Color3(0.85, 0.65, 0.45);     // Golden sunrise
        const sunsetTint = new Color3(0.8, 0.5, 0.35);        // Amber sunset
        const nightTint = new Color3(0.02, 0.03, 0.08);       // Deep blue-purple night

        // Apply tinting based on time of day with bell curve blending
        if (noonFactor > 0) {
            // Midday - slightly enhance blue for atmospheric scattering
            this.targetFogColor = Color3.Lerp(
                this.targetFogColor,
                daytimeTint,
                noonFactor * 0.2
            );
        }

        if (sunriseFactor > 0) {
            // Sunrise golden hour
            this.targetFogColor = Color3.Lerp(
                this.targetFogColor,
                sunriseTint,
                sunriseFactor * 0.4
            );
        }

        if (sunsetFactor > 0) {
            // Sunset golden hour
            this.targetFogColor = Color3.Lerp(
                this.targetFogColor,
                sunsetTint,
                sunsetFactor * 0.4
            );
        }

        if (midnightFactor > 0) {
            // Nighttime blue shift
            this.targetFogColor = Color3.Lerp(
                this.targetFogColor,
                nightTint,
                midnightFactor * 0.3
            );
        }

        // PART 2: FOG DENSITY - Continuous function with time-based modulation
        // -------------------------------------------------------------------

        // Calculate base fog density using a continuous function
        // Baseline is a sinusoidal function with two peaks at sunrise and sunset,
        // plus a lower valley at noon and lowest point at midnight

        // Create normalized time (0-1)
        const normalizedTime = (worldTime / 24) % 1;

        // Scientific fog density variations:
        // 1. Higher at sunrise/sunset due to temperature differentials - peaks
        // 2. Lower during mid-day due to heating and mixing - medium valley
        // 3. Lowest at deep night due to temperature stability - lowest valley

        // Base density curve: starts at lowest (midnight), rises to peak (sunrise), 
        // dips to medium (noon), rises to peak (sunset), then falls back to lowest

        // First, create a basic day curve with a peak at noon
        let dayCurve = 0.5 - 0.5 * Math.cos(normalizedTime * Math.PI * 2);

        // Then create sunrise/sunset peaks (normalized between sunrise and sunset)
        const sunrisePeak = this.mathUtils.bellCurve(worldTime, sunrise, 1.0);
        const sunsetPeak = this.mathUtils.bellCurve(worldTime, sunset, 1.0);

        // Combine these to form our base density
        let baseFogDensity = 0.0012; // Base minimum density

        // Add day/night variation - slightly more during day than deep night
        baseFogDensity += dayCurve * 0.0003;

        // Add sunrise/sunset peaks
        baseFogDensity += sunrisePeak * 0.0035;
        baseFogDensity += sunsetPeak * 0.0035;

        // Additional modulation based on altitude
        const camera = scene.activeCamera;
        const camY = camera?.position.y ?? 0;

        // Scientific altitude fog falloff (exponential decrease with height)
        const altitudeFactor = Math.exp(-camY / 175.0);
        baseFogDensity *= altitudeFactor;

        // Add subtle time-based variations for atmospheric movement
        const fogPulse = 0.00015 * Math.sin(elapsed * 0.3);
        const fogDrift = 0.0001 * Math.cos(elapsed * 0.7);

        this.targetFogDensity = baseFogDensity + fogPulse + fogDrift;

        // Ensure reasonable limits for fog density
        this.targetFogDensity = Math.max(0.0002, Math.min(0.008, this.targetFogDensity));

        // PART 3: SMOOTH TRANSITIONS
        // --------------------------

        // Smooth fog color transition
        this.currentFogColor = Color3.Lerp(
            this.currentFogColor,
            this.targetFogColor,
            this.fogTransitionSpeed
        );

        // Smooth fog density transition
        this.currentFogDensity = this.mathUtils.lerp(
            this.currentFogDensity,
            this.targetFogDensity,
            this.fogTransitionSpeed
        );

        // Apply to scene
        scene.fogColor = this.currentFogColor;
        scene.fogDensity = this.currentFogDensity;
    }
}