/**
 * ============================================================================
 * FOLDER: client/src/app/
 * ============================================================================
 * Core application directory containing the Angular architecture:
 *   - components/   -> UI views and interactive dialogs
 *   - services/     -> State management & HTTP communication
 *   - guards/       -> Route navigation security
 *   - interceptors/ -> HTTP request/response middleware
 *   - app.routes.ts -> URL-to-component route tree
 *   - app.config.ts -> Global dependency injection providers
 *
 * ============================================================================
 * MODULE: client/src/app/app.ts (Root Shell Component)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Serves as the top-level root component (`<app-root>`) of the Angular application:
 *   1. Imports `RouterOutlet` so child view components can be swapped dynamically.
 *   2. Binds to `app.html` (which renders `<router-outlet></router-outlet>`).
 *   3. Declares the root title signal.
 *
 * COMMUNICATES WITH:
 *   - `client/src/main.ts`: Bootstrapped directly as the root component.
 *   - `client/src/app/app.html`: Provides the template housing the `<router-outlet>`.
 *   - `client/src/app/app.routes.ts`: Angular Router injects the active route component
 *     (e.g., `LoginComponent` or `TicketListComponent`) directly into `<router-outlet>`.
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. `main.ts` calls `bootstrapApplication(App, appConfig)`.
 *   2. Angular finds `<app-root></app-root>` in `index.html` and instantiates this class.
 *   3. `app.html` renders `<router-outlet></router-outlet>`.
 *   4. The router navigates to `/login` or `/tickets`, instantiating and rendering
 *      that component inside the outlet.
 * ============================================================================
 */

import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('client');
}
