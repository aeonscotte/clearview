import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ClearviewComponent } from './pages/demo/clearview/clearview.component';
import { AboutComponent } from './pages/about/about.component';

export const routes: Routes = [
    { path: 'home', component: HomeComponent },
    { path: 'demo', component: ClearviewComponent },
    { path: 'about', component: AboutComponent },
    { path: '', redirectTo: 'home', pathMatch: 'full' }, // Default route to home
    { path: '**', redirectTo: 'home' }, // Wildcard route for any other unknown paths
];