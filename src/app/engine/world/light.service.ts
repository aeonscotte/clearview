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
  private skyGlowLight!: HemisphericLight;
  private shadowGenerator!: ShadowGenerator;

  // Reuse color objects for transitions
  private currentZenithColor = new Color3(0, 0, 0);
  private currentHorizonColor = new Color3(0, 0, 0);
  private targetZenithColor = new Color3(0, 0, 0);
  private targetHorizonColor = new Color3(0, 0, 0);
  private colorTransitionSpeed = 0.05;
  
  // Pre-defined key time colors - reused for all calculations
  private nightZenith = new Color3(0.015, 0.015, 0.04);
  private nightHorizon = new Color3(0.04, 0.04, 0.08);
  private sunriseZenith = new Color3(0.12, 0.15, 0.32);
  private sunriseHorizon = new Color3(0.92, 0.58, 0.32);
  private dayZenith = new Color3(0.18, 0.26, 0.48);
  private dayHorizon = new Color3(0.7, 0.8, 0.95);
  private sunsetZenith = new Color3(0.15, 0.12, 0.25);
  private sunsetHorizon = new Color3(0.9, 0.35, 0.15);
  
  // Reusable working colors
  private tempColor = new Color3(0, 0, 0);
  private ambientColor = new Color3(0, 0, 0);
  private groundTint = new Color3(0, 0, 0);
  
  // Reusable return objects for getSkyColors
  private returnZenith = new Color3(0, 0, 0);
  private returnHorizon = new Color3(0, 0, 0);

  constructor(
    private timeService: TimeService,
    private celestialService: CelestialService
  ) {}

  createLights(scene: Scene): void {
    // Sun light - warm daylight
    this.sunLight = new DirectionalLight("SunLight", new Vector3(0, -1, 0), scene);
    this.sunLight.intensity = 0;
    this.sunLight.diffuse = new Color3(1.0, 0.95, 0.8);
    this.sunLight.specular = new Color3(1.0, 0.98, 0.8);
    this.sunLight.shadowEnabled = true;

    // Shadow configuration
    this.shadowGenerator = new ShadowGenerator(1024, this.sunLight);
    this.shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator.blurScale = 2;
    this.shadowGenerator.setDarkness(0.3);

    // Moon light
    this.moonLight = new DirectionalLight("MoonLight", new Vector3(0, -1, 0), scene);
    this.moonLight.intensity = 0;
    this.moonLight.diffuse = new Color3(0.5, 0.5, 0.8);
    this.moonLight.specular = new Color3(0.2, 0.2, 0.4);

    // Sky glow light
    this.skyGlowLight = new HemisphericLight("SkyGlowLight", new Vector3(0, 1, 0), scene);
    this.skyGlowLight.intensity = 0.5;
    this.skyGlowLight.diffuse = new Color3(0.3, 0.3, 0.4);
    this.skyGlowLight.groundColor = new Color3(0.1, 0.1, 0.15);
    this.skyGlowLight.specular = new Color3(0, 0, 0);

    // Initial update
    this.update();
  }

  update(): void {
    const celestialData = this.celestialService.getCelestialPositions();
    const {
      sunDir, moonDir, sunHeight, moonHeight, sunVisibility, 
      moonOpacity, sunIntensity, moonIntensity, sunColor, 
      moonColor, keyTimes, worldTime
    } = celestialData;

    // Update light directions - avoid new Vector3 creation
    this.sunLight.direction.copyFrom(sunDir).scaleInPlace(-1);
    this.moonLight.direction.copyFrom(moonDir).scaleInPlace(-1);

    // Sun light update
    if (sunVisibility > 0 && sunHeight > -0.05) {
      this.sunLight.intensity = sunIntensity;
      // Avoid creating new Color3 by copying
      this.sunLight.diffuse.copyFrom(sunColor);
      this.sunLight.setEnabled(true);
    } else {
      this.sunLight.setEnabled(false);
      this.sunLight.intensity = 0;
    }

    // Moon light update
    if (moonOpacity > 0 && moonHeight > -0.05) {
      this.moonLight.intensity = moonIntensity;
      this.moonLight.diffuse.copyFrom(moonColor);
      this.moonLight.setEnabled(true);
    } else {
      this.moonLight.setEnabled(false);
      this.moonLight.intensity = 0;
    }

    // Update sky colors
    this.calculateSkyColors(worldTime, keyTimes);
    this.updateColorTransitions();
    this.updateAmbientLightFromSky(celestialData);
  }

  private calculateSkyColors(worldTime: number, keyTimes: any): void {
    const { midnight, dawnStart, sunrise, dawnEnd, noon, duskStart, sunset, duskEnd } = keyTimes;

    // Define our keypoints array
    // Use references to pre-created colors instead of creating new ones
    const keyPoints = [
      { time: midnight, zenith: this.nightZenith, horizon: this.nightHorizon },
      { time: dawnStart, zenith: this.nightZenith, horizon: this.nightHorizon },
      { time: sunrise, zenith: this.sunriseZenith, horizon: this.sunriseHorizon },
      { time: dawnEnd, zenith: this.dayZenith, horizon: this.dayHorizon },
      { time: duskStart, zenith: this.dayZenith, horizon: this.dayHorizon },
      { time: sunset, zenith: this.sunsetZenith, horizon: this.sunsetHorizon },
      { time: duskEnd, zenith: this.nightZenith, horizon: this.nightHorizon },
      { time: midnight + 24, zenith: this.nightZenith, horizon: this.nightHorizon }
    ];

    // Find which key points we're between
    let startIdx = 0;
    while (startIdx < keyPoints.length - 1) {
      let nextTime = keyPoints[startIdx + 1].time;
      let currentTime = keyPoints[startIdx].time;

      // Handle day wrapping
      if (nextTime < currentTime) {
        if (worldTime >= 0 && worldTime < nextTime) worldTime += 24;
        nextTime += 24;
      }

      if (worldTime >= currentTime && worldTime < nextTime) break;
      startIdx++;
    }

    // Handle wrapping
    if (startIdx >= keyPoints.length - 1) startIdx = 0;
    const endIdx = startIdx + 1;

    // Calculate interpolation factor
    const t = this.smootherstep(keyPoints[startIdx].time, keyPoints[endIdx].time, worldTime);

    // Use LerpToRef to avoid creating new objects
    Color3.LerpToRef(keyPoints[startIdx].zenith, keyPoints[endIdx].zenith, t, this.targetZenithColor);
    Color3.LerpToRef(keyPoints[startIdx].horizon, keyPoints[endIdx].horizon, t, this.targetHorizonColor);
  }

  private updateColorTransitions(): void {
    // Use LerpToRef to modify existing objects
    Color3.LerpToRef(this.currentZenithColor, this.targetZenithColor, this.colorTransitionSpeed, this.currentZenithColor);
    Color3.LerpToRef(this.currentHorizonColor, this.targetHorizonColor, this.colorTransitionSpeed, this.currentHorizonColor);
  }

  private updateAmbientLightFromSky(celestialData: any): void {
    const { moonIntensity, worldTime, keyTimes, sunHeight } = celestialData;
    const { sunrise, sunset, noon } = keyTimes;

    // Calculate base intensity
    const normalizedTime = (worldTime / 24) % 1;
    let baseIntensity = 0.5 - 0.5 * Math.cos(normalizedTime * Math.PI * 2);
    let ambientIntensity = 0.04 + baseIntensity * 0.19;

    // Add moon influence
    const nightFactor = this.getNightFactor(worldTime, sunrise, sunset);
    ambientIntensity += moonIntensity * 0.08 * nightFactor;

    // Start with base sky color blend - reuse ambientColor object
    const dayFactorForColor = 1.0 - nightFactor;
    Color3.LerpToRef(this.currentZenithColor, this.currentHorizonColor, 0.5 + dayFactorForColor * 0.15, this.ambientColor);

    // Apply bell curve weights - directly modify ambientColor
    const dayWeight = this.bellCurve(worldTime, noon, 6.0);
    const sunriseWeight = this.bellCurve(worldTime, sunrise + 0.5, 1.0);
    const sunsetWeight = this.bellCurve(worldTime, sunset - 0.5, 1.0);

    // Pre-defined colors for different lighting conditions
    // Use existing Color3 objects to avoid creating new ones
    // These cases don't happen simultaneously so we can reuse tempColor
    if (dayWeight > 0) {
      this.tempColor.set(0.9, 0.9, 0.95); // Day color
      Color3.LerpToRef(this.ambientColor, this.tempColor, dayWeight * 0.45, this.ambientColor);
    }

    if (sunriseWeight > 0) {
      this.tempColor.set(0.75, 0.6, 0.43); // Sunrise color
      Color3.LerpToRef(this.ambientColor, this.tempColor, sunriseWeight * 0.6, this.ambientColor);
    }

    if (sunsetWeight > 0) {
      this.tempColor.set(0.7, 0.45, 0.3); // Sunset color
      Color3.LerpToRef(this.ambientColor, this.tempColor, sunsetWeight * 0.6, this.ambientColor);
    }

    if (nightFactor > 0) {
      this.tempColor.set(0.1, 0.15, 0.35); // Night color
      Color3.LerpToRef(this.ambientColor, this.tempColor, nightFactor * 0.5, this.ambientColor);
    }

    // Calculate ground color - reuse groundTint object
    this.groundTint.r = Math.max(0, this.ambientColor.r * 0.3 - 0.03);
    this.groundTint.g = Math.max(0, this.ambientColor.g * 0.3);
    this.groundTint.b = Math.max(0, this.ambientColor.b * 0.3 + 0.04);

    // Apply to the hemispheric light - avoid creating new colors
    this.skyGlowLight.diffuse.copyFrom(this.ambientColor);
    this.skyGlowLight.groundColor.copyFrom(this.groundTint);
    this.skyGlowLight.intensity = ambientIntensity;
  }

  private bellCurve(x: number, center: number, width: number): number {
    // Handle day wrapping
    if (center < 6 && x > 18) x -= 24;
    if (center > 18 && x < 6) x += 24;

    const normalized = (x - center) / width;
    return Math.max(0, 1 - normalized * normalized);
  }

  private getNightFactor(time: number, sunrise: number, sunset: number): number {
    const dayStart = sunrise - 0.5;
    const dayEnd = sunset + 0.5;

    // Handle day wrapping
    let wrappedTime = time;
    if (sunset < sunrise && time < sunrise) wrappedTime += 24;

    // Apply transitions
    if (wrappedTime >= dayStart && wrappedTime <= sunrise + 1) {
      return 1 - this.smootherstep(dayStart, sunrise + 1, wrappedTime);
    } else if (wrappedTime >= sunset - 1 && wrappedTime <= dayEnd) {
      return this.smootherstep(sunset - 1, dayEnd, wrappedTime);
    } else if (wrappedTime > dayEnd || wrappedTime < dayStart) {
      return 1;
    } else {
      return 0;
    }
  }

  private smootherstep(edge0: number, edge1: number, x: number): number {
    // Handle edge case with wrapping
    if (edge0 > edge1 && x < edge0 && x < edge1) x += 24;

    // Clamp to 0..1
    x = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));

    // Smootherstep polynomial
    return x * x * x * (x * (x * 6 - 15) + 10);
  }

  addShadowCaster(mesh: any): void {
    if (this.shadowGenerator) {
      this.shadowGenerator.addShadowCaster(mesh);
    }
  }

  getSkyColors(): { zenith: Color3, horizon: Color3 } {
    // Copy values to return objects instead of creating new ones
    this.returnZenith.copyFrom(this.currentZenithColor);
    this.returnHorizon.copyFrom(this.currentHorizonColor);
    
    return { 
      zenith: this.returnZenith, 
      horizon: this.returnHorizon 
    };
  }
  
  // Clean up resources
  dispose(): void {
    if (this.sunLight) this.sunLight.dispose();
    if (this.moonLight) this.moonLight.dispose();
    if (this.skyGlowLight) this.skyGlowLight.dispose();
    if (this.shadowGenerator) this.shadowGenerator.dispose();
  }
}