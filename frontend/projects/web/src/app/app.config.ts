import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor, AuthService, MockAuthService } from 'shared-auth';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { OsrmRoutingProvider } from './pages/tracking/osrm-routing.provider';
import { ROUTING_PROVIDER, UnconfiguredRoutingProvider } from './pages/tracking/routing.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: ROUTING_PROVIDER,
      useFactory: (http: HttpClient) => environment.routingProvider === 'osrm'
        ? new OsrmRoutingProvider(http)
        : new UnconfiguredRoutingProvider(),
      deps: [HttpClient],
    },
    ...(environment.useMocks
      ? [{ provide: AuthService, useClass: MockAuthService }]
      : []),
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      return authService.initializeSession();
    }),
  ],
};
