// src/app/pages/home/home.component.ts
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-home',
    imports: [CommonModule, RouterModule],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.less']
})
export class HomeComponent {

}