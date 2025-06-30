import { Injectable } from '@angular/core';
import { SettingsService } from '../../services/settings.service';

@Injectable({ providedIn: 'root' })
export class AudioService {
    private audioElements: HTMLAudioElement[] = [];
    private isPaused = false;

    constructor(private settings: SettingsService) {
        this.settings.audioSettings$.subscribe(s => {
            for (const audio of this.audioElements) {
                audio.volume = s.volume;
            }
        });
    }

    play(src: string, loop = false): HTMLAudioElement {
        const audio = new Audio(src);
        audio.loop = loop;
        audio.volume = this.settings.currentAudioSettings.volume;
        audio.play();
        this.audioElements.push(audio);
        return audio;
    }

    pauseAll(): void {
        this.isPaused = true;
        for (const audio of this.audioElements) {
            audio.pause();
        }
    }

    resumeAll(): void {
        this.isPaused = false;
        for (const audio of this.audioElements) {
            audio.volume = this.settings.currentAudioSettings.volume;
            audio.play();
        }
    }

    stopAll(): void {
        for (const audio of this.audioElements) {
            audio.pause();
            audio.currentTime = 0;
        }
        this.audioElements = [];
    }

    isAudioPaused(): boolean {
        return this.isPaused;
    }
}
