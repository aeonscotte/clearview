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
            camera.target = targetPosition;
            camera.radius = distance;
        } else {
            // For other cameras, set target and update position if distance is specified
            if (camera instanceof FreeCamera && distance !== undefined) {
                // Calculate position that's 'distance' away from target in current view direction
                const direction = camera.getDirection(Vector3.Forward());
                const newPosition = targetPosition.subtract(direction.scale(distance));
                camera.position = newPosition;
            }
            
            // Set target for any TargetCamera
            camera.setTarget(targetPosition);
        }
    }
    
    // Animates the camera to a new position and target
    animateTo(camera: TargetCamera, targetPosition: Vector3, cameraPosition: Vector3, duration = 1000): void {
        const scene = camera.getScene();
        
        // Create animation for target (all target cameras)
        scene.beginDirectAnimation(
            camera, 
            [this.createTargetAnimation(camera, targetPosition)], 
            0, 
            60 * duration / 1000, // Frames at 60fps
            false // Not looping
        );
        
        // Create animation for position
        scene.beginDirectAnimation(
            camera, 
            [this.createPositionAnimation(camera, cameraPosition)], 
            0, 
            60 * duration / 1000,
            false
        );
    }
    
    // Creates a position animation for a camera
    private createPositionAnimation(camera: TargetCamera, targetPosition: Vector3) {
        // Animation creation would go here, using Babylon's Animation class
        // This is a simplified implementation
        const animation = new Animation(
            "cameraPosition",
            "position",
            60, // Frames per second
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        // Set keyframes
        const keys = [];
        keys.push({ frame: 0, value: camera.position.clone() });
        keys.push({ frame: 60, value: targetPosition });
        animation.setKeys(keys);
        
        return animation;
    }
    
    // Creates a target animation for a camera
    private createTargetAnimation(camera: TargetCamera, targetPosition: Vector3) {
        // Different handling based on camera type
        let propertyPath = "target";
        let currentTarget = targetPosition.clone();
        
        if (camera instanceof ArcRotateCamera) {
            currentTarget = camera.target.clone();
        } else if (camera instanceof FreeCamera) {
            // For FreeCamera we need a different approach since it doesn't have a direct target property
            propertyPath = "_currentTarget";
            currentTarget = camera.getTarget();
        }
        const animation = new Animation(
            "cameraTarget",
            propertyPath,
            60,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        // Set keyframes
        const keys = [];
        keys.push({ frame: 0, value: currentTarget });
        keys.push({ frame: 60, value: targetPosition });
        animation.setKeys(keys);
        
        return animation;
    }
}