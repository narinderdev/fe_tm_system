import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { LoginComponent } from './components/login/login';
import { SignUpComponent } from './components/sign-up/sign-up';
import { VerifyOtpComponent } from './components/verify-otp/verify-otp';
import { VerifyAccountComponent } from './components/verify-account/verify-account';
import { VerifyAuthenticatorComponent } from './components/verify-authenticator/verify-authenticator';
import { AuthenticatorVerifyComponent } from './components/authenticator-verify/authenticator-verify';
import { TmSystemComponent } from './components/tm-system/tm-system';
import { MfaChallengeGuard } from './guards/mfa-challenge.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent },
  { path: 'sign-up', component: SignUpComponent },
  {
    path: 'set-password',
    loadComponent: () =>
      import('./components/set-password/set-password').then((m) => m.SetPasswordComponent)
  },
  { path: 'verify-otp', component: VerifyOtpComponent },
  { path: 'verify-account', component: VerifyAccountComponent },
  { path: 'authenticator-verify', component: AuthenticatorVerifyComponent, canActivate: [MfaChallengeGuard] },
  { path: 'verify-authenticator', component: VerifyAuthenticatorComponent },
  { path: 'settings/mfa', pathMatch: 'full', redirectTo: 'tm-system/mfa' },
  { path: 'dashboard', pathMatch: 'full', redirectTo: 'tm-system/dashboard' },
  { path: 'tm-system', pathMatch: 'full', redirectTo: 'tm-system/dashboard' },
  {
    path: 'tm-system/technicians/add',
    loadComponent: () =>
      import('./components/technician-form/technician-form').then((m) => m.TechnicianFormComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'tm-system/technicians/edit/:id',
    loadComponent: () =>
      import('./components/technician-form/technician-form').then((m) => m.TechnicianFormComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'technicians/add',
    loadComponent: () =>
      import('./components/technician-form/technician-form').then((m) => m.TechnicianFormComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'technicians/edit/:id',
    loadComponent: () =>
      import('./components/technician-form/technician-form').then((m) => m.TechnicianFormComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'tm-system/time-sheet/:id',
    loadComponent: () =>
      import('./components/timesheet-view/timesheet-view').then((m) => m.TimesheetViewComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'tm-system/work-orders/:id',
    loadComponent: () =>
      import('./components/tm-work-order-view').then((m) => m.TmWorkOrderViewComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'tm-system/leaves/:technicianId/:leaveId',
    loadComponent: () =>
      import('./components/view-leave/view-leave').then((m) => m.ViewLeaveComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'tm-system/holidays/:id',
    loadComponent: () =>
      import('./components/view-holiday/view-holiday').then((m) => m.ViewHolidayComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'tm-system/expenses/:id',
    loadComponent: () =>
      import('./components/view-expense/view-expense').then((m) => m.ViewExpenseComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'tm-system/technicians/:id',
    loadComponent: () =>
      import('./components/view-technician/view-technician').then((m) => m.ViewTechnicianComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'tm-system/technicians/:id/availability',
    loadComponent: () =>
      import('./components/technician-availability/technician-availability').then(
        (m) => m.TechnicianAvailabilityComponent
      ),
    canActivate: [AuthGuard]
  },
  { path: 'tm-system/:tab', component: TmSystemComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: 'login' }
];
