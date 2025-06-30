import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { UiStateService } from '../../../services/ui-state.service';

@Component({
    selector: 'app-settings-dialog',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './settings-dialog.component.html',
    styleUrls: ['./settings-dialog.component.less']
})
export class SettingsDialogComponent implements OnInit, OnDestroy {
    isVisible = false;
    private sub?: Subscription;

    constructor(private ui: UiStateService) {}

    ngOnInit(): void {
        this.sub = this.ui.settingsVisible$.subscribe(v => this.isVisible = v);
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe();
    }

    close(): void {
        this.ui.hideSettings();
    }
}
