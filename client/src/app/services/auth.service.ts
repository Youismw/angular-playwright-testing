/**
 * ============================================================================
 * FOLDER: client/src/app/services/
 * ============================================================================
 * Service Layer: Contains root-level singleton services (`@Injectable({ providedIn: 'root' })`)
 * that encapsulate business logic, backend API calls, and reactive application state.
 *
 * ============================================================================
 * MODULE: client/src/app/services/auth.service.ts (Client Authentication & Token Vault)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Serves as the single source of truth for user authentication and credentials:
 *   1. Token Storage: Saves and retrieves the JWT in `localStorage` under key `'token'`.
 *   2. Reactive Auth State: Exposes `currentUserToken` as an Angular Signal.
 *   3. Multi-Tab Synchronization: Listens to browser `storage` events so logging out
 *      or user activity in one tab immediately syncs across all open tabs.
 *   4. User Activity & Inactivity Timeout: Monitors interaction events (`mousedown`, `keydown`,
 *      `scroll`, `touchstart`, `mousemove`) to keep active users signed in, while auto-logging out
 *      idle sessions after 15 minutes of inactivity.
 *   5. Login & Logout: Sends login requests to `/api/auth/login` and handles teardown.
 *   6. JWT Token Inspection: Base64 decodes the token payload in-browser to read
 *      the user's email and verify the expiration timestamp (`exp`).
 *
 * COMMUNICATES WITH:
 *   - Backend: Sends `POST /api/auth/login` to `server/src/routes/auth.routes.ts`.
 *   - Consumed by `client/src/app/guards/auth.guard.ts` (checks `isAuthenticated()`).
 *   - Consumed by `client/src/app/interceptors/auth.interceptor.ts` (retrieves token).
 *   - Consumed by `LoginComponent`, `HeaderComponent`, and `TicketListComponent`.
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. User submits login form -> calls `authService.login(email, password)`.
 *   2. Server returns `{ token: 'eyJ...' }`.
 *   3. RxJS `tap` saves token to `localStorage` and updates `currentUserToken` signal.
 *   4. User navigates to dashboard.
 *   5. `HeaderComponent` calls `getUserEmail()` -> decodes payload to display email on navbar.
 *   6. When user clicks Logout -> calls `logout()`, purges `localStorage`, and redirects to `/login`.
 * ============================================================================
 */

import { Injectable, signal, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export interface LoginResponse {
  token: string;
}

/**
 * Decodes the Base64Url payload segment of a JWT token without external libraries.
 */
function decodeJwtPayload(token: string): { id?: string; email?: string; role?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  private readonly tokenKey = 'token';
  private readonly lastActivityKey = 'auth_last_activity';

  // Configurable idle inactivity window (default: 15 minutes)
  inactivityTimeoutMs: number = 15 * 60 * 1000;

  // Reactive Signal holding current active token string (or null if logged out)
  readonly currentUserToken = signal<string | null>(this.getToken());

  private tokenExpirationTimer: ReturnType<typeof setTimeout> | null = null;
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private lastActivityTimestamp = 0;
  private userActivityListenersAttached = false;
  private boundActivityListener: (() => void) | null = null;

  constructor(private http: HttpClient, private router: Router) {
    const initialToken = this.getToken();
    if (initialToken && !this.isTokenExpired(initialToken)) {
      this.scheduleAutoLogout(initialToken);
      this.startInactivityTracker();
    }

    // Cross-Tab Synchronization: handles multi-tab logout and shared activity
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event: StorageEvent) => {
        if (event.key === this.tokenKey) {
          this.currentUserToken.set(event.newValue);
          this.scheduleAutoLogout(event.newValue);
          if (event.newValue && !this.isTokenExpired(event.newValue)) {
            this.startInactivityTracker();
          } else {
            this.stopInactivityTracker();
          }
          if (!event.newValue && !this.router.url.includes('/login')) {
            this.router.navigate(['/login']);
          }
        } else if (event.key === this.lastActivityKey && event.newValue) {
          // User was active in another tab: reset inactivity timer here as well
          this.resetInactivityTimer();
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.stopInactivityTracker();
  }

  /**
   * Initializes user interaction event listeners and starts the inactivity countdown.
   * Listens for mouse movements, clicks, keystrokes, touches, and scrolling.
   */
  startInactivityTracker(): void {
    if (typeof window !== 'undefined' && !this.userActivityListenersAttached) {
      this.boundActivityListener = () => this.recordUserActivity();
      const events: (keyof WindowEventMap)[] = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
      events.forEach((event) => {
        window.addEventListener(event, this.boundActivityListener!, { passive: true });
      });
      this.userActivityListenersAttached = true;
    }

    this.lastActivityTimestamp = Date.now();
    this.resetInactivityTimer();
  }

  /**
   * Resets the inactivity timer countdown. If the user remains idle for inactivityTimeoutMs,
   * they are automatically logged out.
   */
  resetInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    const token = this.getToken();
    if (!token || this.isTokenExpired(token)) return;

    this.inactivityTimer = setTimeout(() => {
      this.logout();
    }, this.inactivityTimeoutMs);
  }

  /**
   * Records user interaction and refreshes the idle timer.
   * Throttled to at most once per 1000ms to avoid UI and localStorage overhead.
   */
  recordUserActivity(): void {
    const token = this.getToken();
    if (!token || this.isTokenExpired(token)) return;

    const now = Date.now();
    if (now - this.lastActivityTimestamp < 1000) return;
    this.lastActivityTimestamp = now;

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.lastActivityKey, now.toString());
      } catch {
        // Ignore storage write errors (e.g. quota exceeded)
      }
    }

    this.resetInactivityTimer();
  }

  /**
   * Stops the inactivity timer and cleanly detaches window event listeners.
   */
  stopInactivityTracker(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    if (typeof window !== 'undefined' && this.userActivityListenersAttached && this.boundActivityListener) {
      const events: (keyof WindowEventMap)[] = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
      events.forEach((event) => {
        window.removeEventListener(event, this.boundActivityListener!);
      });
      this.userActivityListenersAttached = false;
      this.boundActivityListener = null;
    }
  }

  /**
   * Schedules an automatic logout timer based on the token's exp claim.
   * Serves as an absolute security ceiling (e.g. token expired on backend).
   */
  scheduleAutoLogout(token: string | null): void {
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
      this.tokenExpirationTimer = null;
    }

    if (!token) return;

    const payload = decodeJwtPayload(token);
    if (!payload || !payload.exp) return;

    const remainingMs = payload.exp * 1000 - Date.now();
    if (remainingMs <= 0) {
      this.logout();
      return;
    }

    this.tokenExpirationTimer = setTimeout(() => {
      this.logout();
    }, remainingMs);
  }

  /**
   * Submits credentials to the backend login endpoint.
   * On success, persists token, starts inactivity tracker, and arms auto-logout timer.
   */
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/auth/login', { email, password }).pipe(
      tap((response) => {
        if (response && response.token) {
          localStorage.setItem(this.tokenKey, response.token);
          this.currentUserToken.set(response.token);
          this.scheduleAutoLogout(response.token);
          this.startInactivityTracker();
        }
      })
    );
  }

  /**
   * Registers a new account with the backend.
   * On success, persists token, starts inactivity tracker, and signs in.
   */
  register(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/auth/register', { email, password }).pipe(
      tap((response) => {
        if (response && response.token) {
          localStorage.setItem(this.tokenKey, response.token);
          this.currentUserToken.set(response.token);
          this.scheduleAutoLogout(response.token);
          this.startInactivityTracker();
        }
      })
    );
  }

  /**
   * Purges stored credentials, clears all timers, removes event listeners, and redirects to login view.
   */
  logout(): void {
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
      this.tokenExpirationTimer = null;
    }
    this.stopInactivityTracker();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.lastActivityKey);
    }
    this.currentUserToken.set(null);
    this.router.navigate(['/login']);
  }

  /**
   * Reads raw token from localStorage.
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Decodes JWT payload to display user email on the navigation header.
   */
  getUserEmail(): string {
    const token = this.getToken();
    if (!token) return '';
    const payload = decodeJwtPayload(token);
    return payload?.email || '';
  }

  /**
   * Decodes JWT payload to inspect user role ('user' | 'admin').
   */
  getUserRole(): 'user' | 'admin' {
    const token = this.getToken();
    if (!token) return 'user';
    const payload = decodeJwtPayload(token);
    return payload?.role === 'admin' ? 'admin' : 'user';
  }

  isAdmin(): boolean {
    return this.getUserRole() === 'admin';
  }

  /**
   * Inspects exp claim with a 15-second grace window to prevent edge-case race conditions.
   */
  isTokenExpired(token: string): boolean {
    const payload = decodeJwtPayload(token);
    if (!payload || !payload.exp) return true;
    const leewaySeconds = 15;
    return Date.now() >= (payload.exp - leewaySeconds) * 1000;
  }

  /**
   * Synchronously checks if the current user possesses a non-expired token.
   * Used by authGuard to protect routes.
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    if (this.isTokenExpired(token)) {
      this.stopInactivityTracker();
      localStorage.removeItem(this.tokenKey);
      this.currentUserToken.set(null);
      /**if not authenticated then redirect to login  */
      return false;
    }
    return true;
  }
}
