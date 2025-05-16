// src/app/engine/world/sky.service.ts
import { Injectable } from '@angular/core';
import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder, ShaderMaterial, Mesh, Vector3, Color3 } from '@babylonjs/core';
import { TimeService } from '../physics/time.service';
import { CelestialService } from './celestial.service';
import { ShaderRegistryService } from '../shaders/shader-registry.service';

@Injectable({
    providedIn: 'root'
})
export class SkyService {
    private skyDome: Mesh | null = null;
    private skyMaterial: ShaderMaterial | null = null;
    private pausedMaterial: ShaderMaterial | null = null;
    private readonly SHADER_NAME = 'enhancedSky';
    
    // Pre-allocated temporary objects for material updates
    private _tempInt = { isPaused: 0 };

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
                "moonOpacity", "starVisibility", "isPaused"
            ]
        });

        this.skyMaterial.backFaceCulling = false;
        this.updateShaderUniforms(); // Apply initial uniforms
        this.skyDome.material = this.skyMaterial;
        
        // Create paused material up front to avoid creating it during pause
        this.createPausedMaterial(scene);
    }
    
    // Create the paused material once during initialization
    private createPausedMaterial(scene: Scene): void {
        this.pausedMaterial = new ShaderMaterial("pausedSkyMaterial", scene, {
            vertex: this.SHADER_NAME,
            fragment: this.SHADER_NAME
        }, {
            attributes: ["position", "normal"],
            uniforms: [
                "worldViewProjection", "sunPosition", "moonPosition",
                "iTime", "starRotation", "dayFactor", "nightFactor",
                "dawnFactor", "duskFactor", "sunVisibility",
                "moonOpacity", "starVisibility", "isPaused"
            ]
        });
        
        this.pausedMaterial.backFaceCulling = false;
        
        // Initialize with 1 for paused state
        this.pausedMaterial.setInt("isPaused", 1);
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

    // Called when pause state changes
    handlePauseChange(isPaused: boolean): void {
        if (!this.skyDome) return;

        if (isPaused) {
            // Ensure paused material exists
            if (!this.pausedMaterial && this.skyMaterial) {
                this.createPausedMaterial(this.skyDome.getScene());
            }
            
            // Update the paused material with current values
            if (this.pausedMaterial && this.skyMaterial) {
                this.copyMaterialValues(this.skyMaterial, this.pausedMaterial);
            }

            // Switch to the paused material
            if (this.pausedMaterial) {
                this.skyDome.material = this.pausedMaterial;
            }
        } else {
            // Resume - switch back to the dynamic material
            if (this.skyMaterial) {
                // Set isPaused uniform to 0 (unpaused)
                this.skyMaterial.setInt("isPaused", 0);
                this.skyDome.material = this.skyMaterial;
            }
        }
    }

    // Copy material values without creating new objects
    private copyMaterialValues(source: ShaderMaterial, target: ShaderMaterial): void {
        // Get time and celestial data - no new allocations since we've optimized CelestialService
        const timeState = this.celestialService.getTimeState();
        const celestialPositions = this.celestialService.getCelestialPositions();
        
        // Use existing references from CelestialService - no new objects created
        const { sunDir, moonDir } = celestialPositions;
        
        // Update shader uniforms directly
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
        
        // Set to paused state
        target.setInt("isPaused", 1);
    }

    private updateShaderUniforms(): void {
        if (!this.skyMaterial) return;

        // Use timeState directly - no intermediary objects
        const timeState = this.celestialService.getTimeState();
        const celestialPositions = this.celestialService.getCelestialPositions();
        
        // Use existing references - no new objects
        const { sunDir, moonDir } = celestialPositions;

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
        
        // Set running state (not paused)
        this.skyMaterial.setInt("isPaused", 0);
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