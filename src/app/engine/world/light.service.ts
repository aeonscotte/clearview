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
            moonHeight,
            sunVisibility,
            moonOpacity,
            sunIntensity,
            moonIntensity,
            sunColor,
            moonColor
        } = this.celestialService.getCelestialPositions();
        
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
    }
    
    // Register objects to cast shadows
    addShadowCaster(mesh: any): void {
        if (this.shadowGenerator) {
            this.shadowGenerator.addShadowCaster(mesh);
        }
    }
}