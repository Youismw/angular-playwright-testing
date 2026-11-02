/**
 * ============================================================================
 * FOLDER: client/src/app/
 * ============================================================================
 * Core application directory.
 *
 * ============================================================================
 * MODULE: client/src/app/app.config.ts (Application Dependency Providers)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Defines the central `ApplicationConfig` configuration object.
 * In modern Angular (v17+ standalone architecture), this replaces the traditional
 * `AppModule` and configures the core application services and DI providers:
 *   1. `provideBrowserGlobalErrorListeners()`: Catches unhandled global browser errors.
 *   2. `provideRouter(routes)`: Initializes the Angular Router with routes from `app.routes.ts`.
 *   3. `provideHttpClient(withInterceptors([authInterceptor]))`: Provides Angular's
 *      `HttpClient` service globally and registers `authInterceptor` to run on EVERY
 *      outgoing HTTP request and incoming response.
 *
 * COMMUNICATES WITH:
 *   - Consumed by `client/src/main.ts` in `bootstrapApplication(App, appConfig)`.
 *   - `client/src/app/app.routes.ts`: Passes the routing table into `provideRouter()`.
 *   - `client/src/app/interceptors/auth.interceptor.ts`: Registers interceptor into `HttpClient`.
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. `main.ts` passes `appConfig` into `bootstrapApplication`.
 *   2. Angular creates the root injector.
 *   3. When any service (e.g. `AuthService` or `TicketService`) injects `HttpClient`,
 *      it receives this configured client which automatically routes through `authInterceptor`.
 *   4. When user clicks a link or `router.navigate()` is called, `provideRouter` handles it.
 * ============================================================================
 */

import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // 1. Global unhandled error listening in the browser
    provideBrowserGlobalErrorListeners(),

    // 2. Client-side URL routing and route guard enforcement
    provideRouter(routes),

    // 3. HTTP Client with global authentication token injection
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
