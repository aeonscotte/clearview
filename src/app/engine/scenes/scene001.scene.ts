import { BaseScene } from '../base/scene';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CameraService } from '../player/camera.service';
import { LightService } from '../world/light.service';
import { TerrainService } from '../world/terrain.service';
import { MaterialService } from '../material/material.service';
import '@babylonjs/core/Helpers/sceneHelpers';



export class Scene001 extends BaseScene {
    private cameraService = new CameraService();
    private lightService = new LightService();
    private terrainService = new TerrainService();
    private materialService = new MaterialService();


    async init(canvas: HTMLCanvasElement): Promise<Scene> {
        this.scene = new Scene(this.engine);
        this.setupCamera(canvas);
        this.setupLighting();
        this.setupTerrain();
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
        this.lightService.createHemisphericLight(this.scene, {
            name: 'Light001',
            direction: new Vector3(0, 1, 0),
            intensity: 10
        });

        // this.scene.createDefaultLight(true);
        // this.scene.clearColor.set(0, 0, 0, 0); // optional: transparent background

        // const environment = this.scene.createDefaultEnvironment({
        //     createGround: false,
        //     createSkybox: true,
        //     skyboxSize: 100,
        // });

        // if (environment?.skybox && this.scene.environmentTexture) {
        //     this.scene.environmentIntensity = 1.0; // Adjust for PBR brightness
        // }
    }

    private setupTerrain(): void {
        const ground = this.terrainService.createGround(this.scene, {
            width: 20,
            height: 20,
            subdivisions: 4,
        });

        ground.material = this.materialService.createGroundMaterial(
            '/assets/materials/terrain/rocky-rugged-terrain/',
            2
        );

    }


    update(deltaTime: number): void {
        // 🎮 Per-frame logic here

    }

    dispose(): void {
        this.scene.dispose();
    }
}
