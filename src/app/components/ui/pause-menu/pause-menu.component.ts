// src/app/components/ui/pause-menu/pause-menu.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GuiService } from '../../../engine/core/gui.service';
import { Subscription } from 'rxjs';
import { UiStateService } from '../../../services/ui-state.service';

@Component({
    selector: 'app-pause-menu',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './pause-menu.component.html',
    styleUrls: ['./pause-menu.component.less']
})
export class PauseMenuComponent implements OnInit, OnDestroy {
    isVisible = false;
    private subscription: Subscription | null = null;

    constructor(
        private guiService: GuiService,
        private ui: UiStateService
    ) { }

    ngOnInit(): void {
        this.subscription = this.guiService.isPaused().subscribe(isPaused => {
            this.isVisible = isPaused;
        });
    }

    ngOnDestroy(): void {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }

    resumeGame(): void {
        // Use the same method that the ESC key uses
        this.guiService.setPaused(false);
    }

    openSettings(): void {
        this.ui.showSettings();
    }

    returnToMainMenu(): void {
        this.guiService.setPaused(false);
        this.ui.showMainMenu();
    }
}