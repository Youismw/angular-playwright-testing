/**
 * ============================================================================
 * FOLDER: client/src/app/components/login/
 * ============================================================================
 * Login View Directory: Contains the sign-in form component, CSS styling,
 * and component template.
 *
 * ============================================================================
 * MODULE: client/src/app/components/login/login.component.ts (Sign-In Controller)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Controls the login view logic:
 *   1. Auto-Redirect: If user is already authenticated on view load, redirects to `/tickets`.
 *   2. Demo Credential Quick-Fill: Fills default credentials (`qa.user@quicktix.test`).
 *   3. Form Submission: Submits email and password to `AuthService.login()`.
 *   4. State Handling: Sets `loading` signal during in-flight network request.
 *   5. Error Feedback: If server returns HTTP 401, sets `errorMessage` signal, which
 *      renders the visible `[data-testid="login-error"]` alert on the template.
 *
 * COMMUNICATES WITH:
 *   - `client/src/app/services/auth.service.ts`: Calls `login()` and `isAuthenticated()`.
 *   - `@angular/router`: Navigates to `/tickets` upon successful login.
 *   - Target for route `/login` in `client/src/app/app.routes.ts`.
 *   - Tested by Playwright Test 1: "Bad credentials show login-error".
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. User types invalid password and clicks "Sign In".
 *   2. `onSubmit()` sets `loading = true`.
 *   3. Calls `authService.login()` -> posts to `/api/auth/login`.
 *   4. Backend rejects with 401 Unauthorized.
 *   5. RxJS error callback triggers: sets `loading = false`, `errorMessage = 'Invalid email or password'`.
 *   6. Template renders `<div data-testid="login-error">` with the error banner.
 * ============================================================================
 */

import { Component, OnInit, signal, ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  // Cleans up RxJS subscriptions automatically when component is unmounted
  private destroyRef = inject(DestroyRef);

  // Form field two-way bindings
  email = '';
  password = '';

  // Reactive Signals for UI state
  isLoginMode = signal(true);
  errorMessage = signal('');
  loading = signal(false);

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // If the user already has an active session, skip login view entirely
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/tickets']);
      return;
    }

    // Support direct navigation to /register
    if (this.router.url?.includes('/register')) {
      this.isLoginMode.set(false);
    }
  }

  /**
   * Switches between Sign In and Create Account modes.
   */
  setMode(login: boolean): void {
    this.isLoginMode.set(login);
    this.errorMessage.set('');
    this.cdr.markForCheck();
  }

  /**
   * Helper action for development and manual QA testing to populate demo credentials
   * and optionally sign in automatically.
   */
  fillDemoCredentials(autoSubmit: boolean = false): void {
    this.isLoginMode.set(true);
    this.email = 'qa.user@quicktix.test';
    this.password = 'Passw0rd!test';
    this.errorMessage.set('');
    this.cdr.markForCheck();
    if (autoSubmit) {
      this.onSubmit();
    }
  }

  /**
   * Submits user credentials to AuthService (login or register based on active mode).
   */
  onSubmit(): void {
    this.errorMessage.set('');
    this.loading.set(true);
    this.cdr.markForCheck();

    const cleanEmail = this.email.trim();
    const cleanPassword = this.password.trim();

    if (!cleanEmail) {
      this.loading.set(false);
      this.errorMessage.set('Please enter your email address');
      this.cdr.markForCheck();
      return;
    }

    if (!this.isLoginMode() && cleanPassword.length < 6) {
      this.loading.set(false);
      this.errorMessage.set('Password must be at least 6 characters long');
      this.cdr.markForCheck();
      return;
    }

    const authObservable = this.isLoginMode()
      ? this.authService.login(cleanEmail, cleanPassword)
      : this.authService.register(cleanEmail, cleanPassword);

    authObservable
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.cdr.markForCheck();
          // Navigate to tickets dashboard upon successful token receipt
          this.router.navigate(['/tickets']);
        },
        error: (err) => {
          this.loading.set(false);
          // Extract specific message from backend response or provide clear fallback
          if (err.status === 401) {
            this.errorMessage.set(err.error?.message || 'Invalid email or password');
          } else if (err.status === 409) {
            this.errorMessage.set(err.error?.message || 'An account with this email already exists');
          } else {
            const fallback = this.isLoginMode()
              ? 'Failed to sign in. Please try again.'
              : 'Failed to create account. Please try again.';
            this.errorMessage.set(err.error?.message || fallback);
          }
          this.cdr.markForCheck();
        },
      });
  }
}
