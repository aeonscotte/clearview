import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UiStateService } from '../../../services/ui-state.service';
import { PerformanceSettingsService, PerformanceSettings } from '../../../engine/performance/performance-settings.service';

@Component({
    selector: 'app-settings-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './settings-dialog.component.html',
    styleUrls: ['./settings-dialog.component.less']
})
export class SettingsDialogComponent implements OnInit, OnDestroy {
    isVisible = false;
    private sub?: Subscription;
    settings!: PerformanceSettings;

    constructor(
        private ui: UiStateService,
        private perfSettings: PerformanceSettingsService
    ) {}

    ngOnInit(): void {
        this.sub = this.ui.settingsVisible$.subscribe(v => this.isVisible = v);
        this.settings = this.perfSettings.getSettings();
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe();
    }

    close(): void {
        this.ui.hideSettings();
    }

    save(): void {
        this.perfSettings.update(this.settings);
        this.close();
    }
}
