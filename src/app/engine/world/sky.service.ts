// src/app/engine/world/sky.service.ts
import { Injectable } from '@angular/core';
import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder, ShaderMaterial, Mesh } from '@babylonjs/core';
import { TimeService } from '../physics/time.service';
import { CelestialService } from './celestial.service';
import { ShaderRegistryService } from '../shaders/shader-registry.service';

@Injectable({
    providedIn: 'root'
})
export class SkyService {
    private skyDome: Mesh | null = null;
    private skyMaterial: ShaderMaterial | null = null;
    private readonly SHADER_NAME = 'enhancedSky';

    // Add a dedicated material for paused state
    private pausedMaterial: ShaderMaterial | null = null;

    constructor(
        private timeService: TimeService,
        private celestialService: CelestialService,
        private shaderRegistry: ShaderRegistryService
    ) { }

    createSky(scene: Scene): void {
        // Verify shader is registered
        if (!this.shaderRegistry.isShaderRegistered(this.SHADER_NAME)) {
            console.warn(`Shader "${this.SHADER_NAME}" not found in registry. Sky may not render correctly.`);
        }

        // Create sky dome
        this.skyDome = MeshBuilder.CreateSphere('skyDome', {
            diameter: 1000,
            segments: 48,
            sideOrientation: Mesh.BACKSIDE
        }, scene);

        // Optimize sky dome
        this.skyDome.infiniteDistance = true;
        this.skyDome.renderingGroupId = 0;
        this.skyDome.isPickable = false;
        this.skyDome.freezeWorldMatrix();

        // Create normal running shader material
        this.skyMaterial = new ShaderMaterial(this.SHADER_NAME, scene, {
            vertex: this.SHADER_NAME,
            fragment: this.SHADER_NAME
        }, {
            attributes: ["position", "normal"],
            uniforms: [
                "worldViewProjection", "sunPosition", "moonPosition",
                "iTime", "starRotation", "dayFactor", "nightFactor",
                "dawnFactor", "duskFactor", "sunVisibility",
                "moonOpacity", "starVisibility"
            ]
        });

        this.skyMaterial.backFaceCulling = false;
        this.updateShaderUniforms(); // Apply initial uniforms
        this.skyDome.material = this.skyMaterial;
    }

    update(): void {
        // If time is paused, don't do any updates
        if (this.timeService.isPaused()) {
            return;
        }

        if (this.skyMaterial) {
            this.updateShaderUniforms();
        }
    }

    // Called when pause state changes - create a snapshot of the current sky
    handlePauseChange(isPaused: boolean): void {
        if (!this.skyDome) return;

        if (isPaused) {
            // Take a snapshot of the current sky and freeze it completely
            // We'll use a new material instance that doesn't get updated
            const scene = this.skyDome.getScene();

            // Clone the current material - this creates a static copy with current values
            if (!this.pausedMaterial) {
                this.pausedMaterial = this.skyMaterial?.clone("pausedSkyMaterial") || null;
            } else {
                // Update the paused material with current values
                this.copyMaterialValues(this.skyMaterial, this.pausedMaterial);
            }

            // Switch to the paused material
            if (this.pausedMaterial) {
                this.skyDome.material = this.pausedMaterial;
            }
        } else {
            // Resume - switch back to the dynamic material
            if (this.skyMaterial) {
                this.skyDome.material = this.skyMaterial;
            }
        }
    }

    // Helper to copy material values
    private copyMaterialValues(source: ShaderMaterial | null, target: ShaderMaterial | null): void {
        if (!source || !target) return;

        // Copy all uniforms from source to target
        const timeState = this.celestialService.getTimeState();
        const { sunDir, moonDir } = this.celestialService.getCelestialPositions();

        target.setVector3("sunPosition", sunDir);
        target.setVector3("moonPosition", moonDir);
        target.setFloat("iTime", timeState.worldTime);
        target.setFloat("starRotation", timeState.continuousRotation);
        target.setFloat("dayFactor", timeState.dayFactor);
        target.setFloat("nightFactor", timeState.nightFactor);
        target.setFloat("dawnFactor", timeState.dawnFactor);
        target.setFloat("duskFactor", timeState.duskFactor);
        target.setFloat("sunVisibility", timeState.sunVisibility);
        target.setFloat("moonOpacity", timeState.moonOpacity);
        target.setFloat("starVisibility", timeState.starVisibility);
    }

    private updateShaderUniforms(): void {
        if (!this.skyMaterial) return;

        const timeState = this.celestialService.getTimeState();
        const { sunDir, moonDir } = this.celestialService.getCelestialPositions();

        // Update positions
        this.skyMaterial.setVector3("sunPosition", sunDir);
        this.skyMaterial.setVector3("moonPosition", moonDir);

        // Update time values
        this.skyMaterial.setFloat("iTime", timeState.worldTime);
        this.skyMaterial.setFloat("starRotation", timeState.continuousRotation);

        // Update time-based factors
        this.skyMaterial.setFloat("dayFactor", timeState.dayFactor);
        this.skyMaterial.setFloat("nightFactor", timeState.nightFactor);
        this.skyMaterial.setFloat("dawnFactor", timeState.dawnFactor);
        this.skyMaterial.setFloat("duskFactor", timeState.duskFactor);
        this.skyMaterial.setFloat("sunVisibility", timeState.sunVisibility);
        this.skyMaterial.setFloat("moonOpacity", timeState.moonOpacity);
        this.skyMaterial.setFloat("starVisibility", timeState.starVisibility);
    }

    dispose(): void {
        if (this.skyMaterial) {
            this.skyMaterial.dispose();
            this.skyMaterial = null;
        }

        if (this.pausedMaterial) {
            this.pausedMaterial.dispose();
            this.pausedMaterial = null;
        }

        if (this.skyDome) {
            this.skyDome.dispose();
            this.skyDome = null;
        }
    }
}