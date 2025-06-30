import { Component } from '@angular/core';
import { SettingsMenuComponent } from '../../components/ui/settings-menu/settings-menu.component';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [SettingsMenuComponent],
    template: `<app-settings-menu></app-settings-menu>`
})
export class SettingsComponent {}
