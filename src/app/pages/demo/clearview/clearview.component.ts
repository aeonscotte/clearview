// src/app/pages/demo/clearview/clearview.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ViewportComponent } from '../../../components/clearview/viewport/viewport.component';
import { MainMenuComponent } from '../../../components/ui/main-menu/main-menu.component';
import { SettingsDialogComponent } from '../../../components/ui/settings-dialog/settings-dialog.component';
import { UiStateService } from '../../../services/ui-state.service';
import { CommonModule } from '@angular/common';
import { SaveGameService } from '../../../engine/core/save-game.service';

@Component({
    selector: 'app-clearview',
    imports: [CommonModule, ViewportComponent, MainMenuComponent, SettingsDialogComponent],
    templateUrl: './clearview.component.html',
    styleUrls: ['./clearview.component.less']
})
export class ClearviewComponent implements OnInit, OnDestroy {
    showGame = false;

    constructor(private ui: UiStateService, private saveGame: SaveGameService) { }

    ngOnInit(): void {
        document.body.classList.add('demo-dark');
        this.ui.mainMenuVisible$.subscribe(visible => {
            if (visible) {
                this.showGame = false;
            }
        });
    }

    ngOnDestroy(): void {
        document.body.classList.remove('demo-dark');
    }

    startGame(): void {
        this.showGame = true;
        this.saveGame.loadFromSlot('autosave');
        this.ui.hideMainMenu();
    }
}