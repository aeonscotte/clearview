// src/app/engine/world/light.service.ts
import { Injectable } from '@angular/core';
import { Scene } from '@babylonjs/core/scene';
import { DirectionalLight, HemisphericLight, Vector3, Color3, ShadowGenerator } from '@babylonjs/core';
import { TimeService } from '../physics/time.service';
import { CelestialService } from './celestial.service';
import { MathUtils } from '../utils/math-utils.service';

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
    
    // Pre-allocated color objects for calculateSkyColors
    private _nightZenith: Color3 = new Color3(0.015, 0.015, 0.04);
    private _nightHorizon: Color3 = new Color3(0.04, 0.04, 0.08);
    private _sunriseZenith: Color3 = new Color3(0.12, 0.15, 0.32);
    private _sunriseHorizon: Color3 = new Color3(0.92, 0.58, 0.32);
    private _dayZenith: Color3 = new Color3(0.18, 0.26, 0.48);  
    private _dayHorizon: Color3 = new Color3(0.7, 0.8, 0.95);   
    private _sunsetZenith: Color3 = new Color3(0.15, 0.12, 0.25);
    private _sunsetHorizon: Color3 = new Color3(0.9, 0.35, 0.15);
    
    // Pre-allocated key points array for sky color interpolation
    private _keyPoints: { time: number, zenith: Color3 | null, horizon: Color3 | null }[] = [
        { time: 0, zenith: null, horizon: null }, // Will be filled with references
        { time: 0, zenith: null, horizon: null },
        { time: 0, zenith: null, horizon: null },
        { time: 0, zenith: null, horizon: null },
        { time: 0, zenith: null, horizon: null },
        { time: 0, zenith: null, horizon: null },
        { time: 0, zenith: null, horizon: null },
        { time: 0, zenith: null, horizon: null }
    ];
    
    // Pre-allocated ambient light color objects
    private _dayColor: Color3 = new Color3(0.9, 0.9, 0.95);
    private _sunriseColor: Color3 = new Color3(0.75, 0.6, 0.43);
    private _sunsetColor: Color3 = new Color3(0.7, 0.45, 0.3);
    private _nightColor: Color3 = new Color3(0.1, 0.15, 0.35);
    private _groundTint: Color3 = new Color3(0, 0, 0);
    private _tempAmbientColor: Color3 = new Color3(0, 0, 0);

    constructor(
        private timeService: TimeService,
        private celestialService: CelestialService,
        private mathUtils: MathUtils
    ) {
        // Initialize key points array with references to pre-allocated colors
        this._keyPoints[0].zenith = this._nightZenith;
        this._keyPoints[0].horizon = this._nightHorizon;
        this._keyPoints[1].zenith = this._nightZenith;
        this._keyPoints[1].horizon = this._nightHorizon;
        this._keyPoints[2].zenith = this._sunriseZenith;
        this._keyPoints[2].horizon = this._sunriseHorizon;
        this._keyPoints[3].zenith = this._dayZenith;
        this._keyPoints[3].horizon = this._dayHorizon;
        this._keyPoints[4].zenith = this._dayZenith;
        this._keyPoints[4].horizon = this._dayHorizon;
        this._keyPoints[5].zenith = this._sunsetZenith;
        this._keyPoints[5].horizon = this._sunsetHorizon;
        this._keyPoints[6].zenith = this._nightZenith;
        this._keyPoints[6].horizon = this._nightHorizon;
        this._keyPoints[7].zenith = this._nightZenith;
        this._keyPoints[7].horizon = this._nightHorizon;
    }

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
        this.skyGlowLight.intensity = 0.5; // Will be updated dynamically
        this.skyGlowLight.diffuse = new Color3(0.3, 0.3, 0.4); // Will be derived from sky colors
        this.skyGlowLight.groundColor = new Color3(0.1, 0.1, 0.15); // Darker for ground reflection
        this.skyGlowLight.specular = new Color3(0, 0, 0); // No specular from ambient sky glow

        // Initial update to set light properties
        this.update();
    }

    update(): void {
        // Get celestial data
        const celestialData = this.celestialService.getCelestialPositions();
        const {
            sunDir, moonDir, sunHeight, moonHeight, sunVisibility,
            moonOpacity, sunIntensity, moonIntensity, sunColor,
            moonColor, keyTimes, worldTime
        } = celestialData;

        // Update light directions
        this.sunLight.direction = sunDir.scale(-1); // Lights point toward objects
        this.moonLight.direction = moonDir.scale(-1);

        // Update sun light - only active when sun is visible
        if (sunVisibility > 0 && sunHeight > -0.05) {
            this.sunLight.intensity = sunIntensity;
            this.sunLight.diffuse.copyFrom(sunColor);
            this.sunLight.setEnabled(true);
        } else {
            this.sunLight.setEnabled(false);
            this.sunLight.intensity = 0;
        }

        // Update moon light - only active when moon is visible
        if (moonOpacity > 0 && moonHeight > -0.05) {
            this.moonLight.intensity = moonIntensity;
            this.moonLight.diffuse.copyFrom(moonColor);
            this.moonLight.setEnabled(true);
        } else {
            this.moonLight.setEnabled(false);
            this.moonLight.intensity = 0;
        }

        // Calculate sky colors and update with smooth transitions
        this.calculateSkyColors(worldTime, keyTimes);
        this.updateColorTransitions();
        this.updateAmbientLightFromSky(celestialData);
    }

    // Calculate target zenith and horizon colors based on time of day
    private calculateSkyColors(worldTime: number, keyTimes: any): void {
        const { midnight, dawnStart, sunrise, dawnEnd, noon, duskStart, sunset, duskEnd } = keyTimes;

        // Update key points array times (zenith and horizon colors are pre-allocated)
        this._keyPoints[0].time = midnight;
        this._keyPoints[1].time = dawnStart;
        this._keyPoints[2].time = sunrise;
        this._keyPoints[3].time = dawnEnd;
        this._keyPoints[4].time = duskStart;
        this._keyPoints[5].time = sunset;
        this._keyPoints[6].time = duskEnd;
        this._keyPoints[7].time = midnight + 24; // Full circle

        // Find which key points we're between
        let startIdx = 0;
        while (startIdx < this._keyPoints.length - 1) {
            let nextTime = this._keyPoints[startIdx + 1].time;
            let currentTime = this._keyPoints[startIdx].time;

            // Handle day wrapping - if we cross midnight
            if (nextTime < currentTime) {
                if (worldTime >= 0 && worldTime < nextTime) {
                    worldTime += 24; // Wrap time
                }
                nextTime += 24; // Wrap key time
            }

            if (worldTime >= currentTime && worldTime < nextTime) {
                break; // Found our range
            }
            startIdx++;
        }

        // If we went past the end, wrap around
        if (startIdx >= this._keyPoints.length - 1) {
            startIdx = 0;
        }

        const endIdx = startIdx + 1;

        // Calculate interpolation factor
        let t = this.mathUtils.smootherstep(
            this._keyPoints[startIdx].time,
            this._keyPoints[endIdx].time,
            worldTime
        );

        // Interpolate colors using LerpToRef to avoid creating new objects
        Color3.LerpToRef(
            this._keyPoints[startIdx].zenith!,
            this._keyPoints[endIdx].zenith!,
            t,
            this.targetZenithColor
        );

        Color3.LerpToRef(
            this._keyPoints[startIdx].horizon!,
            this._keyPoints[endIdx].horizon!,
            t,
            this.targetHorizonColor
        );
    }

    // Update current colors with smooth transition to targets
    private updateColorTransitions(): void {
        // Use LerpToRef instead of Lerp to avoid creating new Color3 objects
        Color3.LerpToRef(
            this.currentZenithColor,
            this.targetZenithColor,
            this.colorTransitionSpeed,
            this.currentZenithColor
        );

        Color3.LerpToRef(
            this.currentHorizonColor,
            this.targetHorizonColor,
            this.colorTransitionSpeed,
            this.currentHorizonColor
        );
    }

    // Update ambient light using sky colors and celestial data
    private updateAmbientLightFromSky(celestialData: any): void {
        const { moonIntensity, worldTime, keyTimes, sunHeight } = celestialData;
        const { midnight, dawnStart, sunrise, dawnEnd, noon, duskStart, sunset, duskEnd } = keyTimes;

        // PART 1: AMBIENT INTENSITY - Single continuous function approach
        const normalizedTime = (worldTime / 24) % 1; // 0-1 normalized day cycle
        
        // Base intensity curve - sinusoidal with peak at noon
        let baseIntensity = 0.5 - 0.5 * Math.cos(normalizedTime * Math.PI * 2);
        let ambientIntensity = 0.04 + baseIntensity * 0.19; // Scale to desired range (0.04-0.23)

        // Add moon influence at night (smooth transition)
        const nightFactor = this.mathUtils.getNightFactor(worldTime, sunrise, sunset);
        ambientIntensity += moonIntensity * 0.08 * nightFactor;

        // PART 2: AMBIENT COLOR - Bell curve blending approach
        const dayFactorForColor = 1.0 - nightFactor;
        
        // Start with base sky color blend using LerpToRef
        Color3.LerpToRef(
            this.currentZenithColor,
            this.currentHorizonColor,
            0.5 + dayFactorForColor * 0.15, // 0.5 at night to 0.65 during day
            this._tempAmbientColor
        );

        // Calculate bell curve weights for smooth blending
        const dayWeight = this.mathUtils.bellCurve(worldTime, noon, 6.0);
        const sunriseWeight = this.mathUtils.bellCurve(worldTime, sunrise + 0.5, 1.0);
        const sunsetWeight = this.mathUtils.bellCurve(worldTime, sunset - 0.5, 1.0);
        const nightWeight = nightFactor; // Smooth step from after sunset to before sunrise

        // Blend the colors using weights - influence factors control blend strength
        // Use LerpToRef to modify _tempAmbientColor in place
        if (dayWeight > 0) {
            Color3.LerpToRef(this._tempAmbientColor, this._dayColor, dayWeight * 0.45, this._tempAmbientColor);
        }
        if (sunriseWeight > 0) {
            Color3.LerpToRef(this._tempAmbientColor, this._sunriseColor, sunriseWeight * 0.6, this._tempAmbientColor);
        }
        if (sunsetWeight > 0) {
            Color3.LerpToRef(this._tempAmbientColor, this._sunsetColor, sunsetWeight * 0.6, this._tempAmbientColor);
        }
        if (nightWeight > 0) {
            Color3.LerpToRef(this._tempAmbientColor, this._nightColor, nightWeight * 0.5, this._tempAmbientColor);
        }

        // Calculate ground color with subtle color shift for realism
        // Set values directly instead of creating a new Color3
        this._groundTint.r = Math.max(0, this._tempAmbientColor.r * 0.3 - 0.03);
        this._groundTint.g = Math.max(0, this._tempAmbientColor.g * 0.3);
        this._groundTint.b = Math.max(0, this._tempAmbientColor.b * 0.3 + 0.04);

        // Apply to the hemispheric light
        this.skyGlowLight.diffuse.copyFrom(this._tempAmbientColor);
        this.skyGlowLight.groundColor.copyFrom(this._groundTint);
        this.skyGlowLight.intensity = ambientIntensity;
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