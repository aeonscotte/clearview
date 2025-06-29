// src/app/engine/player/player.service.ts
import { Injectable } from '@angular/core';
import { Scene } from '@babylonjs/core/scene';
import { Mesh, MeshBuilder } from '@babylonjs/core/Meshes';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { FollowCamera } from '@babylonjs/core/Cameras/followCamera';
import { KeyboardEventTypes, KeyboardInfo } from '@babylonjs/core/Events/keyboardEvents';
import { PhysicsImpostor } from '@babylonjs/core/Physics/physicsImpostor';

@Injectable({ providedIn: 'root' })
export class PlayerService {
    private playerMesh!: Mesh;
    private camera!: FollowCamera;
    private inputMap: { [key: string]: boolean } = {};

    init(scene: Scene): void {
        this.createPlayer(scene);
        this.createCamera(scene);
        this.registerControls(scene);
    }

    private createPlayer(scene: Scene): void {
        const radius = 0.5;
        const height = 1.8;
        const sphereOffset = (height / 2) - radius;

        this.playerMesh = MeshBuilder.CreateSphere('player_root', { diameter: radius * 2 }, scene);
        this.playerMesh.isVisible = false;
        this.playerMesh.position = new Vector3(0, 20, 0);
        this.playerMesh.physicsImpostor = new PhysicsImpostor(
            this.playerMesh,
            PhysicsImpostor.SphereImpostor,
            { mass: 3, friction: 0.3, restitution: 0 },
            scene
        );

        const sphereBottom = MeshBuilder.CreateSphere('player_sphere_bottom', { diameter: radius * 2 }, scene);
        sphereBottom.position = new Vector3(0, -sphereOffset, 0);
        sphereBottom.parent = this.playerMesh;
        const sphereTop = MeshBuilder.CreateSphere('player_sphere_top', { diameter: radius * 2 }, scene);
        sphereTop.position = new Vector3(0, sphereOffset, 0);
        sphereTop.parent = this.playerMesh;
        const cylinder = MeshBuilder.CreateCylinder('player_cylinder', { height: height - 2 * radius, diameter: radius * 2 }, scene);
        cylinder.position = new Vector3(0, 0, 0);
        cylinder.parent = this.playerMesh;
    }

    private createCamera(scene: Scene): void {
        this.camera = new FollowCamera('ThirdPersonCamera', this.playerMesh.position, scene);
        this.camera.lockedTarget = this.playerMesh;
        this.camera.radius = 10;
        this.camera.heightOffset = 3;
        this.camera.rotationOffset = 180;
        this.camera.cameraAcceleration = 0.05;
        this.camera.maxCameraSpeed = 10;
        (this.camera as any)._pitch = 0;
        scene.activeCamera = this.camera;

        const canvas = scene.getEngine().getRenderingCanvas();
        if (canvas) {
            canvas.addEventListener('click', () => canvas.requestPointerLock());
            let yaw = 180;
            let pitch = 0;
            document.addEventListener('pointerlockchange', () => {
                if (document.pointerLockElement === canvas) {
                    document.addEventListener('mousemove', onMouseMove);
                } else {
                    document.removeEventListener('mousemove', onMouseMove);
                }
            });
            const onMouseMove = (e: MouseEvent) => {
                yaw += e.movementX * 0.2;
                pitch += e.movementY * 0.2;
                pitch = Math.max(-40, Math.min(60, pitch));
                this.camera.rotationOffset = yaw;
                (this.camera as any)._pitch = pitch;
            };
            scene.onBeforeRenderObservable.add(() => {
                const cam = this.camera as any;
                const rad = (cam._pitch || 0) * Math.PI / 180;
                this.camera.heightOffset = Math.max(1, 3 + Math.sin(rad) * 6);
                this.camera.radius = Math.max(6, 10 - Math.sin(rad) * 2);
            });
        }
    }

    private registerControls(scene: Scene): void {
        scene.onKeyboardObservable.add((kbInfo: KeyboardInfo) => {
            const key = kbInfo.event.key.toLowerCase();
            if (kbInfo.type === KeyboardEventTypes.KEYDOWN) this.inputMap[key] = true;
            if (kbInfo.type === KeyboardEventTypes.KEYUP) this.inputMap[key] = false;
        });
        scene.onBeforeRenderObservable.add(() => this.updateMovement(scene));
    }

    private updateMovement(scene: Scene): void {
        if (!this.playerMesh || !this.playerMesh.physicsImpostor) return;
        const impostor = this.playerMesh.physicsImpostor;
        const velocity = impostor.getLinearVelocity() || Vector3.Zero();
        const moveImpulse = new Vector3(0, 0, 0);
        const baseSpeed = 1.5;
        const sprintMultiplier = 2.0;
        const jumpStrength = 4;
        const yaw = (this.camera as any).rotationOffset || 0;
        const rad = (yaw * Math.PI) / 180;

        const forward = new Vector3(-Math.sin(rad), 0, -Math.cos(rad));
        const right = new Vector3(-Math.sin(rad + Math.PI / 2), 0, -Math.cos(rad + Math.PI / 2));
        const isGrounded = Math.abs(velocity.y) < 0.05;

        if (this.inputMap['w']) moveImpulse.addInPlace(forward);
        if (this.inputMap['s']) moveImpulse.subtractInPlace(forward);
        if (this.inputMap['a']) moveImpulse.subtractInPlace(right);
        if (this.inputMap['d']) moveImpulse.addInPlace(right);

        if (moveImpulse.length() > 0) {
            moveImpulse.normalize();
            const speed = baseSpeed * (this.inputMap['shift'] ? sprintMultiplier : 1);
            moveImpulse.scaleInPlace(speed);
            impostor.setLinearVelocity(new Vector3(
                moveImpulse.x,
                velocity.y,
                moveImpulse.z
            ));
        } else {
            impostor.setLinearVelocity(new Vector3(
                velocity.x * 0.9,
                velocity.y,
                velocity.z * 0.9
            ));
        }

        if (this.inputMap[' '] && isGrounded) {
            impostor.setLinearVelocity(new Vector3(velocity.x, jumpStrength, velocity.z));
        }

        this.playerMesh.rotationQuaternion = null;
        this.playerMesh.rotation.set(0, this.playerMesh.rotation.y, 0);
        impostor.setAngularVelocity(Vector3.Zero());
    }
}

