import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AudioSettings {
    volume: number;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
    private audioSettingsSubject = new BehaviorSubject<AudioSettings>({ volume: 1 });

    get audioSettings$() {
        return this.audioSettingsSubject.asObservable();
    }

    setVolume(volume: number): void {
        const settings = this.audioSettingsSubject.getValue();
        this.audioSettingsSubject.next({ ...settings, volume });
    }

    get currentAudioSettings(): AudioSettings {
        return this.audioSettingsSubject.getValue();
    }
}
