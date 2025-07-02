// src/app/engine/player/player.service.ts
import { Injectable } from '@angular/core';
import { Scene } from '@babylonjs/core/scene';
import { Mesh, MeshBuilder } from '@babylonjs/core/Meshes';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Ray } from '@babylonjs/core/Culling/ray';
import { FollowCamera } from '@babylonjs/core/Cameras/followCamera';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { KeyboardEventTypes, KeyboardInfo } from '@babylonjs/core/Events/keyboardEvents';
import { PhysicsImpostor } from '@babylonjs/core/Physics/physicsImpostor';
import { Tools } from '@babylonjs/core/Misc/tools';

@Injectable({ providedIn: 'root' })
export class PlayerService {
    private playerMesh!: Mesh;
    private firstPersonCamera!: FreeCamera;
    private thirdPersonCamera!: FollowCamera;
    private playerVisual!: Mesh;
    private playerMaterial!: StandardMaterial;
    private readonly radius = 0.5;
    private readonly height = 1.8;
    private yaw = 0;
    private pitch = 0;
    private isFirstPerson = true;
    private inputMap: { [key: string]: boolean } = {};

    init(scene: Scene): void {
        this.createPlayer(scene);
        this.createCamera(scene);
        this.registerControls(scene);
    }

    private createPlayer(scene: Scene): void {
        const radius = this.radius;
        const height = this.height;

        this.playerMesh = new Mesh('playerRoot', scene);
        this.playerMesh.position = new Vector3(0, 20, 0);
        this.playerMesh.physicsImpostor = new PhysicsImpostor(
            this.playerMesh,
            PhysicsImpostor.NoImpostor,
            { mass: 1, friction: 0.3, restitution: 0 },
            scene
        );

        this.playerVisual = MeshBuilder.CreateCapsule('playerVisual', { height, radius }, scene);
        this.playerVisual.parent = this.playerMesh;
        this.playerVisual.isVisible = false;
        this.playerMaterial = new StandardMaterial('playerMat', scene);
        this.playerVisual.material = this.playerMaterial;

        const sphereOffset = height / 2 - radius;

        const sphereBottom = MeshBuilder.CreateSphere('pSphereBottom', { diameter: radius * 2, segments: 8 }, scene);
        sphereBottom.isVisible = false;
        sphereBottom.parent = this.playerMesh;
        sphereBottom.position.y = -sphereOffset;
        sphereBottom.physicsImpostor = new PhysicsImpostor(
            sphereBottom,
            PhysicsImpostor.SphereImpostor,
            { mass: 0, friction: 0.3, restitution: 0 },
            scene
        );

        const sphereTop = MeshBuilder.CreateSphere('pSphereTop', { diameter: radius * 2, segments: 8 }, scene);
        sphereTop.isVisible = false;
        sphereTop.parent = this.playerMesh;
        sphereTop.position.y = sphereOffset;
        sphereTop.physicsImpostor = new PhysicsImpostor(
            sphereTop,
            PhysicsImpostor.SphereImpostor,
            { mass: 0, friction: 0.3, restitution: 0 },
            scene
        );

        const cylinderHeight = height - radius * 2;
        const cylinder = MeshBuilder.CreateCylinder('pCylinder', { height: cylinderHeight, diameter: radius * 2, tessellation: 6 }, scene);
        cylinder.isVisible = false;
        cylinder.parent = this.playerMesh;
        cylinder.physicsImpostor = new PhysicsImpostor(
            cylinder,
            PhysicsImpostor.CylinderImpostor,
            { mass: 0, friction: 0.3, restitution: 0 },
            scene
        );

        this.playerMesh.physicsImpostor.forceUpdate();
        const body = this.playerMesh.physicsImpostor.physicsBody as any;
        if (body) {
            body.linearDamping = 0.9;
            body.angularDamping = 1;
        }

        this.playerMesh.physicsImpostor.registerBeforePhysicsStep(() => {
            this.playerMesh.rotationQuaternion = null;
            this.playerMesh.rotation.set(0, this.yaw * Math.PI / 180, 0);
            this.playerMesh.physicsImpostor!.setAngularVelocity(Vector3.Zero());
        });
    }

    private createCamera(scene: Scene): void {
        const canvas = scene.getEngine().getRenderingCanvas();

        this.firstPersonCamera = new FreeCamera('FirstPersonCamera', new Vector3(0, 1.6, 0), scene);
        this.firstPersonCamera.parent = this.playerMesh;
        this.firstPersonCamera.minZ = 0.1;
        this.firstPersonCamera.maxZ = 1000;
        this.firstPersonCamera.fov = Tools.ToRadians(75);
        this.firstPersonCamera.inputs.clear();

        this.thirdPersonCamera = new FollowCamera('ThirdPersonCamera', this.playerMesh.position, scene);
        this.thirdPersonCamera.lockedTarget = this.playerMesh;
        this.thirdPersonCamera.radius = 10;
        this.thirdPersonCamera.heightOffset = 3;
        this.thirdPersonCamera.rotationOffset = 180;
        this.thirdPersonCamera.cameraAcceleration = 0.05;
        this.thirdPersonCamera.maxCameraSpeed = 10;
        (this.thirdPersonCamera as any)._pitch = 0;

        scene.activeCamera = this.firstPersonCamera;

        if (canvas) {
            canvas.addEventListener('click', () => canvas.requestPointerLock());
            const onMouseMove = (e: MouseEvent) => {
                this.yaw += e.movementX * 0.2;
                this.pitch += e.movementY * 0.2;
                this.pitch = Math.max(-80, Math.min(80, this.pitch));
            };
            document.addEventListener('pointerlockchange', () => {
                if (document.pointerLockElement === canvas) {
                    document.addEventListener('mousemove', onMouseMove);
                } else {
                    document.removeEventListener('mousemove', onMouseMove);
                }
            });
        }
    }

    private registerControls(scene: Scene): void {
        scene.onKeyboardObservable.add((kbInfo: KeyboardInfo) => {
            const key = kbInfo.event.key.toLowerCase();
            if (kbInfo.type === KeyboardEventTypes.KEYDOWN) {
                this.inputMap[key] = true;
                if (key === 'v') {
                    this.toggleCamera(scene);
                }
            }
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

        const rad = (this.yaw * Math.PI) / 180;

        this.firstPersonCamera.rotation.x = this.pitch * Math.PI / 180;
        this.firstPersonCamera.rotation.y = rad;
        this.firstPersonCamera.rotation.z = 0;
        this.thirdPersonCamera.rotationOffset = this.yaw;
        (this.thirdPersonCamera as any)._pitch = this.pitch;

        const forward = new Vector3(-Math.sin(rad), 0, -Math.cos(rad));
        const right = new Vector3(-Math.sin(rad + Math.PI / 2), 0, -Math.cos(rad + Math.PI / 2));

        const ray = new Ray(this.playerMesh.position, Vector3.Down(), this.height / 2 + 0.2);
        const pick = scene.pickWithRay(
            ray,
            (m) =>
                !!m.physicsImpostor &&
                (m.physicsImpostor as PhysicsImpostor).physicsBody &&
                m.physicsImpostor.mass === 0 &&
                m !== this.playerMesh
        );
        const isGrounded = !!pick && pick.hit;

        const moving =
            this.inputMap['w'] || this.inputMap['a'] || this.inputMap['s'] || this.inputMap['d'];

        if (this.inputMap['w']) moveImpulse.addInPlace(forward);
        if (this.inputMap['s']) moveImpulse.subtractInPlace(forward);
        if (this.inputMap['a']) moveImpulse.subtractInPlace(right);
        if (this.inputMap['d']) moveImpulse.addInPlace(right);

        if (moving && moveImpulse.length() > 0) {
            moveImpulse.normalize();
            const speed = baseSpeed * (this.inputMap['shift'] ? sprintMultiplier : 1);
            moveImpulse.scaleInPlace(speed);
            impostor.setLinearVelocity(new Vector3(moveImpulse.x, velocity.y, moveImpulse.z));
        } else {
            impostor.setLinearVelocity(new Vector3(0, velocity.y, 0));
        }

        if (this.inputMap[' '] && isGrounded) {
            const v = impostor.getLinearVelocity() || Vector3.Zero();
            impostor.setLinearVelocity(new Vector3(v.x, jumpStrength, v.z));
        }

        this.playerMesh.rotationQuaternion = null;
        this.playerMesh.rotation.set(0, this.yaw * Math.PI / 180, 0);
        impostor.setAngularVelocity(Vector3.Zero());
    }

    private toggleCamera(scene: Scene): void {
        this.isFirstPerson = !this.isFirstPerson;
        if (this.isFirstPerson) {
            scene.activeCamera = this.firstPersonCamera;
            this.playerVisual.isVisible = false;
            this.playerMaterial.wireframe = false;
        } else {
            scene.activeCamera = this.thirdPersonCamera;
            this.playerVisual.isVisible = true;
            this.playerMaterial.wireframe = true;
        }
    }
}

