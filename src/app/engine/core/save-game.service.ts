// src/app/engine/core/save-game.service.ts
import { Injectable } from '@angular/core';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TimeService } from '../physics/time.service';

export interface EntityState {
    id: string;
    position: { x: number; y: number; z: number };
    velocity?: { x: number; y: number; z: number };
}

export interface SaveGameData {
    timeElapsed: number;
    timeOfDay: number;
    entities: EntityState[];
}

@Injectable({ providedIn: 'root' })
export class SaveGameService {
    private storageKey = 'clearview-save';

    constructor(private timeService: TimeService) {}

    createSaveData(scene: Scene): SaveGameData {
        const entities: EntityState[] = scene.meshes
            .filter(m => !!m.physicsImpostor)
            .map(m => {
                const vel = m.physicsImpostor?.getLinearVelocity() || Vector3.Zero();
                return {
                    id: m.name,
                    position: { x: m.position.x, y: m.position.y, z: m.position.z },
                    velocity: { x: vel.x, y: vel.y, z: vel.z }
                } as EntityState;
            });

        return {
            timeElapsed: this.timeService.getElapsed(),
            timeOfDay: this.timeService.getWorldTime(),
            entities
        };
    }

    save(scene: Scene): void {
        const data = this.createSaveData(scene);
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }

    load(scene: Scene): void {
        const raw = localStorage.getItem(this.storageKey);
        if (!raw) return;
        const data = JSON.parse(raw) as SaveGameData;

        this.timeService.setElapsed(data.timeElapsed);
        this.timeService.setWorldTime(data.timeOfDay);

        data.entities.forEach(ent => {
            const mesh = scene.getMeshByName(ent.id);
            if (mesh) {
                mesh.position.set(ent.position.x, ent.position.y, ent.position.z);
                if (mesh.physicsImpostor && ent.velocity) {
                    mesh.physicsImpostor.setLinearVelocity(new Vector3(ent.velocity.x, ent.velocity.y, ent.velocity.z));
                }
            }
        });
    }

    hasSave(): boolean {
        return localStorage.getItem(this.storageKey) !== null;
    }

    clear(): void {
        localStorage.removeItem(this.storageKey);
    }
}
