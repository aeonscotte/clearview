// src/app/engine/world/campfire.ts
import { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder, Mesh } from '@babylonjs/core/Meshes';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TimeService } from '../physics/time.service';
import { MaterialService } from '../material/material.service';

export class Campfire {
    private static sharedTexture: Texture | null = null;
    private static readonly FIRE_TEXTURE_URL = 'https://playground.babylonjs.com/textures/flare.png';
    private static readonly FIRE_MIN_EMIT_BOX = new Vector3(-0.05, 0.15, -0.05);
    private static readonly FIRE_MAX_EMIT_BOX = new Vector3(0.05, 0.15, 0.05);
    private static readonly SMOKE_MIN_EMIT_BOX = new Vector3(-0.03, 0.22, -0.03);
    private static readonly SMOKE_MAX_EMIT_BOX = new Vector3(0.03, 0.22, 0.03);
    private static readonly FIRE_DIRECTION1 = new Vector3(0, 0.5, 0);
    private static readonly FIRE_DIRECTION2 = new Vector3(0, 0.8, 0);
    private static readonly SMOKE_DIRECTION1 = new Vector3(-0.05, 0.9, -0.05);
    private static readonly SMOKE_DIRECTION2 = new Vector3(0.05, 1.1, 0.05);
    private static readonly ZERO_GRAVITY = new Vector3(0, 0, 0);

    // Shared materials and textures
    private static barkMaterial: PBRMaterial | null = null;
    private static ringMaterial: StandardMaterial | null = null;

    private root: TransformNode;
    private logs: TransformNode[] = [];
    private fireLight!: PointLight;
    private fire!: ParticleSystem;
    private smoke!: ParticleSystem;

    private readonly fireSpeed = 0.01;
    private readonly smokeSpeed = 0.01;

    constructor(
        private scene: Scene,
        position: Vector3,
        private timeService: TimeService,
        private materialService: MaterialService,
    ) {
        this.root = new TransformNode('campfireRoot', scene);
        this.root.position.copyFrom(position);

        this.createLogs();
        this.createLight();
        this.createParticles();

        this.scene.onBeforeRenderObservable.add(() => this.update());
    }

    private createLogs(): void {
        // Bark material shared across all campfires
        if (!Campfire.barkMaterial) {
            const barkPath = '/assets/materials/nature/bark_willow/';
            Campfire.barkMaterial = this.materialService.createPbrMaterial(
                'willow-bark',
                {
                    albedo: `${barkPath}bark_willow_diff_1k.jpg`,
                    ao: `${barkPath}bark_willow_ao_1k.jpg`,
                    metalRough: `${barkPath}bark_willow_arm_1k.jpg`,
                },
                this.scene,
                1,
            );
        }

        // Simple solid color material for log ends
        if (!Campfire.ringMaterial) {
            Campfire.ringMaterial = new StandardMaterial('logRingMat', this.scene);
            Campfire.ringMaterial.diffuseColor = new Color3(0.89, 0.77, 0.55);
            Campfire.ringMaterial.specularColor = Color3.Black();
        }

        const barkMat = Campfire.barkMaterial!;
        const ringMat = Campfire.ringMaterial!;

        const R = 0.05;
        const sqrt3over2 = Math.sqrt(3) / 2;
        const tiltDeg = 70;

        const logPositions = [
            { x: 0, z: R },
            { x: -sqrt3over2 * R, z: -0.5 * R },
            { x: sqrt3over2 * R, z: -0.5 * R }
        ];

        logPositions.forEach((pos, i) => {
            const log = new TransformNode(`log${i}_root`, this.scene);

            const side = MeshBuilder.CreateCylinder(`log${i}_side`, { diameter: 0.05, height: 0.3, cap: Mesh.NO_CAP }, this.scene);
            side.material = barkMat;
            side.parent = log;

            const discOpts = { radius: 0.025, tessellation: 24 };
            const top = MeshBuilder.CreateDisc(`log${i}_top`, discOpts, this.scene);
            top.material = ringMat;
            top.position.y = 0.15;
            top.rotation.x = Math.PI / 2;
            top.parent = log;

            const bottom = MeshBuilder.CreateDisc(`log${i}_bottom`, discOpts, this.scene);
            bottom.material = ringMat;
            bottom.position.y = -0.15;
            bottom.rotation.x = -Math.PI / 2;
            bottom.parent = log;

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
        if (!Campfire.sharedTexture) {
            Campfire.sharedTexture = new Texture(Campfire.FIRE_TEXTURE_URL, this.scene);
        }
        this.fire.particleTexture = Campfire.sharedTexture;
        this.fire.emitter = this.root as any;
        this.fire.minEmitBox = Campfire.FIRE_MIN_EMIT_BOX;
        this.fire.maxEmitBox = Campfire.FIRE_MAX_EMIT_BOX;
        this.fire.color1 = new Color4(1, 0.77, 0, 0.4);
        this.fire.color2 = new Color4(1, 0.3, 0, 0.3);
        this.fire.colorDead = new Color4(0.2, 0, 0, 0.0);
        this.fire.minSize = 0.07;
        this.fire.maxSize = 0.15;
        this.fire.minLifeTime = 0.3;
        this.fire.maxLifeTime = 0.8;
        this.fire.emitRate = 80;
        this.fire.blendMode = ParticleSystem.BLENDMODE_ONEONE;
        this.fire.direction1 = Campfire.FIRE_DIRECTION1;
        this.fire.direction2 = Campfire.FIRE_DIRECTION2;
        this.fire.gravity = Campfire.ZERO_GRAVITY;
        this.fire.minAngularSpeed = 0;
        this.fire.maxAngularSpeed = Math.PI;
        this.fire.minEmitPower = 0.4;
        this.fire.maxEmitPower = 0.6;
        this.fire.updateSpeed = this.fireSpeed;
        this.fire.start();

        this.smoke = new ParticleSystem('smoke', 50, this.scene);
        this.smoke.particleTexture = Campfire.sharedTexture!;
        this.smoke.particleTexture.hasAlpha = true;
        this.smoke.emitter = this.root as any;
        this.smoke.minEmitBox = Campfire.SMOKE_MIN_EMIT_BOX;
        this.smoke.maxEmitBox = Campfire.SMOKE_MAX_EMIT_BOX;
        this.smoke.color1 = new Color4(0.2, 0.2, 0.2, 0.1);
        this.smoke.color2 = new Color4(0.1, 0.1, 0.1, 0.06);
        this.smoke.colorDead = new Color4(0, 0, 0, 0.0);
        this.smoke.minSize = 0.08;
        this.smoke.maxSize = 0.15;
        this.smoke.minLifeTime = 1;
        this.smoke.maxLifeTime = 2.5;
        this.smoke.emitRate = 100;
        this.smoke.blendMode = ParticleSystem.BLENDMODE_ONEONE;
        this.smoke.direction1 = Campfire.SMOKE_DIRECTION1;
        this.smoke.direction2 = Campfire.SMOKE_DIRECTION2;
        this.smoke.gravity = Campfire.ZERO_GRAVITY;
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
