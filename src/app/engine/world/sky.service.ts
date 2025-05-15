// src/app/engine/world/sky.service.ts
import { Injectable } from '@angular/core';
import { Scene } from '@babylonjs/core/scene';
import { 
    MeshBuilder, 
    ShaderMaterial, 
    Mesh, 
    Effect 
} from '@babylonjs/core';
import { TimeService } from '../physics/time.service';
import { CelestialService } from './celestial.service';

// Import shader code directly from separate files
import { vertexShader } from '../shaders/enhancedSky.vertex';
import { fragmentShader } from '../shaders/enhancedSky.fragment';

/**
 * Service responsible for creating and managing the sky dome
 * with dynamic day/night cycle and celestial objects
 */
@Injectable({
    providedIn: 'root'
})
export class SkyService {
    private skyDome: Mesh | null = null;
    private skyMaterial: ShaderMaterial | null = null;
    private readonly SHADER_NAME = 'enhancedSky';

    constructor(
        private timeService: TimeService,
        private celestialService: CelestialService
    ) {
        // Register shaders once in the constructor
        this.registerShaders();
    }

    /**
     * Creates the sky dome with appropriate shading
     * @param scene The BabylonJS scene
     */
    createSky(scene: Scene): void {
        // Create the sky dome
        this.skyDome = MeshBuilder.CreateSphere('skyDome', {
            diameter: 1000,
            segments: 48, // Higher segment count for better quality
            sideOrientation: Mesh.BACKSIDE // Render inside of sphere
        }, scene);
        
        // Apply critical rendering properties for optimization
        this.skyDome.infiniteDistance = true; // Never moves with camera
        this.skyDome.renderingGroupId = 0; // Render first, behind everything
        this.skyDome.isPickable = false; // Can't be interacted with
        this.skyDome.freezeWorldMatrix(); // Performance optimization
        
        // Create the shader material with necessary uniforms
        this.skyMaterial = new ShaderMaterial(this.SHADER_NAME, scene, {
            vertex: this.SHADER_NAME,
            fragment: this.SHADER_NAME
        }, {
            attributes: ["position", "normal"],
            uniforms: [
                "worldViewProjection", 
                "sunPosition", 
                "moonPosition", 
                "iTime", 
                "starRotation",
                "dayFactor",
                "nightFactor",
                "dawnFactor",
                "duskFactor",
                "sunVisibility",
                "moonOpacity",
                "starVisibility"
            ]
        });
        
        // Enable backface culling for proper rendering inside the dome
        this.skyMaterial.backFaceCulling = false;
        
        // Get the time state and celestial positions
        const timeState = this.celestialService.getTimeState();
        const { sunDir, moonDir } = this.celestialService.getCelestialPositions();
        
        // Initialize uniform values using the time state
        this.skyMaterial.setVector3("sunPosition", sunDir);
        this.skyMaterial.setVector3("moonPosition", moonDir);
        this.skyMaterial.setFloat("iTime", timeState.worldTime);
        this.skyMaterial.setFloat("starRotation", timeState.continuousRotation);
        
        // Pass time factors directly to shader
        this.skyMaterial.setFloat("dayFactor", timeState.dayFactor);
        this.skyMaterial.setFloat("nightFactor", timeState.nightFactor);
        this.skyMaterial.setFloat("dawnFactor", timeState.dawnFactor);
        this.skyMaterial.setFloat("duskFactor", timeState.duskFactor);
        this.skyMaterial.setFloat("sunVisibility", timeState.sunVisibility);
        this.skyMaterial.setFloat("moonOpacity", timeState.moonOpacity);
        this.skyMaterial.setFloat("starVisibility", timeState.starVisibility);
        
        // Apply the material to the sky dome
        this.skyDome.material = this.skyMaterial;
    }
    
    /**
     * Updates the sky appearance based on time and celestial positions
     * Should be called every frame in the render loop
     */
    update(): void {
        if (!this.skyMaterial) {
            console.warn("Sky material not initialized");
            return;
        }
        
        // Get the unified time state and celestial positions
        const timeState = this.celestialService.getTimeState();
        const { sunDir, moonDir } = this.celestialService.getCelestialPositions();
        
        // Update shader uniforms with latest values from the time state
        this.skyMaterial.setVector3("sunPosition", sunDir);
        this.skyMaterial.setVector3("moonPosition", moonDir);
        this.skyMaterial.setFloat("iTime", timeState.worldTime);
        this.skyMaterial.setFloat("starRotation", timeState.continuousRotation);
        
        // Pass time factors directly to shader - no need to recalculate in shader
        this.skyMaterial.setFloat("dayFactor", timeState.dayFactor);
        this.skyMaterial.setFloat("nightFactor", timeState.nightFactor);
        this.skyMaterial.setFloat("dawnFactor", timeState.dawnFactor);
        this.skyMaterial.setFloat("duskFactor", timeState.duskFactor);
        this.skyMaterial.setFloat("sunVisibility", timeState.sunVisibility);
        this.skyMaterial.setFloat("moonOpacity", timeState.moonOpacity);
        this.skyMaterial.setFloat("starVisibility", timeState.starVisibility);
    }
    
    /**
     * Disposes sky dome resources to prevent memory leaks
     */
    dispose(): void {
        if (this.skyMaterial) {
            this.skyMaterial.dispose();
            this.skyMaterial = null;
        }
        
        if (this.skyDome) {
            this.skyDome.dispose();
            this.skyDome = null;
        }
    }

    /**
     * Registers the vertex and fragment shaders with BabylonJS
     * This is now called once during service creation
     */
    private registerShaders(): void {
        // Check if already registered to avoid duplicates
        if (!Effect.ShadersStore[`${this.SHADER_NAME}VertexShader`]) {
            // Register vertex and fragment shaders
            Effect.ShadersStore[`${this.SHADER_NAME}VertexShader`] = vertexShader;
            Effect.ShadersStore[`${this.SHADER_NAME}FragmentShader`] = fragmentShader;
            console.log(`Registered ${this.SHADER_NAME} shaders`);
        }
    }
}