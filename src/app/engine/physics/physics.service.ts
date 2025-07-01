// src/app/engine/physics/physics.service.ts
import { Injectable } from '@angular/core';
import { Scene } from '@babylonjs/core/scene';
import * as CANNON from 'cannon-es';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CannonJSPlugin } from '@babylonjs/core/Physics/Plugins/cannonJSPlugin';
import { AbstractMesh, PhysicsImpostor, GroundMesh } from '@babylonjs/core';
import { TimeService } from './time.service';
import { WaterService } from '../world/water.service';
import { MemoryUtilsService } from '../utils/memory-utils.service';

@Injectable({ providedIn: 'root' })
export class PhysicsService {
    private _floatables: { mesh: AbstractMesh; volume: number; density: number }[] = [];
    private _tempForce: Vector3 = new Vector3();
    private _frame = 0;

    constructor(
        private timeService: TimeService,
        private waterService: WaterService,
        private memoryUtils: MemoryUtilsService
    ) { }

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

    registerFloatable(mesh: AbstractMesh, volume: number, density: number): void {
        this._floatables.push({ mesh, volume, density });
    }

    update(deltaTime: number): void {
        if (this.timeService.isPaused()) return;
        this._frame++;
        if (this._frame % 3 !== 0) return;
        this._updateBuoyancy(deltaTime);
    }

    private _updateBuoyancy(_deltaTime: number): void {
        for (const f of this._floatables) {
            const pos = f.mesh.getAbsolutePosition();
            const tempPos = this.memoryUtils.getTempVector3();
            tempPos.copyFrom(pos);
            const height = this.waterService.getWaterHeightAt(tempPos);
            if (pos.y < height) {
                const depth = height - pos.y;
                const submerged = Math.min(depth / (f.mesh.getBoundingInfo().boundingBox.extendSize.y * 2), 1);
                const buoyancy = 9.81 * f.volume * (1 - f.density) * submerged;
                this._tempForce.set(0, buoyancy, 0);
                f.mesh.physicsImpostor?.applyForce(this._tempForce, pos);
            }
        }
    }
}
