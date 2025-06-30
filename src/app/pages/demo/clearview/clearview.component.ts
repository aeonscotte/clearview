// src/app/pages/demo/clearview/clearview.component.ts
import { Component, OnInit } from '@angular/core';
import { ViewportComponent } from '../../../components/clearview/viewport/viewport.component';
import { MainMenuComponent } from '../../../components/ui/main-menu/main-menu.component';
import { SettingsDialogComponent } from '../../../components/ui/settings-dialog/settings-dialog.component';
import { UiStateService } from '../../../services/ui-state.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-clearview',
    imports: [CommonModule, ViewportComponent, MainMenuComponent, SettingsDialogComponent],
    templateUrl: './clearview.component.html',
    styleUrls: ['./clearview.component.less']
})
export class ClearviewComponent implements OnInit {
    showGame = false;

    constructor(private ui: UiStateService) { }

    ngOnInit(): void {
        this.ui.mainMenuVisible$.subscribe(visible => {
            if (visible) {
                this.showGame = false;
            }
        });
    }

    startGame(): void {
        this.showGame = true;
        this.ui.hideMainMenu();
    }
}