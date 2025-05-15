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
  // Reuse color objects for fog transitions
  private currentFogColor = new Color3(0.04, 0.04, 0.08);
  private targetFogColor = new Color3(0.04, 0.04, 0.08);
  private currentFogDensity = 0.001;
  private targetFogDensity = 0.001;
  private fogTransitionSpeed = 0.05;
  
  // Reusable temporary colors for calculations
  private tempColor = new Color3(0, 0, 0);
  
  // Pre-defined tint colors - reused across frames
  private daytimeTint = new Color3(0.85, 0.85, 0.9);
  private sunriseTint = new Color3(0.85, 0.65, 0.45);
  private sunsetTint = new Color3(0.8, 0.5, 0.35);
  private nightTint = new Color3(0.02, 0.03, 0.08);

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

    // Apply atmosphere for current time
    this.update(scene);
  }

  update(scene: Scene): void {
    const elapsed = this.timeService.getElapsed();

    // Get celestial data
    const celestialData = this.celestialService.getCelestialPositions();
    const {
      sunHeight, keyTimes, worldTime
    } = celestialData;
    const { sunrise, sunset, noon, midnight } = keyTimes;

    // Get sky colors from light service
    const skyColors = this.lightService.getSkyColors();

    // PART 1: FOG COLOR - Unified approach to match ambient lighting
    // -------------------------------------------------------------

    // Calculate time factors
    const midnightFactor = this.bellCurve(worldTime, midnight, 8);
    const noonFactor = this.bellCurve(worldTime, noon, 6);
    const sunriseFactor = this.bellCurve(worldTime, sunrise + 0.3, 1.0);
    const sunsetFactor = this.bellCurve(worldTime, sunset - 0.3, 1.0);

    // Start with base horizon/zenith blend
    const zenithInfluence = 0.12 + midnightFactor * 0.13;
    
    // Use LerpToRef to avoid creating new colors
    Color3.LerpToRef(
      skyColors.horizon, 
      skyColors.zenith, 
      zenithInfluence, 
      this.targetFogColor
    );

    // Apply time-specific tinting
    if (noonFactor > 0) {
      Color3.LerpToRef(
        this.targetFogColor,
        this.daytimeTint,
        noonFactor * 0.2,
        this.tempColor
      );
      this.targetFogColor.copyFrom(this.tempColor);
    }

    if (sunriseFactor > 0) {
      Color3.LerpToRef(
        this.targetFogColor,
        this.sunriseTint,
        sunriseFactor * 0.4,
        this.tempColor
      );
      this.targetFogColor.copyFrom(this.tempColor);
    }

    if (sunsetFactor > 0) {
      Color3.LerpToRef(
        this.targetFogColor,
        this.sunsetTint,
        sunsetFactor * 0.4,
        this.tempColor
      );
      this.targetFogColor.copyFrom(this.tempColor);
    }

    if (midnightFactor > 0) {
      Color3.LerpToRef(
        this.targetFogColor,
        this.nightTint,
        midnightFactor * 0.3,
        this.tempColor
      );
      this.targetFogColor.copyFrom(this.tempColor);
    }

    // PART 2: FOG DENSITY - Continuous function with time-based modulation
    // -------------------------------------------------------------------

    // Create normalized time (0-1)
    const normalizedTime = (worldTime / 24) % 1;

    // Base density curve
    let dayCurve = 0.5 - 0.5 * Math.cos(normalizedTime * Math.PI * 2);

    // Create sunrise/sunset peaks
    const sunrisePeak = this.bellCurve(worldTime, sunrise, 1.0);
    const sunsetPeak = this.bellCurve(worldTime, sunset, 1.0);

    // Combine to form base density
    let baseFogDensity = 0.0012; // Base minimum density
    baseFogDensity += dayCurve * 0.0003;
    baseFogDensity += sunrisePeak * 0.0035;
    baseFogDensity += sunsetPeak * 0.0035;

    // Altitude modulation
    const camera = scene.activeCamera;
    const camY = camera?.position.y ?? 0;
    const altitudeFactor = Math.exp(-camY / 175.0);
    baseFogDensity *= altitudeFactor;

    // Subtle time-based variations
    const fogPulse = 0.00015 * Math.sin(elapsed * 0.3);
    const fogDrift = 0.0001 * Math.cos(elapsed * 0.7);
    this.targetFogDensity = baseFogDensity + fogPulse + fogDrift;

    // Ensure reasonable limits
    this.targetFogDensity = Math.max(0.0002, Math.min(0.008, this.targetFogDensity));

    // PART 3: SMOOTH TRANSITIONS
    // --------------------------
    Color3.LerpToRef(
      this.currentFogColor,
      this.targetFogColor,
      this.fogTransitionSpeed,
      this.currentFogColor
    );

    this.currentFogDensity = this.lerp(
      this.currentFogDensity,
      this.targetFogDensity,
      this.fogTransitionSpeed
    );

    // Apply to scene - scene.fogColor and currentFogColor reference the same object
    scene.fogColor.copyFrom(this.currentFogColor);
    scene.fogDensity = this.currentFogDensity;
  }

  // Utility functions
  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private bellCurve(x: number, center: number, width: number): number {
    // Handle day wrapping
    if (center < 6 && x > 18) x -= 24;
    if (center > 18 && x < 6) x += 24;

    const normalized = (x - center) / width;
    return Math.max(0, 1 - normalized * normalized);
  }

  private smootherstep(edge0: number, edge1: number, x: number): number {
    // Handle wrapping
    if (edge0 > edge1 && x < edge0 && x < edge1) x += 24;
    
    // Clamp to 0..1
    x = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    
    // Smootherstep polynomial
    return x * x * x * (x * (x * 6 - 15) + 10);
  }
}