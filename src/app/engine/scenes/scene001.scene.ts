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

export class Scene001 extends BaseScene {
    private timeService = new TimeService();
    private cameraService = new CameraService();
    private terrainService = new TerrainService();
    private materialService = new MaterialService();
    private skyService = new SkyService(this.timeService);
    private lightService = new LightService(this.timeService);
    private atmosphereService = new AtmosphereService(this.timeService);
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
    }

    private setupLighting(): void {
        this.lightService.createLights(this.scene);
        this.scene.clearColor.set(0, 0, 0, 0);
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
    }

    private setupSky(): void {
        this.skyService.createSky(this.scene);
        this.atmosphereService.setup(this.scene);
    }

    private setupWeather(): void {
        this.weatherService.setup(this.scene);
        
        // Start with clear weather by default
        // You can set initial weather here or call setWeather from UI controls
        // In your scene, after initialization:
        // this.weatherService.setWeather('rain', 0.7); // Medium-heavy rain
        // or
        // this.weatherService.setWeather('snow', 0.5); // Medium snowfall
        // or
        this.weatherService.setWeather('fog', 0.8); // Heavy fog
        // or
        // this.weatherService.setWeather('clear'); // Clear weather
    }

    update(deltaTime: number): void {
        // 🎮 Per-frame logic here
        this.timeService.update();
        // console.log('World Time:', this.timeService.getWorldTime());
        this.skyService.update();
        this.lightService.update();
        this.atmosphereService.update(this.scene);
        this.weatherService.update(this.scene);
        
        // Optional: Uncomment to enable random weather changes
        // this.weatherService.randomizeWeather(0.0005); // 0.05% chance per frame
    }

    dispose(): void {
        this.weatherService.dispose();
        this.scene.dispose();
    }
}