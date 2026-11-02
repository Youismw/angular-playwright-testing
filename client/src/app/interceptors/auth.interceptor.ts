/**
 * ============================================================================
 * FOLDER: client/src/app/interceptors/
 * ============================================================================
 * Interceptor Layer: Contains Angular HTTP interceptor functions that intercept,
 * mutate, and observe all outgoing HTTP requests and incoming HTTP responses.
 *
 * ============================================================================
 * MODULE: client/src/app/interceptors/auth.interceptor.ts (Automatic Bearer Stamping)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Acts as an automated postal checkpoint for Angular's `HttpClient`:
 *   1. Outgoing Requests: If the user is logged in (has a token) and the request
 *      is targeting `/api/...`, it automatically clones the request and injects:
 *        `Authorization: Bearer <token>`
 *      This relieves all components and services (like TicketService) from having
 *      to manually manage auth headers.
 *   2. Incoming Responses: If the server returns `401 Unauthorized` on any authenticated
 *      request (meaning the token expired or was invalidated), it automatically calls
 *      `authService.logout()`, wiping localStorage and redirecting to `/login`.
 *
 * COMMUNICATES WITH:
 *   - Registered globally in `client/src/app/app.config.ts`.
 *   - Injects `client/src/app/services/auth.service.ts` to get token / trigger logout.
 *   - Intercepts requests sent by `client/src/app/services/ticket.service.ts`.
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   - Scenario A: TicketService calls `this.http.get('/api/tickets')`:
 *     1. Interceptor triggers before network dispatch.
 *     2. `authService.getToken()` retrieves token `'eyJhbGci...'` from localStorage.
 *     3. Clones request and sets header `Authorization: Bearer eyJhbGci...`.
 *     4. Express backend receives and authenticates the request.
 *   - Scenario B: Token expires while user has dashboard open:
 *     1. User clicks 'Delete Ticket'.
 *     2. Server rejects request with `HTTP 401 Unauthorized`.
 *     3. RxJS `catchError` catches 401 error.
 *     4. Calls `authService.logout()` -> localStorage cleared -> redirected to `/login`.
 * ============================================================================
 */

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  let modifiedReq = req;
  // Match relative /api requests or absolute URLs pointing to /api
  const isApiRequest = req.url.startsWith('/api') || /^(https?:)?\/\/[^/]+\/api/.test(req.url);

  // 1. Attach Bearer token to authenticated API requests
  if (token && isApiRequest) {
    modifiedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // 2. Process request pipeline and observe response for 401 errors
  return next(modifiedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // If server returns 401 on an authenticated API request, log out and redirect to /login
      // (Ignore /api/auth/login since wrong password legitimately returns 401)
      if (error.status === 401 && !req.url.includes('/api/auth/login')) {
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
