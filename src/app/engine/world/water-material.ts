import { ShaderMaterial, Color3, Scene } from '@babylonjs/core';
import { vertexShader } from '../shaders/water.vertex';
import { fragmentShader } from '../shaders/water.fragment';

export interface WaterMaterialOptions {
    waterColor?: Color3;
    foamColor?: Color3;
    amplitude?: number;
    wavelength?: number;
    speed?: number;
    foamThreshold?: number;
}

export class WaterMaterial extends ShaderMaterial {
    private _time = 0;

    constructor(scene: Scene, options: WaterMaterialOptions = {}) {
        super('waterMaterial', scene, {
            vertexSource: vertexShader,
            fragmentSource: fragmentShader
        }, {
            attributes: ['position', 'uv'],
            uniforms: ['worldViewProjection', 'time', 'amplitude', 'wavelength', 'speed', 'foamThreshold', 'lod', 'waterColor', 'foamColor'],
            needAlphaBlending: false
        });

        this.setColor3('waterColor', options.waterColor ?? new Color3(0.1, 0.4, 0.6));
        this.setColor3('foamColor', options.foamColor ?? new Color3(1, 1, 1));
        this.setFloat('amplitude', options.amplitude ?? 0.2);
        this.setFloat('wavelength', options.wavelength ?? 4.0);
        this.setFloat('speed', options.speed ?? 1.0);
        this.setFloat('foamThreshold', options.foamThreshold ?? 0.2);
        this.setFloat('lod', 0);

        scene.onBeforeRenderObservable.add(() => {
            this._time += scene.getEngine().getDeltaTime() * 0.001;
            this.setFloat('time', this._time);
        });
    }
}
