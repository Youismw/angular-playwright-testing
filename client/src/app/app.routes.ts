/**
 * ============================================================================
 * FOLDER: client/src/app/
 * ============================================================================
 * Core application directory.
 *
 * ============================================================================
 * MODULE: client/src/app/app.routes.ts (Client-Side Navigation Routing Table)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Declares the application's URL-to-component mapping routes:
 *   - `/login`   -> Renders LoginComponent.
 *   - `/tickets` -> Renders TicketListComponent, guarded by `authGuard`.
 *   - `''`       -> Default root path redirects to `/tickets`.
 *   - `'**'`     -> Wildcard fallback redirects unknown URLs to `/tickets`.
 *
 * ARCHITECTURAL FLOW & SECURITY:
 *   - Route Guard Protection: When a user visits `/tickets`, Angular's router
 *     pauses and runs `authGuard`. If the user does not have a valid token,
 *     `authGuard` cancels the navigation and redirects to `/login`.
 *
 * COMMUNICATES WITH:
 *   - Consumed by `client/src/app/app.config.ts` via `provideRouter(routes)`.
 *   - `client/src/app/guards/auth.guard.ts`: Guard attached to `/tickets`.
 *   - `client/src/app/components/login/login.component.ts`: Target for `/login`.
 *   - `client/src/app/components/ticket-list/ticket-list.component.ts`: Target for `/tickets`.
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. User opens `http://localhost:4200/`.
 *   2. Router matches empty path `''` and redirects to `/tickets`.
 *   3. Router evaluates `canActivate: [authGuard]` for `/tickets`.
 *   4. `authGuard` checks `AuthService.isAuthenticated()`.
 *      - If not logged in -> redirected to `/login` (shows LoginComponent).
 *      - If logged in -> loads TicketListComponent into `<router-outlet>`.
 * ============================================================================
 */

import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { TicketListComponent } from './components/ticket-list/ticket-list.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Public Login and Register views
  { path: 'login', component: LoginComponent },
  { path: 'register', component: LoginComponent },

  // Protected Dashboard ticket view (guarded by authGuard)
  { path: 'tickets', component: TicketListComponent, canActivate: [authGuard] },

  // Redirect root path to default tickets view
  { path: '', redirectTo: '/tickets', pathMatch: 'full' },

  // Wildcard fallback: any unmatched URL redirects to tickets
  { path: '**', redirectTo: '/tickets' },
];
