import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-about',
    imports: [CommonModule, RouterModule],
    templateUrl: './about.component.html',
    styleUrls: ['./about.component.less']
})
export class AboutComponent {

}