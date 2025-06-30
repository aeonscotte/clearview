import { Component, EventEmitter, OnInit, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../../services/settings.service';

@Component({
    selector: 'app-settings-menu',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './settings-menu.component.html',
    styleUrls: ['./settings-menu.component.less']
})
export class SettingsMenuComponent implements OnInit, OnDestroy {
    @Output() close = new EventEmitter<void>();
    volume = 1;

    constructor(private settings: SettingsService) {}

    ngOnInit(): void {
        this.volume = this.settings.currentAudioSettings.volume;
    }

    ngOnDestroy(): void {}

    onVolumeChange(): void {
        this.settings.setVolume(this.volume);
    }

    closeDialog(): void {
        this.close.emit();
    }
}
