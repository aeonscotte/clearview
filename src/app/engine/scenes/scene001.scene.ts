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
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';

export class Scene001 extends BaseScene {
    private timeService = new TimeService();
    private celestialService = new CelestialService(this.timeService);
    private cameraService = new CameraService();
    private terrainService = new TerrainService();
    private materialService = new MaterialService();
    private skyService = new SkyService(this.timeService, this.celestialService);
    private lightService = new LightService(this.timeService, this.celestialService);
    private atmosphereService = new AtmosphereService(this.timeService, this.celestialService, this.lightService);

    async init(canvas: HTMLCanvasElement): Promise<Scene> {
        this.scene = new Scene(this.engine);
        this.setupCamera(canvas);
        this.setupLighting();
        this.setupTerrain();
        this.setupSky();

        return this.scene;
    }

    private setupCamera(canvas: HTMLCanvasElement): void {
        this.cameraService.createArcRotateCamera(this.scene, canvas, {
            name: 'Camera001',
            target: new Vector3(0, 1, 0),
            radius: 8,
        });
        
        // Ensure proper view of sky dome
        if (this.scene.activeCamera) {
            this.scene.activeCamera.minZ = 0.1;  // Close near plane
            this.scene.activeCamera.maxZ = 1500; // Far enough to see the sky dome
        }
    }

    private setupLighting(): void {
        this.lightService.createLights(this.scene);
        this.scene.clearColor.set(0, 0, 0, 1); // Black background
    }

    private setupTerrain(): void {
        const ground = this.terrainService.createGround(this.scene, {
            width: 60,
            height: 60,
            subdivisions: 4,
        });

        ground.material = this.materialService.createGroundMaterial(
            '/assets/materials/terrain/rocky-rugged-terrain_1/',
            3
        );

        ground.receiveShadows = true;

        // Create a debug sphere above the ground
        const debugSphere = MeshBuilder.CreateSphere('debugSphere', { diameter: 1 }, this.scene);
        debugSphere.position = new Vector3(0, 1, 0);
        debugSphere.material = ground.material;

        // Enable shadow casting for the debug sphere
        this.lightService.addShadowCaster(debugSphere);
    }

    private setupSky(): void {
        // this.celestialService.debugCelestialPositions();
        this.skyService.createSky(this.scene);
        this.atmosphereService.setup(this.scene);
    }

    update(deltaTime: number): void {
        // Update time first
        this.timeService.update();
        
        // Then update all sky-related services in the correct order
        // 1. Celestial positions first (used by all other services)
        // 2. Light service (calculates sky colors)
        // 3. Sky service (uses light information)
        // 4. Atmosphere service (uses light information for fog)
        this.lightService.update();
        this.skyService.update();
        this.atmosphereService.update(this.scene);

        // Debugging celestial positions
        // console.log(this.timeService.getWorldTime().toFixed(2), 'h');
       
    }

    dispose(): void {
        this.scene.dispose();
    }
}