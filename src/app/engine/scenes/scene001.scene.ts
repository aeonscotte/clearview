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
import { WeatherService } from '../world/weather.service';
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
    private atmosphereService = new AtmosphereService(this.timeService, this.celestialService);
    private weatherService = new WeatherService(this.timeService, this.atmosphereService);

    async init(canvas: HTMLCanvasElement): Promise<Scene> {
        this.scene = new Scene(this.engine);
        this.setupCamera(canvas);
        this.setupLighting();
        this.setupTerrain();
        this.setupSky();
        this.setupWeather();


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

        // Create a debug cube above the ground
        const debugCube = MeshBuilder.CreateBox('debugCube', { size: 1 }, this.scene);
        debugCube.position = new Vector3(0, 1, 0);
        debugCube.material = ground.material;

        // Enable shadow casting for the debug cube
        this.lightService.addShadowCaster(debugCube);
        // this.lightService.addShadowCaster(ground);
    }

    private setupSky(): void {
        this.celestialService.debugCelestialPositions();
        this.skyService.createSky(this.scene);
        this.atmosphereService.setup(this.scene);
    }

    private setupWeather(): void {
        this.weatherService.setup(this.scene);
        this.weatherService.setWeather('clear');
    }

    update(deltaTime: number): void {
        // Update time first
        this.timeService.update();
        
        // Then update all sky-related services in the correct order
        // The celestial service calculations happen internally when other services call it
        this.skyService.update();
        this.lightService.update();
        this.atmosphereService.update(this.scene);
        this.weatherService.update(this.scene);

        // Debugging celestial positions
        console.log(this.timeService.getWorldTime().toFixed(2), 'h');
       
    }

    dispose(): void {
        this.weatherService.dispose();
        this.scene.dispose();
    }
}