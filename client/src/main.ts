/**
 * ============================================================================
 * FOLDER: client/src/
 * ============================================================================
 * Root directory for the Angular Single Page Application (SPA).
 * Contains index.html (the single web page shell), global styles.css, and
 * the main application entry point (main.ts).
 *
 * ============================================================================
 * MODULE: client/src/main.ts (Client Bootstrap Entry Point)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * This is the first JavaScript/TypeScript file executed by the browser when loading
 * the Angular client application. It initializes the Angular standalone runtime:
 *   1. Imports `bootstrapApplication` from Angular Platform Browser.
 *   2. Imports the root standalone component `App` from `app/app.ts`.
 *   3. Imports global Dependency Injection providers (`appConfig`) from `app/app.config.ts`.
 *   4. Bootstraps the application into `<app-root>` in `index.html`.
 *
 * COMMUNICATES WITH:
 *   - `client/src/index.html`: Finds and replaces `<app-root></app-root>` with the rendered UI.
 *   - `client/src/app/app.ts`: Mounts the root component holding the `<router-outlet>`.
 *   - `client/src/app/app.config.ts`: Injects routing, HTTP client, and auth interceptor.
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. User visits `http://localhost:4200` (or `http://localhost:3000` in production).
 *   2. Browser downloads the compiled JavaScript bundle specified by `angular.json`.
 *   3. `main.ts` runs: `bootstrapApplication(App, appConfig)` is called.
 *   4. Angular DI container is populated with `provideRouter` and `provideHttpClient`.
 *   5. Root component `<app-root>` renders.
 *   6. The Angular Router takes over and evaluates the URL to determine which
 *      page component to show.
 * ============================================================================
 */

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Launch the standalone Angular application with the configured global providers
bootstrapApplication(App, appConfig)
  .catch((err) => console.error('Angular Bootstrap Error:', err));
