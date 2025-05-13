import { Injectable } from '@angular/core';
import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder, ShaderMaterial, Vector3, Mesh, Effect } from '@babylonjs/core';
import { TimeService } from '../physics/time.service';

@Injectable({
  providedIn: 'root'
})

export class SkyService {
    private skyDome: Mesh | null = null;
    private skyMaterial: ShaderMaterial | null = null;

    constructor(private timeService: TimeService) {}

    createSky(scene: Scene): void {
        this.registerShaders();

        this.skyDome = MeshBuilder.CreateSphere('skyDome', {
            diameter: 1000,
            sideOrientation: Mesh.BACKSIDE
        }, scene);

        this.skyMaterial = new ShaderMaterial("skyShader", scene, {
            vertex: "dayNight",
            fragment: "dayNight"
        }, {
            attributes: ["position"],
            uniforms: ["worldViewProjection", "iTime"]
        });

        this.skyDome.material = this.skyMaterial;
    }

    update(): void {
        if (this.skyMaterial) {
            this.timeService.update();
            const fakeTime = this.timeService.getWorldTime();
            this.skyMaterial.setFloat("iTime", fakeTime);
        }
    }

    private registerShaders(): void {
        Effect.ShadersStore["dayNightVertexShader"] = `
            precision highp float;
            attribute vec3 position;
            uniform mat4 worldViewProjection;
            varying vec3 vPosition;
            void main(void) {
                vPosition = position;
                gl_Position = worldViewProjection * vec4(position, 1.0);
            }
        `;

        Effect.ShadersStore["dayNightFragmentShader"] = `
            precision highp float;
            uniform float iTime;
            varying vec3 vPosition;

            vec3 getSkyColor(float t) {
                float time = mod(t, 24.0) / 24.0;
                float sunFactor = clamp(sin(time * 3.14159 * 2.0), 0.0, 1.0);
                vec3 dayColor = vec3(0.529, 0.808, 0.922);
                vec3 nightColor = vec3(0.02, 0.02, 0.1);
                return mix(nightColor, dayColor, sunFactor);
            }

            void main(void) {
                gl_FragColor = vec4(getSkyColor(iTime), 1.0);
            }
        `;
    }
}
