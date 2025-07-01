import { Injectable } from '@angular/core';
import { AbstractMesh, Mesh } from '@babylonjs/core';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { WaterMaterial, WaterMaterialOptions } from './water-material';

export interface WaterOptions extends WaterMaterialOptions {
    mesh: Mesh;
    level: number;
}

interface WaterMeshInfo {
    mesh: Mesh;
    level: number;
}

@Injectable({ providedIn: 'root' })
export class WaterService {
    private _waterMeshes: WaterMeshInfo[] = [];
    private _tideOffset = 0;

    createWater(options: WaterOptions): void {
        const material = new WaterMaterial(options.mesh.getScene(), options);
        options.mesh.material = material;
        this._waterMeshes.push({ mesh: options.mesh, level: options.level });
    }

    getWaterHeightAt(pos: Vector3): number {
        if (this._waterMeshes.length === 0) return -Infinity;
        // Simple approach: assume single water level for now
        return this._waterMeshes[0].level + this._tideOffset;
    }

    dispose(): void {
        for (const info of this._waterMeshes) {
            info.mesh.material?.dispose();
        }
        this._waterMeshes.length = 0;
    }
}
