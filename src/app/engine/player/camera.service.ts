// src/app/engine/player/camera.service.ts
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
import { Animation } from '@babylonjs/core/Animations/animation';
import { Injectable } from '@angular/core';

export interface ArcRotateCameraOptions {
    name?: string;
    alpha?: number;
    beta?: number;
    radius?: number;
    target?: Vector3;
    lowerRadiusLimit?: number;
    upperRadiusLimit?: number;
    lowerBetaLimit?: number;
    upperBetaLimit?: number;
    panningSensibility?: number;
    wheelPrecision?: number;
    useAutoRotation?: boolean;
}

export interface FreeCameraOptions {
    name?: string;
    position?: Vector3;
    target?: Vector3;
    keysUp?: number[];
    keysDown?: number[];
    keysLeft?: number[];
    keysRight?: number[];
    speed?: number;
    inertia?: number;
    angularSensibility?: number;
}

// Service for creating and managing cameras
@Injectable({
  providedIn: 'root'
})
export class CameraService {
    // Animation pool to reuse Animation objects
    private _positionAnimationPool: Animation[] = [];
    private _targetAnimationPool: Animation[] = [];
    
    // Pre-allocated objects for animation calculations
    private _tempVector = new Vector3(0, 0, 0);
    
    // Pre-allocated keyframe arrays and objects
    private _positionKeys: { frame: number, value: Vector3 }[] = [
        { frame: 0, value: new Vector3(0, 0, 0) },
        { frame: 60, value: new Vector3(0, 0, 0) }
    ];
    
    private _targetKeys: { frame: number, value: Vector3 }[] = [
        { frame: 0, value: new Vector3(0, 0, 0) },
        { frame: 60, value: new Vector3(0, 0, 0) }
    ];
    
    // Cache common animation parameters
    private readonly ANIMATION_FPS = 60;
    private readonly ANIMATION_TYPE = Animation.ANIMATIONTYPE_VECTOR3;
    private readonly ANIMATION_LOOP_MODE = Animation.ANIMATIONLOOPMODE_CONSTANT;

    // Creates an ArcRotateCamera with intuitive orbit controls
    createArcRotateCamera(scene: Scene, canvas: HTMLCanvasElement, options: ArcRotateCameraOptions = {}): ArcRotateCamera {
        const {
            name = 'arcRotateCamera',
            alpha = Math.PI / 2,  // Initial horizontal rotation
            beta = Math.PI / 3,   // Initial vertical angle (0 would be looking from above)
            radius = 10,          // Initial distance from target
            target = Vector3.Zero(),
            lowerRadiusLimit = 1, // Minimum zoom
            upperRadiusLimit = 100, // Maximum zoom
            lowerBetaLimit = 0.1, // Prevents camera from going below the ground plane
            upperBetaLimit = Math.PI / 2.1, // Prevents camera from going above the scene
            panningSensibility = 1000, // Higher values reduce panning speed
            wheelPrecision = 0.05, // Lower values make zooming more sensitive
            useAutoRotation = false
        } = options;

        // Create the camera
        const camera = new ArcRotateCamera(
            name,
            alpha,
            beta,
            radius,
            target,
            scene
        );
        
        // Set limits and controls
        camera.lowerRadiusLimit = lowerRadiusLimit;
        camera.upperRadiusLimit = upperRadiusLimit;
        camera.lowerBetaLimit = lowerBetaLimit;
        camera.upperBetaLimit = upperBetaLimit;
        camera.panningSensibility = panningSensibility;
        camera.wheelPrecision = wheelPrecision;
        camera.useAutoRotationBehavior = useAutoRotation;
        
        // Configure behavior
        camera.minZ = 0.1;  // Near clipping plane
        camera.maxZ = 1000; // Far clipping plane
        
        // Improve control feel for smoother experience
        camera.angularSensibilityX = 500; // Horizontal rotation sensitivity
        camera.angularSensibilityY = 500; // Vertical rotation sensitivity
        camera.inertia = 0.7; // Smoothing factor for camera movement

        // Allow camera to be controlled by user input
        camera.attachControl(canvas, true);
        
        // Set as active camera
        scene.activeCamera = camera;
        
        return camera;
    }
    
    // Creates a FreeCamera with WASD/arrow key movement controls
    createFreeCamera(scene: Scene, canvas: HTMLCanvasElement, options: FreeCameraOptions = {}): FreeCamera {
        const {
            name = 'freeCamera',
            position = new Vector3(0, 5, -10),
            target = Vector3.Zero(),
            // Default to WASD and arrow keys
            keysUp = [87, 38],    // W and UP arrow
            keysDown = [83, 40],  // S and DOWN arrow
            keysLeft = [65, 37],  // A and LEFT arrow
            keysRight = [68, 39], // D and RIGHT arrow
            speed = 0.5,
            inertia = 0.9,
            angularSensibility = 1000
        } = options;
        
        // Create the camera
        const camera = new FreeCamera(name, position, scene);
        
        // Set target to look at
        camera.setTarget(target);
        
        // Configure keyboard controls
        camera.keysUp = keysUp;
        camera.keysDown = keysDown;
        camera.keysLeft = keysLeft;
        camera.keysRight = keysRight;
        
        // Configure behavior
        camera.speed = speed;
        camera.inertia = inertia;
        camera.angularSensibility = angularSensibility;
        
        // Configure clipping planes
        camera.minZ = 0.1;
        camera.maxZ = 1000;
        
        // Allow camera to be controlled by user input
        camera.attachControl(canvas, true);
        
        // Set as active camera
        scene.activeCamera = camera;
        
        return camera;
    }
    
    // Updates the camera target and position to focus on a specific point
    focusOn(camera: TargetCamera, targetPosition: Vector3, distance?: number): void {
        if (camera instanceof ArcRotateCamera && distance !== undefined) {
            // For ArcRotateCamera, set target and radius
            camera.target.copyFrom(targetPosition);
            camera.radius = distance;
        } else {
            // For other cameras, set target and update position if distance is specified
            if (camera instanceof FreeCamera && distance !== undefined) {
                // Calculate position that's 'distance' away from target in current view direction
                const direction = camera.getDirection(this._tempVector);
                const newPosition = targetPosition.subtract(direction.scale(distance));
                camera.position.copyFrom(newPosition);
            }
            
            // Set target for any TargetCamera
            camera.setTarget(targetPosition);
        }
    }
    
    // Animates the camera to a new position and target
    animateTo(camera: TargetCamera, targetPosition: Vector3, cameraPosition: Vector3, duration = 1000): void {
        const scene = camera.getScene();
        
        // Create animation for target (all target cameras)
        const targetAnimation = this.getOrCreateTargetAnimation(camera);
        this.setTargetAnimationKeys(camera, targetPosition);
        
        // Create animation for position
        const positionAnimation = this.getOrCreatePositionAnimation(camera);
        this.setPositionAnimationKeys(camera, cameraPosition);
        
        // Calculate frame count based on duration
        const frames = this.ANIMATION_FPS * duration / 1000;
        
        // Begin animations
        scene.beginDirectAnimation(
            camera, 
            [targetAnimation, positionAnimation], 
            0, 
            frames, 
            false // Not looping
        );
    }
    
    // Get an animation from the pool or create a new one for position
    private getOrCreatePositionAnimation(camera: TargetCamera): Animation {
        if (this._positionAnimationPool.length > 0) {
            return this._positionAnimationPool.pop()!;
        }
        
        return new Animation(
            "cameraPosition",
            "position",
            this.ANIMATION_FPS,
            this.ANIMATION_TYPE,
            this.ANIMATION_LOOP_MODE
        );
    }
    
    // Get an animation from the pool or create a new one for target
    private getOrCreateTargetAnimation(camera: TargetCamera): Animation {
        if (this._targetAnimationPool.length > 0) {
            return this._targetAnimationPool.pop()!;
        }
        
        // Different property path based on camera type
        let propertyPath = "target";
        if (camera instanceof FreeCamera) {
            propertyPath = "_currentTarget";
        }
        
        return new Animation(
            "cameraTarget",
            propertyPath,
            this.ANIMATION_FPS,
            this.ANIMATION_TYPE,
            this.ANIMATION_LOOP_MODE
        );
    }
    
    // Return animation to the pool when it's finished
    private returnAnimationsToPool(animations: Animation[]): void {
        for (const animation of animations) {
            if (animation.targetProperty === "position") {
                this._positionAnimationPool.push(animation);
            } else if (animation.targetProperty === "target" || animation.targetProperty === "_currentTarget") {
                this._targetAnimationPool.push(animation);
            }
        }
    }
    
    // Setup position animation keys without creating new arrays
    private setPositionAnimationKeys(camera: TargetCamera, targetPosition: Vector3): void {
        // Reuse pre-allocated key array and objects
        this._positionKeys[0].value.copyFrom(camera.position);
        this._positionKeys[1].value.copyFrom(targetPosition);
        
        // Avoid creating a new array by modifying existing keys array
        const positionAnimation = camera.animations?.find(a => a.targetProperty === "position");
        if (positionAnimation) {
            positionAnimation.setKeys(this._positionKeys);
        }
    }
    
    // Setup target animation keys without creating new arrays
    private setTargetAnimationKeys(camera: TargetCamera, targetPosition: Vector3): void {
        // Get current target based on camera type
        if (camera instanceof ArcRotateCamera) {
            this._targetKeys[0].value.copyFrom(camera.target);
        } else if (camera instanceof FreeCamera) {
            // Fix: getTarget() returns a Vector3, doesn't take arguments
            const currentTarget = camera.getTarget();
            this._targetKeys[0].value.copyFrom(currentTarget);
        }
        
        this._targetKeys[1].value.copyFrom(targetPosition);
        
        // Find the target animation and set keys
        const targetPropertyPath = camera instanceof FreeCamera ? "_currentTarget" : "target";
        const targetAnimation = camera.animations?.find(a => a.targetProperty === targetPropertyPath);
        if (targetAnimation) {
            targetAnimation.setKeys(this._targetKeys);
        }
    }
    
    // Clean up resources when no longer needed
    dispose(): void {
        this._positionAnimationPool.length = 0;
        this._targetAnimationPool.length = 0;
    }
}