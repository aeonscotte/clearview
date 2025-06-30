import { Injectable } from '@angular/core';
import { PlayerService, PlayerState } from '../player/player.service';
import { TimeService } from '../physics/time.service';

export interface SaveGame {
    timestamp: number;
    elapsed: number;
    worldTime: number;
    player: PlayerState;
}

@Injectable({ providedIn: 'root' })
export class SaveGameService {
    constructor(
        private player: PlayerService,
        private time: TimeService
    ) {}

    createSave(): SaveGame {
        return {
            timestamp: Date.now(),
            elapsed: this.time.getElapsed(),
            worldTime: this.time.getWorldTime(),
            player: this.player.getState()
        };
    }

    applySave(save: SaveGame): void {
        this.time.setWorldTime(save.worldTime);
        this.player.applyState(save.player);
    }

    saveToSlot(slot: string): void {
        const data = this.createSave();
        localStorage.setItem(`save_${slot}`, JSON.stringify(data));
    }

    loadFromSlot(slot: string): SaveGame | null {
        const raw = localStorage.getItem(`save_${slot}`);
        if (!raw) return null;
        const data: SaveGame = JSON.parse(raw);
        this.applySave(data);
        return data;
    }
}
