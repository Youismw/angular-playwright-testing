/**
 * ============================================================================
 * FOLDER: client/src/app/guards/
 * ============================================================================
 * Route Guards Directory: Contains Angular functional navigation guards
 * that intercept routing requests to prevent unauthorized access to private views.
 *
 * ============================================================================
 * MODULE: client/src/app/guards/auth.guard.ts (Protected Route Gatekeeper)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Implements a modern Angular `CanActivateFn` functional route guard.
 * Before allowing navigation to `/tickets`, this function checks if the user
 * has an active, non-expired JWT token stored in localStorage.
 *
 * COMMUNICATES WITH:
 *   - Attached in `client/src/app/app.routes.ts` on the `/tickets` route.
 *   - Injects `client/src/app/services/auth.service.ts` to call `isAuthenticated()`.
 *   - Injects Angular's `Router` to redirect unauthenticated users to `/login`.
 *   - Tested by Playwright test: "`/tickets` redirects to `/login`".
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   - Scenario A: Logged-in user navigates to `/tickets`:
 *     1. Angular Router invokes `authGuard()`.
 *     2. `authService.isAuthenticated()` reads token from localStorage and checks
 *        the exp timestamp against current time.
 *     3. Token is valid -> returns `true`.
 *     4. Router renders `TicketListComponent`.
 *   - Scenario B: Unauthenticated user directly opens `http://localhost:4200/tickets`:
 *     1. Angular Router invokes `authGuard()`.
 *     2. No token found in localStorage -> returns `false`.
 *     3. Calls `router.navigate(['/login'])`.
 *     4. Browser URL changes to `/login` and renders `LoginComponent`.
 * ============================================================================
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  // Use Angular functional injection
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if token exists and is not expired
  if (authService.isAuthenticated()) {
    return true; // Grant access to the route
  }

  // Deny access and redirect to the login screen
  router.navigate(['/login']);
  return false;
};
