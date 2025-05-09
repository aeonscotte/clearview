// src/app/engine/player/camera.service.ts
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

export interface CameraOptions {
    name?: string;
    alpha?: number;
    beta?: number;
    radius?: number;
    target?: Vector3;
}

export class CameraService {
    createArcRotateCamera(scene: Scene, canvas: HTMLCanvasElement, options: CameraOptions = {}): ArcRotateCamera {
        const {
            name = 'ArcRotateCamera',
            alpha = Math.PI / 2,
            beta = Math.PI / 3,
            radius = 8,
            target = new Vector3(0, 1, 0),
        } = options;

        const camera = new ArcRotateCamera(name, alpha, beta, radius, target, scene);
        camera.attachControl(canvas, true);
        return camera;
    }
}
