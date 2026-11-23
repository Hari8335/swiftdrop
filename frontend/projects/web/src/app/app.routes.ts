import { Routes } from '@angular/router';
import { roleGuard } from 'shared-auth';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('shared-auth').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('shared-auth').then((m) => m.RegisterComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('shared-auth').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('shared-auth').then((m) => m.ResetPasswordComponent),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('shared-auth').then((m) => m.CallbackComponent),
  },
  {
    path: 'merchant-registration',
    loadComponent: () =>
      import('./pages/merchant/merchant-registration.component').then((m) => m.MerchantRegistrationComponent),
  },
  {
    path: 'customer',
    canActivate: [roleGuard(['CUSTOMER'])],
    loadComponent: () =>
      import('./pages/customer.component').then((m) => m.CustomerComponent),
  },
  { path: 'customer/dashboard', canActivate: [roleGuard(['CUSTOMER'])], loadComponent: () => import('./pages/customer-history/customer-dashboard.component').then((m) => m.CustomerDashboardComponent) },
  { path: 'customer/parcels', canActivate: [roleGuard(['CUSTOMER'])], loadComponent: () => import('./pages/customer-history/customer-parcels.component').then((m) => m.CustomerParcelsComponent) },
  { path: 'customer/parcels/:id', canActivate: [roleGuard(['CUSTOMER'])], loadComponent: () => import('./pages/tracking/parcel-detail.component').then((m) => m.ParcelDetailComponent) },
  {
    path: 'merchant',
    canActivate: [roleGuard(['MERCHANT'])],
    canActivateChild: [roleGuard(['MERCHANT'])],
    loadComponent: () =>
      import('./pages/merchant/merchant-portal.component').then((m) => m.MerchantPortalComponent),
    children: [
      {
        path: 'bulk',
        loadComponent: () => import('./pages/merchant/bulk/merchant-bulk.component').then((m) => m.MerchantBulkComponent),
      },
    ],
  },
  {
    path: 'courier',
    canActivate: [roleGuard(['COURIER'])],
    loadComponent: () =>
      import('./pages/courier.component').then((m) => m.CourierComponent),
  },
  {
    path: 'courier/profile',
    canActivate: [roleGuard(['COURIER'])],
    loadComponent: () => import('./pages/courier-profile.component').then((m) => m.CourierProfileComponent),
  },
  {
    path: 'courier/summary',
    canActivate: [roleGuard(['COURIER'])],
    loadComponent: () => import('./pages/courier-summary.component').then((m) => m.CourierSummaryComponent),
  },
  {
    path: 'admin',
    canActivate: [roleGuard(['ADMIN'])],
    loadComponent: () =>
      import('./pages/admin.component').then((m) => m.AdminComponent),
  },
  {
    path: 'admin/users',
    canActivate: [roleGuard(['ADMIN'])],
    loadComponent: () =>
      import('./pages/admin/admin-users.component').then((m) => m.AdminUsersComponent),
  },
  {
    path: 'admin/merchants',
    canActivate: [roleGuard(['ADMIN'])],
    loadComponent: () =>
      import('./pages/admin/merchant-approval.component').then((m) => m.MerchantApprovalComponent),
  },
  {
    path: 'admin/reports',
    canActivate: [roleGuard(['ADMIN'])],
    loadComponent: () =>
      import('./pages/admin/reports.component').then((m) => m.ReportsComponent),
  },
  {
    path: 'admin/settings',
    canActivate: [roleGuard(['ADMIN'])],
    loadComponent: () =>
      import('./pages/admin/admin-settings.component').then((m) => m.AdminSettingsComponent),
  },
  {
    // One dispatcher portal: shared sidebar + header, six pages inside it.
    path: 'dispatch',
    canActivate: [roleGuard(['DISPATCHER'])],
    loadComponent: () =>
      import('./pages/dispatch/dispatch-layout.component').then((m) => m.DispatchLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/dispatch/dispatch.component').then((m) => m.DispatchComponent),
      },
      {
        path: 'zones',
        loadComponent: () =>
          import('./pages/dispatch/dispatch-zones.component').then((m) => m.DispatchZonesComponent),
      },
      {
        path: 'pricing',
        loadComponent: () =>
          import('./pages/dispatch/dispatch-pricing.component').then((m) => m.DispatchPricingComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/dispatch/dispatch-settings.component').then((m) => m.DispatchSettingsComponent),
      },
    ],
  },
  {
    path: 'dispatcher',
    redirectTo: 'dispatch',
    pathMatch: 'full',
  },
  {
    path: 'track',
    loadComponent: () =>
      import('./pages/track.component').then((m) => m.TrackComponent),
  },
  {
    path: 'track/:trackingNo',
    loadComponent: () =>
      import('./pages/track.component').then((m) => m.TrackComponent),
  },
  {
    path: 'customer/assistant',
    canActivate: [roleGuard(['CUSTOMER'])],
    loadComponent: () =>
      import('./pages/assistant/assistant-chat.component').then(
        (m) => m.AssistantChatComponent
      ),
  },
];
