// src/app/components/ui/pause-menu/pause-menu.component.ts
import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GuiService } from '../../../engine/core/gui.service';
import { Subscription } from 'rxjs';

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
    @Output() exit = new EventEmitter<void>();

    constructor(private guiService: GuiService) { }

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

    backToMainMenu(): void {
        this.guiService.setPaused(false);
        this.exit.emit();
    }
}