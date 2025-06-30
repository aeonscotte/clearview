// src/app/engine/scenes/scene001.scene.ts
import { Injectable } from '@angular/core';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { BaseScene } from '../base/scene';
import { EngineService } from '../core/engine.service';
import { TimeService } from '../physics/time.service';
import { CameraService } from '../player/camera.service';
import { LightService } from '../world/light.service';
import { TerrainService } from '../world/terrain.service';
import { PhysicsService } from '../physics/physics.service';
import { PlayerService } from '../player/player.service';
import { MaterialService } from '../material/material.service';
import { SkyService } from '../world/sky.service';
import { AtmosphereService } from '../world/atmosphere.service';
import { CelestialService } from '../world/celestial.service';
import { ShaderRegistryService } from '../shaders/shader-registry.service';
import { AssetManagerService } from '../core/asset-manager.service';
import { MathUtils } from '../utils/math-utils.service';
import { GroundMesh } from '@babylonjs/core';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { PhysicsImpostor } from '@babylonjs/core/Physics/physicsImpostor';

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
        // private cameraService: CameraService,
        private terrainService: TerrainService,
        private materialService: MaterialService,
        private skyService: SkyService,
        private lightService: LightService,
        private atmosphereService: AtmosphereService,
        private shaderRegistry: ShaderRegistryService,
        private assetManager: AssetManagerService,
        // private mathUtils: MathUtils,
        private physicsService: PhysicsService,
        private playerService: PlayerService,
    ) {
        super(engineService);
    }

    async init(canvas: HTMLCanvasElement): Promise<Scene> {
        console.log('Scene001: Initializing scene');
        this.scene = new Scene(this.engine);

        // Register shaders first (doesn't rely on assets)
        this.registerShaders();

        // Set up camera and lighting (don't depend on assets)
        // this.setupCamera(canvas);
        this.setupLighting();

        // Initialize player and physics
        await this.physicsService.enablePhysics(this.scene);

        // Preload terrain textures
        await this.preloadAssets();

        // Set up scene elements that need assets
        await this.setupTerrain();

        this.setupSky();

        // Initialize player (after terrain is ready)
        this.playerService.init(this.scene); 

        return this.scene;
    }

    private registerShaders(): void {
        this.shaderRegistry.registerShader(
            'enhancedSky',
            skyVertexShader,
            skyFragmentShader
        );
    }

    // private setupCamera(canvas: HTMLCanvasElement): void {
    //     this.cameraService.createArcRotateCamera(this.scene, canvas, {
    //         name: 'Camera001',
    //         target: new Vector3(0, 1, 0),
    //         radius: 8,
    //     });

    //     if (this.scene.activeCamera) {
    //         this.scene.activeCamera.minZ = 0.1;
    //         this.scene.activeCamera.maxZ = 1500;
    //     }
    // }

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
        return new Promise<void>((resolve) => {
            // Add a flat ground for debugging
            const flatGround = MeshBuilder.CreateGround('flatGround', { width: 4096, height: 4096 }, this.scene);
            flatGround.position = new Vector3(0, -19.99, 0);
            flatGround.material = new StandardMaterial('flatGroundMat', this.scene);
            flatGround.material.alpha = 0.3; // Make it semi-transparent
            flatGround.material.alpha = 0.3; // Make it semi-transparent
            (flatGround.material as StandardMaterial).diffuseColor.set(0.1, 0.3, 0.7); // Water-like blue
            this.physicsService.addImpostor(flatGround, PhysicsImpostor.BoxImpostor, { mass: 0, friction: 0.8 });
            console.log('Flat ground impostor:', flatGround.physicsImpostor?.type);

            // Add a PLane that uses the water shader
            // const waterPlane = MeshBuilder.CreateGround('waterPlane', { width: 4096, height: 4096 }, this.scene);
            // waterPlane.position = new Vector3(0, -19.99, 0);
            // const waterMaterial = this.materialService.createWaterMaterial(this.scene);
            // waterPlane.material = waterMaterial;

            // Add a test box above the ground
            const testBox = MeshBuilder.CreateBox('testBox', { size: 4 }, this.scene);
            testBox.position = new Vector3(10, 20, 0);
            testBox.material = new StandardMaterial('testBoxMat', this.scene);
            this.physicsService.addImpostor(testBox, PhysicsImpostor.BoxImpostor, { mass: 1, friction: 0.5 });
            console.log('Test box impostor:', testBox.physicsImpostor?.type);

            // Heightmap terrain as before
            const ground = this.terrainService.createHeightMap(this.scene, {
                name: 'Terrain001',
                url: '/assets/terrain/heightmap_gaea.png',
                width: 1024,
                height: 1024,
                subdivisions: 1024,
                minHeight: 0,
                maxHeight: 32
            }, (ground) => {
                ground.position = new Vector3(0, -20, 0);

                const material = this.materialService.createGroundMaterial(
                    this.terrainPath,
                    1024, // original material scale
                    this.scene
                );
                ground.material = material;
                ground.receiveShadows = true;

                this.physicsService.addHeightmapImpostor(ground as GroundMesh, { mass: 0, friction: 0.8 });
                console.log('Heightmap impostor:', (ground as any).physicsImpostor?.type);

                // const debugSphere = MeshBuilder.CreateSphere('debugSphere', { diameter: 2 }, this.scene);
                // debugSphere.position = new Vector3(0, 2, 0);
                // debugSphere.material = material;
                // this.lightService.addShadowCaster(debugSphere);

                resolve();
            });
        });
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