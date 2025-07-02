// src/app/engine/player/player.service.ts
import { Injectable } from '@angular/core';
import { Scene } from '@babylonjs/core/scene';
import { Mesh, MeshBuilder } from '@babylonjs/core/Meshes';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { FollowCamera } from '@babylonjs/core/Cameras/followCamera';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { VirtualJoystick } from '@babylonjs/core/Misc/virtualJoystick';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { KeyboardEventTypes, KeyboardInfo } from '@babylonjs/core/Events/keyboardEvents';
import { PhysicsImpostor } from '@babylonjs/core/Physics/physicsImpostor';

@Injectable({ providedIn: 'root' })
export class PlayerService {
    private playerMesh!: Mesh;
    private thirdPersonCamera!: FollowCamera;
    private firstPersonCamera!: FreeCamera;
    private isFirstPerson = false;
    private inputMap: { [key: string]: boolean } = {};
    private leftJoystick?: VirtualJoystick;
    private rightJoystick?: VirtualJoystick;
    private bodyParts: Mesh[] = [];
    private wireMaterial?: StandardMaterial;

    // Pre-allocated vectors
    private _moveImpulse = new Vector3();
    private _forward = new Vector3();
    private _right = new Vector3();

    private yaw = 180;
    private pitch = 0;

    init(scene: Scene): void {
        this.createPlayer(scene);
        this.createCameras(scene);
        this.createVirtualJoysticks();
        this.registerControls(scene);
        this.updateCameraMode();
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
            { mass: 0.07, friction: 0.3, restitution: 0 },
            scene
        );

        const sphereBottom = MeshBuilder.CreateSphere('player_sphere_bottom', { diameter: radius * 2 }, scene);
        sphereBottom.position = new Vector3(0, -sphereOffset, 0);
        sphereBottom.parent = this.playerMesh;
        sphereBottom.isVisible = false;
        const sphereTop = MeshBuilder.CreateSphere('player_sphere_top', { diameter: radius * 2 }, scene);
        sphereTop.position = new Vector3(0, sphereOffset, 0);
        sphereTop.parent = this.playerMesh;
        sphereTop.isVisible = false;
        const cylinder = MeshBuilder.CreateCylinder('player_cylinder', { height: height - 2 * radius, diameter: radius * 2 }, scene);
        cylinder.position = new Vector3(0, 0, 0);
        cylinder.parent = this.playerMesh;
        cylinder.isVisible = false;

        this.bodyParts.push(sphereBottom, sphereTop, cylinder);

        this.wireMaterial = new StandardMaterial('playerWire', scene);
        this.wireMaterial.wireframe = true;
    }

    private createCameras(scene: Scene): void {
        this.thirdPersonCamera = new FollowCamera('ThirdPersonCamera', this.playerMesh.position, scene);
        this.thirdPersonCamera.lockedTarget = this.playerMesh;
        this.thirdPersonCamera.radius = 10;
        this.thirdPersonCamera.heightOffset = 3;
        this.thirdPersonCamera.rotationOffset = 180;
        this.thirdPersonCamera.cameraAcceleration = 0.05;
        this.thirdPersonCamera.maxCameraSpeed = 10;
        (this.thirdPersonCamera as any)._pitch = 0;

        const eyeHeight = 1.8;
        this.firstPersonCamera = new FreeCamera('FirstPersonCamera', new Vector3(0, eyeHeight - 0.2, 0), scene);
        this.firstPersonCamera.parent = this.playerMesh;
        this.firstPersonCamera.minZ = 0.1;
        this.firstPersonCamera.maxZ = 1000;
        this.firstPersonCamera.rotation.set(0, Math.PI, 0);

        scene.activeCamera = this.thirdPersonCamera;

        const canvas = scene.getEngine().getRenderingCanvas();
        if (canvas) {
            canvas.addEventListener('click', () => canvas.requestPointerLock());
            document.addEventListener('pointerlockchange', () => {
                if (document.pointerLockElement === canvas) {
                    document.addEventListener('mousemove', onMouseMove);
                } else {
                    document.removeEventListener('mousemove', onMouseMove);
                }
            });
            const onMouseMove = (e: MouseEvent) => {
                this.yaw += e.movementX * 0.2;
                this.pitch += e.movementY * 0.2;
                this.pitch = Math.max(-80, Math.min(80, this.pitch));
            };

            scene.onBeforeRenderObservable.add(() => {
                const rad = (this.pitch) * Math.PI / 180;
                this.thirdPersonCamera.heightOffset = Math.max(1, 3 + Math.sin(rad) * 6);
                this.thirdPersonCamera.radius = Math.max(6, 10 - Math.sin(rad) * 2);

                if (this.isFirstPerson) {
                    this.firstPersonCamera.rotation.x = rad;
                    this.playerMesh.rotation.y = this.yaw * Math.PI / 180;
                } else {
                    this.thirdPersonCamera.rotationOffset = this.yaw;
                    (this.thirdPersonCamera as any)._pitch = this.pitch;
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
                    this.toggleCameraMode();
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

        this._moveImpulse.set(0, 0, 0);
        const baseSpeed = 1.5;
        const sprintMultiplier = 2.0;
        const jumpStrength = 4;
        const rad = (this.yaw * Math.PI) / 180;

        this._forward.set(-Math.sin(rad), 0, -Math.cos(rad));
        this._right.set(-Math.sin(rad + Math.PI / 2), 0, -Math.cos(rad + Math.PI / 2));
        const isGrounded = Math.abs(velocity.y) < 0.05;

        if (this.inputMap['w']) this._moveImpulse.addInPlace(this._forward);
        if (this.inputMap['s']) this._moveImpulse.subtractInPlace(this._forward);
        if (this.inputMap['a']) this._moveImpulse.subtractInPlace(this._right);
        if (this.inputMap['d']) this._moveImpulse.addInPlace(this._right);

        if (this.leftJoystick && this.leftJoystick.pressed) {
            this._moveImpulse.addInPlace(this._forward.scale(this.leftJoystick.deltaPosition.y / 50));
            this._moveImpulse.addInPlace(this._right.scale(this.leftJoystick.deltaPosition.x / 50));
        }

        if (this._moveImpulse.length() > 0) {
            this._moveImpulse.normalize();
            const speed = baseSpeed * (this.inputMap['shift'] ? sprintMultiplier : 1);
            this._moveImpulse.scaleInPlace(speed);
            impostor.setLinearVelocity(new Vector3(
                this._moveImpulse.x,
                velocity.y,
                this._moveImpulse.z
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

        impostor.setAngularVelocity(Vector3.Zero());
    }

    private toggleCameraMode(): void {
        this.isFirstPerson = !this.isFirstPerson;
        this.updateCameraMode();
    }

    private updateCameraMode(): void {
        if (!this.playerMesh.getScene().activeCamera) return;
        const scene = this.playerMesh.getScene();
        const canvas = scene.getEngine().getRenderingCanvas();

        if (this.isFirstPerson) {
            scene.activeCamera = this.firstPersonCamera;
            this.bodyParts.forEach(p => p.isVisible = false);
        } else {
            scene.activeCamera = this.thirdPersonCamera;
            this.bodyParts.forEach(p => {
                p.isVisible = true;
                if (this.wireMaterial) {
                    p.material = this.wireMaterial;
                }
            });
        }

        if (canvas) {
            this.firstPersonCamera.detachControl();
            this.thirdPersonCamera.detachControl();
            scene.activeCamera.attachControl(canvas, true);
        }
    }

    private createVirtualJoysticks(): void {
        this.leftJoystick = new VirtualJoystick(true);
        this.rightJoystick = new VirtualJoystick(false);
        this.leftJoystick.setJoystickSensibility(15);
        this.rightJoystick.setJoystickSensibility(15);

        this.rightJoystick.reverseUpDown = true;

        const updateLook = () => {
            if (this.rightJoystick && this.rightJoystick.pressed) {
                this.yaw += this.rightJoystick.deltaPosition.x * 0.1;
                this.pitch += this.rightJoystick.deltaPosition.y * 0.1;
                this.pitch = Math.max(-80, Math.min(80, this.pitch));
            }
            requestAnimationFrame(updateLook);
        };
        updateLook();
    }
}

