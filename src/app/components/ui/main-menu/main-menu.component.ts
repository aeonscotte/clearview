import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsMenuComponent } from '../settings-menu/settings-menu.component';

@Component({
    selector: 'app-main-menu',
    standalone: true,
    imports: [CommonModule, SettingsMenuComponent],
    templateUrl: './main-menu.component.html',
    styleUrls: ['./main-menu.component.less']
})
export class MainMenuComponent {
    @Output() start = new EventEmitter<void>();
}
