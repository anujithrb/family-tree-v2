import { Routes } from '@angular/router';
import { authGuard, communityMemberGuard } from './core/auth/auth.guard';
import { communityLandingGuard } from './core/auth/community-landing.guard';
import { ShellComponent } from './core/layout/shell/shell.component';

export const routes: Routes = [
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/verify/:token',
    loadComponent: () =>
      import('./features/auth/verify/verify.component').then((m) => m.VerifyComponent),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'wizard',
        loadComponent: () =>
          import('./features/wizard/user-wizard.component').then((m) => m.UserWizardComponent),
      },
      {
        path: 'communities/:id/tree',
        canActivate: [communityMemberGuard],
        loadComponent: () =>
          import('./features/tree/tree-page.component').then((m) => m.TreePageComponent),
      },
      {
        path: 'communities/:id/relationship',
        canActivate: [communityMemberGuard],
        loadComponent: () =>
          import('./features/relationship/relationship.component').then(
            (m) => m.RelationshipComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: '',
        pathMatch: 'full',
        canActivate: [communityLandingGuard],
        // Guard always redirects — this component is never rendered
        loadComponent: () =>
          import('./features/wizard/user-wizard.component').then((m) => m.UserWizardComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'auth/login' },
];
