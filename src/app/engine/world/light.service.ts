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

    constructor(
        private timeService: TimeService,
        private celestialService: CelestialService,
        private mathUtils: MathUtils
    ) { }

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
            this.sunLight.diffuse = sunColor;
            this.sunLight.setEnabled(true);
        } else {
            this.sunLight.setEnabled(false);
            this.sunLight.intensity = 0;
        }

        // Update moon light - only active when moon is visible
        if (moonOpacity > 0 && moonHeight > -0.05) {
            this.moonLight.intensity = moonIntensity;
            this.moonLight.diffuse = moonColor;
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

        // Scientifically accurate sky colors for each time period
        const nightZenith = new Color3(0.015, 0.015, 0.04);    // Almost black with hint of blue
        const nightHorizon = new Color3(0.04, 0.04, 0.08);     // Deep blue
        const sunriseZenith = new Color3(0.12, 0.15, 0.32);    // Deepening blue with purple hints
        const sunriseHorizon = new Color3(0.92, 0.58, 0.32);   // Golden orange
        const dayZenith = new Color3(0.18, 0.26, 0.48);        // Rich blue
        const dayHorizon = new Color3(0.7, 0.8, 0.95);         // Pale blue-white
        const sunsetZenith = new Color3(0.15, 0.12, 0.25);     // Purple-blue
        const sunsetHorizon = new Color3(0.9, 0.35, 0.15);     // Deep orange-red

        // Define key points for interpolation
        const keyPoints = [
            { time: midnight, zenith: nightZenith, horizon: nightHorizon },
            { time: dawnStart, zenith: nightZenith, horizon: nightHorizon },
            { time: sunrise, zenith: sunriseZenith, horizon: sunriseHorizon },
            { time: dawnEnd, zenith: dayZenith, horizon: dayHorizon },
            { time: duskStart, zenith: dayZenith, horizon: dayHorizon },
            { time: sunset, zenith: sunsetZenith, horizon: sunsetHorizon },
            { time: duskEnd, zenith: nightZenith, horizon: nightHorizon },
            { time: midnight + 24, zenith: nightZenith, horizon: nightHorizon } // Full circle
        ];

        // Find which key points we're between
        let startIdx = 0;
        while (startIdx < keyPoints.length - 1) {
            let nextTime = keyPoints[startIdx + 1].time;
            let currentTime = keyPoints[startIdx].time;

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
        if (startIdx >= keyPoints.length - 1) {
            startIdx = 0;
        }

        const endIdx = startIdx + 1;

        // Calculate interpolation factor and interpolate colors
        let t = this.mathUtils.smootherstep(
            keyPoints[startIdx].time,
            keyPoints[endIdx].time,
            worldTime
        );

        this.targetZenithColor = Color3.Lerp(
            keyPoints[startIdx].zenith,
            keyPoints[endIdx].zenith,
            t
        );

        this.targetHorizonColor = Color3.Lerp(
            keyPoints[startIdx].horizon,
            keyPoints[endIdx].horizon,
            t
        );
    }

    // Update current colors with smooth transition to targets
    private updateColorTransitions(): void {
        this.currentZenithColor = Color3.Lerp(
            this.currentZenithColor,
            this.targetZenithColor,
            this.colorTransitionSpeed
        );

        this.currentHorizonColor = Color3.Lerp(
            this.currentHorizonColor,
            this.targetHorizonColor,
            this.colorTransitionSpeed
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
        
        // Start with base sky color blend
        let ambientColor = Color3.Lerp(
            this.currentZenithColor,
            this.currentHorizonColor,
            0.5 + dayFactorForColor * 0.15 // 0.5 at night to 0.65 during day
        );

        // Define key colors
        const dayColor = new Color3(0.9, 0.9, 0.95);       // Slightly off-white
        const sunriseColor = new Color3(0.75, 0.6, 0.43);  // Warm golden
        const sunsetColor = new Color3(0.7, 0.45, 0.3);    // Warm amber
        const nightColor = new Color3(0.1, 0.15, 0.35);    // Cool blue

        // Calculate bell curve weights for smooth blending
        const dayWeight = this.mathUtils.bellCurve(worldTime, noon, 6.0);
        const sunriseWeight = this.mathUtils.bellCurve(worldTime, sunrise + 0.5, 1.0);
        const sunsetWeight = this.mathUtils.bellCurve(worldTime, sunset - 0.5, 1.0);
        const nightWeight = nightFactor; // Smooth step from after sunset to before sunrise

        // Blend the colors using weights - influence factors control blend strength
        if (dayWeight > 0) {
            ambientColor = Color3.Lerp(ambientColor, dayColor, dayWeight * 0.45);
        }
        if (sunriseWeight > 0) {
            ambientColor = Color3.Lerp(ambientColor, sunriseColor, sunriseWeight * 0.6);
        }
        if (sunsetWeight > 0) {
            ambientColor = Color3.Lerp(ambientColor, sunsetColor, sunsetWeight * 0.6);
        }
        if (nightWeight > 0) {
            ambientColor = Color3.Lerp(ambientColor, nightColor, nightWeight * 0.5);
        }

        // Calculate ground color with subtle color shift for realism
        const groundTint = new Color3(
            Math.max(0, ambientColor.r * 0.3 - 0.03),
            Math.max(0, ambientColor.g * 0.3),
            Math.max(0, ambientColor.b * 0.3 + 0.04)
        );

        // Apply to the hemispheric light
        this.skyGlowLight.diffuse = ambientColor;
        this.skyGlowLight.groundColor = groundTint;
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