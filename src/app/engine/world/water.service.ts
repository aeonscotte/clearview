import { Injectable } from '@angular/core';
import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder, Mesh, AbstractMesh } from '@babylonjs/core/Meshes';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { PhysicsImpostor } from '@babylonjs/core/Physics/physicsImpostor';
import { MaterialService } from '../material/material.service';
import { PhysicsService } from '../physics/physics.service';
import { TimeService } from '../physics/time.service';

@Injectable({
    providedIn: 'root'
})
export class WaterService {
    private waterMesh: Mesh | null = null;
    private _baseLevel = 0;
    private waterLevel = 0;
    private buoyancyCoefficient = 2;
    private _waveAmplitude = 0.5;
    private _waveFrequency = 0.5;

    // Collection of meshes affected by buoyancy
    private _floatingMeshes: AbstractMesh[] = [];

    // Pre-allocated vectors to avoid garbage
    private _tempForce: Vector3 = new Vector3();
    private _tempContactPoint: Vector3 = new Vector3();

    constructor(
        private materialService: MaterialService,
        private physicsService: PhysicsService,
        private timeService: TimeService
    ) { }

    createWater(scene: Scene, size: number, level: number, amplitude = 0.5, frequency = 0.5): void {
        this._baseLevel = level;
        this.waterLevel = level;
        this._waveAmplitude = amplitude;
        this._waveFrequency = frequency;
        this.waterMesh = MeshBuilder.CreateGround('waterPlane', { width: size, height: size }, scene);
        this.waterMesh.position.set(0, level, 0);
        this.waterMesh.material = this.materialService.createWaterMaterial(scene);
        this.waterMesh.isPickable = false;

        // Optional physics impostor so other objects can collide with water
        this.physicsService.addImpostor(this.waterMesh, PhysicsImpostor.PlaneImpostor, { mass: 0 });
    }

    registerFloatingMesh(mesh: AbstractMesh): void {
        if (this._floatingMeshes.indexOf(mesh) === -1) {
            this._floatingMeshes.push(mesh);
        }
    }

    update(): void {
        if (!this.waterMesh) return;

        // Update water level with gentle wave motion
        const elapsed = this.timeService.getElapsed();
        this.waterLevel = this._baseLevel + Math.sin(elapsed * this._waveFrequency) * this._waveAmplitude;
        this.waterMesh.position.y = this.waterLevel;

        for (const mesh of this._floatingMeshes) {
            const impostor = mesh.physicsImpostor;
            if (!impostor) continue;

            const depth = this.waterLevel - mesh.position.y;
            if (depth <= 0) continue;

            const forceMag = depth * this.buoyancyCoefficient * impostor.mass;
            this._tempForce.set(0, forceMag, 0);

            mesh.getWorldMatrix().getTranslationToRef(this._tempContactPoint);
            impostor.applyForce(this._tempForce, this._tempContactPoint);
        }
    }

    dispose(): void {
        if (this.waterMesh) {
            this.waterMesh.dispose();
            this.waterMesh = null;
        }
        this._floatingMeshes.length = 0;
    }
}
