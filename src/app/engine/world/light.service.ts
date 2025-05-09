// src/app/engine/world/light.service.ts
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';

export interface LightOptions {
    name?: string;
    direction?: Vector3;
    intensity?: number;
}

export class LightService {
    createHemisphericLight(scene: Scene, options: LightOptions = {}): HemisphericLight {
        const {
            name = 'HemisphericLight',
            direction = new Vector3(0, 1, 0),
            intensity = 1.0,
        } = options;

        const light = new HemisphericLight(name, direction, scene);
        light.intensity = intensity;
        return light;
    }
}
