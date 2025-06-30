import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { UiStateService } from '../../../services/ui-state.service';

@Component({
    selector: 'app-main-menu',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './main-menu.component.html',
    styleUrls: ['./main-menu.component.less']
})
export class MainMenuComponent implements OnInit, OnDestroy {
    @Output() start = new EventEmitter<void>();
    isVisible = true;
    private sub?: Subscription;

    constructor(private ui: UiStateService) {}

    ngOnInit(): void {
        this.sub = this.ui.mainMenuVisible$.subscribe(v => this.isVisible = v);
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe();
    }

    startGame(): void {
        this.start.emit();
    }

    openSettings(): void {
        this.ui.showSettings();
    }
}
