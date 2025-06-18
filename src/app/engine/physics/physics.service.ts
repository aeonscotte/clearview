// src/app/engine/physics/physics.service.ts
import { Injectable } from '@angular/core';
import { Scene } from '@babylonjs/core/scene';
import * as CANNON from 'cannon-es';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CannonJSPlugin } from '@babylonjs/core/Physics/Plugins/cannonJSPlugin';
import { AbstractMesh, PhysicsImpostor, GroundMesh } from '@babylonjs/core';

@Injectable({ providedIn: 'root' })
export class PhysicsService {
    // Use an arrow function to ensure 'this' context is always correct
    enablePhysics = async (scene: Scene): Promise<void> => {
        const gravity = new Vector3(0, -9.81, 0);
        scene.enablePhysics(gravity, new CannonJSPlugin(true, 10, CANNON));
    };

    addImpostor(mesh: AbstractMesh, type: number, options: any): void {
        mesh.physicsImpostor = new PhysicsImpostor(mesh, type, options, mesh.getScene());
    }

    addHeightmapImpostor(mesh: GroundMesh, options: any): void {
        mesh.physicsImpostor = new PhysicsImpostor(
            mesh,
            PhysicsImpostor.HeightmapImpostor,
            options,
            mesh.getScene()
        );
    }
}
