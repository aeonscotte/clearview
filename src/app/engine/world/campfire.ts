// src/app/engine/world/campfire.ts
import { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder, Mesh } from '@babylonjs/core/Meshes';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TimeService } from '../physics/time.service';

export class Campfire {
    private root: TransformNode;
    private logs: Mesh[] = [];
    private fireLight!: PointLight;
    private fire!: ParticleSystem;
    private smoke!: ParticleSystem;

    private readonly fireSpeed = 0.01;
    private readonly smokeSpeed = 0.01;

    constructor(private scene: Scene, position: Vector3, private timeService: TimeService) {
        this.root = new TransformNode('campfireRoot', scene);
        this.root.position.copyFrom(position);

        this.createLogs();
        this.createLight();
        this.createParticles();

        this.scene.onBeforeRenderObservable.add(() => this.update());
    }

    private createLogs(): void {
        const logMaterial = new StandardMaterial('logMat', this.scene);
        logMaterial.diffuseColor = new Color3(0.81, 0.49, 0.16);
        logMaterial.roughness = 1;
        logMaterial.specularColor = Color3.Black();

        const R = 0.05;
        const sqrt3over2 = Math.sqrt(3) / 2;
        const tiltDeg = 70;

        const logPositions = [
            { x: 0, z: R },
            { x: -sqrt3over2 * R, z: -0.5 * R },
            { x: sqrt3over2 * R, z: -0.5 * R }
        ];

        logPositions.forEach((pos, i) => {
            const log = MeshBuilder.CreateCylinder(`log${i}`, { diameter: 0.05, height: 0.3 }, this.scene);
            log.material = logMaterial;
            log.position.set(pos.x, 0.1, pos.z);
            log.parent = this.root;

            const angleToCenter = Math.atan2(-pos.x, -pos.z);
            log.rotation.y = angleToCenter;
            log.rotation.z = tiltDeg * Math.PI / 180;
            this.logs.push(log);
        });
    }

    private createLight(): void {
        this.fireLight = new PointLight('fireLight', new Vector3(0, 0.2, 0), this.scene);
        this.fireLight.diffuse = new Color3(1.0, 0.5, 0.2);
        this.fireLight.intensity = 2;
        this.fireLight.range = 2;
        this.fireLight.parent = this.root;
    }

    private createParticles(): void {
        this.fire = new ParticleSystem('fire', 100, this.scene);
        this.fire.particleTexture = new Texture('/assets/textures/flare.png', this.scene);
        this.fire.emitter = this.root as any;
        this.fire.minEmitBox = new Vector3(-0.05, 0, -0.05);
        this.fire.maxEmitBox = new Vector3(0.05, 0, 0.05);
        this.fire.color1 = new Color4(1, 0.77, 0, 0.4);
        this.fire.color2 = new Color4(1, 0.3, 0, 0.3);
        this.fire.colorDead = new Color4(0.2, 0, 0, 0.0);
        this.fire.minSize = 0.07;
        this.fire.maxSize = 0.15;
        this.fire.minLifeTime = 0.3;
        this.fire.maxLifeTime = 0.8;
        this.fire.emitRate = 80;
        this.fire.blendMode = ParticleSystem.BLENDMODE_ONEONE;
        this.fire.direction1 = new Vector3(0, 0.5, 0);
        this.fire.direction2 = new Vector3(0, 0.8, 0);
        this.fire.gravity = new Vector3(0, 0, 0);
        this.fire.minAngularSpeed = 0;
        this.fire.maxAngularSpeed = Math.PI;
        this.fire.minEmitPower = 0.4;
        this.fire.maxEmitPower = 0.6;
        this.fire.updateSpeed = this.fireSpeed;
        this.fire.start();

        this.smoke = new ParticleSystem('smoke', 50, this.scene);
        this.smoke.particleTexture = new Texture('/assets/textures/flare.png', this.scene);
        this.smoke.particleTexture.hasAlpha = true;
        this.smoke.emitter = this.root as any;
        this.smoke.minEmitBox = new Vector3(-0.03, 0.07, -0.03);
        this.smoke.maxEmitBox = new Vector3(0.03, 0.07, 0.03);
        this.smoke.color1 = new Color4(0.2, 0.2, 0.2, 0.1);
        this.smoke.color2 = new Color4(0.1, 0.1, 0.1, 0.06);
        this.smoke.colorDead = new Color4(0, 0, 0, 0.0);
        this.smoke.minSize = 0.08;
        this.smoke.maxSize = 0.15;
        this.smoke.minLifeTime = 1;
        this.smoke.maxLifeTime = 2.5;
        this.smoke.emitRate = 100;
        this.smoke.blendMode = ParticleSystem.BLENDMODE_ONEONE;
        this.smoke.direction1 = new Vector3(-0.05, 0.9, -0.05);
        this.smoke.direction2 = new Vector3(0.05, 1.1, 0.05);
        this.smoke.gravity = new Vector3(0, 0, 0);
        this.smoke.minAngularSpeed = 0;
        this.smoke.maxAngularSpeed = 0.3;
        this.smoke.minEmitPower = 0.2;
        this.smoke.maxEmitPower = 0.4;
        this.smoke.updateSpeed = this.smokeSpeed;
        this.smoke.start();
    }

    private update(): void {
        if (this.timeService.isPaused()) {
            this.fire.updateSpeed = 0;
            this.smoke.updateSpeed = 0;
            return;
        }

        this.fire.updateSpeed = this.fireSpeed;
        this.smoke.updateSpeed = this.smokeSpeed;

        const t = this.timeService.getElapsed();
        this.fireLight.intensity = 1.8 + Math.sin(t * 8) * 0.3 + Math.random() * 0.2;
    }

    setPosition(position: Vector3): void {
        this.root.position.copyFrom(position);
    }

    dispose(): void {
        this.fire.dispose();
        this.smoke.dispose();
        this.fireLight.dispose();
        this.logs.forEach(log => log.dispose());
        this.root.dispose();
    }
}
