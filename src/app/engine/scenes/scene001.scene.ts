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
import { Angle, Color3, Color4, GroundMesh, ParticleSystem, PointLight, Texture } from '@babylonjs/core';
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

        // Intialize player (after terrain is ready)
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
            const flatGround = MeshBuilder.CreateGround('flatGround', { width: 1009, height: 1009 }, this.scene);
            flatGround.position = new Vector3(0, -9, 0);
            flatGround.material = new StandardMaterial('flatGroundMat', this.scene);
            flatGround.material.alpha = 0.3; // Make it semi-transparent
            this.physicsService.addImpostor(flatGround, PhysicsImpostor.BoxImpostor, { mass: 0, friction: 0.8 });
            console.log('Flat ground impostor:', flatGround.physicsImpostor?.type);

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
                width: 1009,
                height: 1009,
                subdivisions: 1009,
                minHeight: 0,
                maxHeight: 32
            }, (ground) => {
                ground.position = new Vector3(0, -10, 0);

                const material = this.materialService.createGroundMaterial(
                    this.terrainPath,
                    1009,
                    this.scene
                );
                ground.material = material;
                ground.receiveShadows = true;

                this.physicsService.addHeightmapImpostor(ground as GroundMesh, { mass: 0, friction: 0.8 });
                console.log('Heightmap impostor:', (ground as any).physicsImpostor?.type);

                resolve();
            });

            // Add campfire for testing
            const fireHeight = 9.5;
            // Log Material
            const logMaterial = new StandardMaterial("logMat", this.scene);
            logMaterial.diffuseColor = new Color3(0.81, 0.49, 0.16);
            logMaterial.roughness = 1;
            logMaterial.specularColor = Color3.Black();

            // Logs - placed in equilateral triangle layout
            const R = 0.05;
            const sqrt3over2 = Math.sqrt(3) / 2;
            const tiltDeg = 70;

            // Equilateral triangle vertices (logs) centered on (0, 0)
            const logPositions = [
                { x: 0, z: R },
                { x: -sqrt3over2 * R, z: -0.5 * R },
                { x: sqrt3over2 * R, z: -0.5 * R }
            ];
        
            logPositions.forEach((pos, i) => {
                const log = MeshBuilder.CreateCylinder(`log${i}`, { diameter: 0.05, height: 0.3 }, this.scene);
                log.material = logMaterial;
            
                log.position.set(pos.x, fireHeight + 0.1, pos.z);
            
                // Make the log face the center
                const angleToCenter = Math.atan2(-pos.x, -pos.z); // Y rotation
                log.rotation.y = angleToCenter;
            
                // Lean inward
                log.rotation.z = Angle.FromDegrees(tiltDeg).radians();
            });
        
            // Fire Light (centered)
            const fireLight = new PointLight("fireLight", new Vector3(0, fireHeight + 0.2, 0), this.scene);
            fireLight.diffuse = new Color3(1.0, 0.5, 0.2);
            fireLight.intensity = 2;
            fireLight.range = 2;
        
            this.scene.onBeforeRenderObservable.add(() => {
                const time = performance.now() * 0.002;
                fireLight.intensity = 1.8 + Math.sin(time * 8) * 0.3 + Math.random() * 0.2;
            });
        
            // Fire Particles
            const fire = new ParticleSystem("fire", 100, this.scene);
            fire.particleTexture = new Texture("https://playground.babylonjs.com/textures/flare.png", this.scene);
            fire.emitter = new Vector3(0, fireHeight + 0.13, 0);
            fire.minEmitBox = new Vector3(-0.05, 0, -0.05);
            fire.maxEmitBox = new Vector3(0.05, 0, 0.05);
            fire.color1 = new Color4(1, 0.77, 0, 0.4);
            fire.color2 = new Color4(1, 0.3, 0, 0.3);
            fire.colorDead = new Color4(0.2, 0, 0, 0.0);
            fire.minSize = 0.07;
            fire.maxSize = 0.15;
            fire.minLifeTime = 0.3;
            fire.maxLifeTime = 0.8;
            fire.emitRate = 80;
            fire.blendMode = ParticleSystem.BLENDMODE_ONEONE;
            fire.direction1 = new Vector3(0, 0.5, 0);
            fire.direction2 = new Vector3(0, 0.8, 0);
            fire.gravity = new Vector3(0, 0, 0);
            fire.minAngularSpeed = 0;
            fire.maxAngularSpeed = Math.PI;
            fire.minEmitPower = 0.4;
            fire.maxEmitPower = 0.6;
            fire.updateSpeed = 0.01;
            fire.start();
        
            // Smoke Particles
            const smoke = new ParticleSystem("smoke", 50, this.scene);
            smoke.particleTexture = new Texture("https://playground.babylonjs.com/textures/flare.png", this.scene);
            smoke.particleTexture.hasAlpha = true;
            smoke.emitter = new Vector3(0, fireHeight + 0.2, 0);
            smoke.minEmitBox = new Vector3(-0.03, 0, -0.03);
            smoke.maxEmitBox = new Vector3(0.03, 0, 0.03);
            smoke.color1 = new Color4(0.2, 0.2, 0.2, 0.1);
            smoke.color2 = new Color4(0.1, 0.1, 0.1, 0.06);
            smoke.colorDead = new Color4(0, 0, 0, 0.0);
            smoke.minSize = 0.08;
            smoke.maxSize = 0.15;
            smoke.minLifeTime = 1;
            smoke.maxLifeTime = 2.5;
            smoke.emitRate = 100;
            smoke.blendMode = ParticleSystem.BLENDMODE_ONEONE;
            smoke.direction1 = new Vector3(-0.05, 0.9, -0.05);
            smoke.direction2 = new Vector3(0.05, 1.1, 0.05);
            smoke.gravity = new Vector3(0, 0, 0);
            smoke.minAngularSpeed = 0;
            smoke.maxAngularSpeed = 0.3;
            smoke.minEmitPower = 0.2;
            smoke.maxEmitPower = 0.4;
            smoke.updateSpeed = 0.01;
            smoke.start();
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