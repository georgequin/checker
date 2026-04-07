import { Routes } from '@angular/router';
import { HostListComponent } from './features/host-list/host-list.component';
import { SettingsComponent } from './features/settings/settings.component';
import { LoginComponent } from './features/login/login.component';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'endpoints', component: HostListComponent, canActivate: [authGuard] },
    { path: 'settings', component: SettingsComponent, canActivate: [authGuard] }
];
