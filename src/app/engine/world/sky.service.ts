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
    
    // Create the sky dome
    this.skyDome = MeshBuilder.CreateSphere('skyDome', {
      diameter: 1000,
      segments: 48,
      sideOrientation: Mesh.BACKSIDE
    }, scene);
    
    // Optimization properties
    this.skyDome.infiniteDistance = true;
    this.skyDome.renderingGroupId = 0;
    this.skyDome.isPickable = false;
    this.skyDome.freezeWorldMatrix();
    
    // Create the shader material
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
    
    // Configure material
    this.skyMaterial.backFaceCulling = false;
    
    // Apply initial uniforms
    this.updateShaderUniforms();
    
    // Apply material to dome
    this.skyDome.material = this.skyMaterial;
  }

  update(): void {
    if (!this.skyMaterial) {
      return;
    }
    
    this.updateShaderUniforms();
  }
  
  // Separate method for updating uniforms to avoid code duplication
  private updateShaderUniforms(): void {
    if (!this.skyMaterial) {
      return;
    }
    
    const timeState = this.celestialService.getTimeState();
    const { sunDir, moonDir } = this.celestialService.getCelestialPositions();
    
    // Update positions
    this.skyMaterial.setVector3("sunPosition", sunDir);
    this.skyMaterial.setVector3("moonPosition", moonDir);
    
    // Update time factors
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
    
    if (this.skyDome) {
      this.skyDome.dispose();
      this.skyDome = null;
    }
  }
}