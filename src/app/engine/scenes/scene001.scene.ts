import { BaseScene } from '../base/scene';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CameraService } from '../player/camera.service';
import { LightService } from '../world/light.service';
import { TerrainService } from '../world/terrain.service';


export class Scene001 extends BaseScene {
    private cameraService = new CameraService();
    private lightService = new LightService();
    private terrainService = new TerrainService();


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
        });
    }

    private setupTerrain(): void {
        this.terrainService.createGround(this.scene, {
            width: 60,
            height: 60,
            subdivisions: 4,
        });

        // Optional: to test heightmap or box
        // this.terrainService.createHeightMap(this.scene, {
        //     url: 'assets/heightmaps/my-map.png',
        //     colorTextureUrl: 'assets/textures/grass.jpg',
        // });
        // this.terrainService.createBox(this.scene, { size: 4 });
    }


    update(deltaTime: number): void {
        // 🎮 Per-frame logic here

    }

    dispose(): void {
        this.scene.dispose();
    }
}
