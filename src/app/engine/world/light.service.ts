// src/app/engine/world/light.service.ts
import { Injectable } from '@angular/core';
import { Scene } from '@babylonjs/core/scene';
import { DirectionalLight, Vector3, Color3, ShadowGenerator } from '@babylonjs/core';
import { TimeService } from '../physics/time.service';
import { CelestialService } from './celestial.service';

@Injectable({
  providedIn: 'root'
})
export class LightService {
    private sunLight!: DirectionalLight;
    private moonLight!: DirectionalLight;
    private shadowGenerator!: ShadowGenerator;

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
        
        // Initial update to set light properties
        this.update();
    }

    update(): void {
        // Get all celestial data from the celestial service
        const {
            sunDir,
            moonDir,
            sunHeight,
            isDay,
            isNight,
            sunIntensity,
            moonIntensity,
            sunColor
        } = this.celestialService.getCelestialPositions();
        
        // Update light directions
        this.sunLight.direction = sunDir.scale(-1); // Lights point toward objects
        this.moonLight.direction = moonDir.scale(-1);
        
        // IMPORTANT: Completely disable lights when they shouldn't be active
        // This prevents issues with PBR material shading
        
        // Sun light - only active during day
        if (sunHeight > 0) {
            // Day time - enable sun, update intensity
            this.sunLight.intensity = sunIntensity;
            this.sunLight.diffuse = sunColor;
            this.sunLight.setEnabled(true);
        } else {
            // Night time - disable sun completely
            this.sunLight.setEnabled(false);
            this.sunLight.intensity = 0;
        }
        
        // Moon light - only active during night
        if (sunHeight < 0) {
            // Night time - enable moon, update intensity
            this.moonLight.intensity = moonIntensity;
            this.moonLight.setEnabled(true);
        } else {
            // Day time - disable moon completely
            this.moonLight.setEnabled(false);
            this.moonLight.intensity = 0;
        }
    }
    
    // Register objects to cast shadows
    addShadowCaster(mesh: any): void {
        if (this.shadowGenerator) {
            this.shadowGenerator.addShadowCaster(mesh);
        }
    }
}