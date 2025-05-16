// src/app/engine/scenes/scene001.scene.ts
import { BaseScene } from '../base/scene';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TimeService } from '../physics/time.service';
import { CameraService } from '../player/camera.service';
import { LightService } from '../world/light.service';
import { TerrainService } from '../world/terrain.service';
import { MaterialService } from '../material/material.service';
import { SkyService } from '../world/sky.service';
import { AtmosphereService } from '../world/atmosphere.service';
import { CelestialService } from '../world/celestial.service';
import { ShaderRegistryService } from '../shaders/shader-registry.service';
import { MathUtils } from '../utils/math-utils.service';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Injectable } from '@angular/core';
import { EngineService } from '../core/engine.service';

// Import shader code
import { vertexShader as skyVertexShader } from '../shaders/enhancedSky.vertex';
import { fragmentShader as skyFragmentShader } from '../shaders/enhancedSky.fragment';

@Injectable()
export class Scene001 extends BaseScene {
    constructor(
        private engineService: EngineService,
        private timeService: TimeService,
        private celestialService: CelestialService,
        private cameraService: CameraService,
        private terrainService: TerrainService,
        private materialService: MaterialService,
        private skyService: SkyService,
        private lightService: LightService,
        private atmosphereService: AtmosphereService,
        private shaderRegistry: ShaderRegistryService,
        private mathUtils: MathUtils
    ) {
        super(engineService);
    }

    async init(canvas: HTMLCanvasElement): Promise<Scene> {
        console.log('Scene001: Initializing scene');
        this.scene = new Scene(this.engineService.getEngine());

        this.registerShaders();
        this.setupCamera(canvas);
        this.setupLighting();
        this.setupTerrain();
        this.setupSky();

        return this.scene;
    }

    // Register all shaders needed for this scene
    private registerShaders(): void {
        console.log('Scene001: Registering shaders');

        const success = this.shaderRegistry.registerShader(
            'enhancedSky',
            skyVertexShader,
            skyFragmentShader
        );

        console.log('Sky shader registration successful:', success);
    }

    private setupCamera(canvas: HTMLCanvasElement): void {
        this.cameraService.createArcRotateCamera(this.scene, canvas, {
            name: 'Camera001',
            target: new Vector3(0, 1, 0),
            radius: 8,
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

    private setupTerrain(): void {
        const ground = this.terrainService.createGround(this.scene, {
            width: 60,
            height: 60,
            subdivisions: 4,
        });
    
        ground.material = this.materialService.createGroundMaterial(
            '/assets/materials/terrain/rocky-rugged-terrain_1/',
            3,
            this.scene  // Pass the scene here
        );
    
        ground.receiveShadows = true;
    
        const debugSphere = MeshBuilder.CreateSphere('debugSphere', { diameter: 1 }, this.scene);
        debugSphere.position = new Vector3(0, 1, 0);
        debugSphere.material = ground.material;
        this.lightService.addShadowCaster(debugSphere);
    }

    private setupSky(): void {
        this.skyService.createSky(this.scene);
        this.atmosphereService.setup(this.scene);
    }

    update(deltaTime: number): void {
        // When paused, do nothing at all - no updates
        if (this.timeService.isPaused()) {
            return;
        }

        // Only run updates when not paused
        this.timeService.update(deltaTime);
        this.celestialService.updateTimeState();
        this.lightService.update();
        this.skyService.update();
        this.atmosphereService.update(this.scene);
    }

    dispose(): void {
        this.scene.dispose();
    }
}