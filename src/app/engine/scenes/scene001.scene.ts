// src/app/engine/scenes/scene001.scene.ts
import { Injectable } from '@angular/core';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { BaseScene } from '../base/scene';
import { EngineService } from '../core/engine.service';
import { TimeService } from '../physics/time.service';
import { CameraService } from '../player/camera.service';
import { LightService } from '../world/light.service';
import { TerrainService } from '../world/terrain.service';
import { TerrainGeneratorService } from '../world/terrain-generator.service';
import { MaterialService } from '../material/material.service';
import { SkyService } from '../world/sky.service';
import { AtmosphereService } from '../world/atmosphere.service';
import { CelestialService } from '../world/celestial.service';
import { ShaderRegistryService } from '../shaders/shader-registry.service';
import { AssetManagerService } from '../core/asset-manager.service';
import { MathUtils } from '../utils/math-utils.service';
import { TerrainGenerationOptions, BiomeType, ErosionType } from '../world/terrain-generator.models';

// Import shader code
import { vertexShader as skyVertexShader } from '../shaders/enhancedSky.vertex';
import { fragmentShader as skyFragmentShader } from '../shaders/enhancedSky.fragment';

@Injectable()
export class Scene001 extends BaseScene {
    // Asset paths
    private terrainPath = '/assets/materials/terrain/rocky-rugged-terrain_1/';

    constructor(
        engineService: EngineService,
        private timeService: TimeService,
        private celestialService: CelestialService,
        private cameraService: CameraService,
        private terrainService: TerrainService,
        private terrainGenerator: TerrainGeneratorService,
        private materialService: MaterialService,
        private skyService: SkyService,
        private lightService: LightService,
        private atmosphereService: AtmosphereService,
        private shaderRegistry: ShaderRegistryService,
        private assetManager: AssetManagerService,
        private mathUtils: MathUtils
    ) {
        super(engineService);
    }

    async init(canvas: HTMLCanvasElement): Promise<Scene> {
        console.log('Scene001: Initializing scene');
        this.scene = new Scene(this.engine);

        // Register shaders first (doesn't rely on assets)
        this.registerShaders();

        // Set up camera and lighting (don't depend on assets)
        this.setupCamera(canvas);
        this.setupLighting();

        // Preload terrain textures
        await this.preloadAssets();

        // Set up scene elements that need assets
        await this.setupTerrain();
        this.setupSky();

        return this.scene;
    }

    private registerShaders(): void {
        this.shaderRegistry.registerShader(
            'enhancedSky',
            skyVertexShader,
            skyFragmentShader
        );
    }

    private setupCamera(canvas: HTMLCanvasElement): void {
        this.cameraService.createArcRotateCamera(this.scene, canvas, {
            name: 'Camera001',
            target: new Vector3(0, 5, 0), // Adjusted to point at terrain center
            radius: 60, // Increased radius to see more of the terrain
            beta: Math.PI / 3.5, // Adjusted for better viewing angle
        });

        if (this.scene.activeCamera) {
            this.scene.activeCamera.minZ = 0.1;
            this.scene.activeCamera.maxZ = 1500;
        }
    }

    private setupLighting(): void {
        this.lightService.createLights(this.scene);
        this.scene.clearColor.set(0, 0, 0, 1);
    }

    private async preloadAssets(): Promise<void> {
        // Define textures to preload
        const texturesToPreload = [
            `${this.terrainPath}albedo.png`,
            `${this.terrainPath}normalHeight.png`,
            `${this.terrainPath}ao.png`,
            `${this.terrainPath}metalRough.png`
        ];

        // Preload all textures
        await this.assetManager.preloadTextures(texturesToPreload, this.scene);
    }

    private async setupTerrain(): Promise<void> {
        // Create material using our asset manager
        const terrainMaterial = this.materialService.createGroundMaterial(
            this.terrainPath,
            3,
            this.scene
        );

        // Define terrain generation options
        const terrainOptions: TerrainGenerationOptions = {
            width: 100,
            depth: 100,
            resolution: 128,
            minHeight: 0,
            maxHeight: 15,
            noiseOptions: {
                scale: 50,
                octaves: 5,
                persistence: 0.5,
                lacunarity: 2.0,
                seed: 42
            },
            smooth: true,
            smoothIterations: 2,
            name: 'proceduralTerrain'
        };

        // Generate terrain
        const terrain = this.terrainGenerator.generateTerrain(this.scene, terrainOptions);

        // Apply material
        terrain.material = terrainMaterial;
        terrain.receiveShadows = true;

        // Add mountain feature
        this.terrainGenerator.generateMountains(terrain, {
            position: { x: 15, z: -15 },
            radius: 25,
            height: 20,
            roughness: 0.7,
            steepness: 0.6
        });

        // Add river
        this.terrainGenerator.generateRiver(terrain, {
            start: { x: -40, z: -40 },
            end: { x: 30, z: 30 },
            width: 3,
            depth: 2,
            meandering: 0.5
        });

        // Apply some erosion
        this.terrainGenerator.applyErosion(terrain, {
            iterations: 1000,
            strength: 0.2,
            type: ErosionType.Thermal
        });

        // Register the terrain for shadow casting
        this.lightService.addShadowCaster(terrain);
    }

    private setupSky(): void {
        this.skyService.createSky(this.scene);
        this.atmosphereService.setup(this.scene);
    }

    update(deltaTime: number): void {
        if (this.timeService.isPaused()) return;

        this.timeService.update(deltaTime);
        this.celestialService.updateTimeState();
        this.lightService.update();
        this.skyService.update();
        this.atmosphereService.update(this.scene);
    }

    dispose(): void {
        if (this.scene) {
            // Let the AssetManager know we're disposing this scene
            this.assetManager.handleSceneDisposal(this.scene);
            this.scene.dispose();
        }
    }
}