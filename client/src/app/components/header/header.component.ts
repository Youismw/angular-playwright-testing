/**
 * ============================================================================
 * FOLDER: client/src/app/components/header/
 * ============================================================================
 * Header Component Directory: Contains the navigation header UI, CSS styling,
 * and component template used across application layouts.
 *
 * ============================================================================
 * MODULE: client/src/app/components/header/header.component.ts (Navigation Bar)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Reusable navigation bar component displayed at the top of the viewport:
 *   - Supports two visual variants: `'login'` (simplified) and `'dashboard'` (full).
 *   - Displays branding logo, status badge, and logged-in user email.
 *   - Emits an `@Output() logout` event when the user clicks the "Sign Out" button.
 *
 * COMMUNICATES WITH:
 *   - Embedded inside `LoginComponent` template and `TicketListComponent` template.
 *   - Receives inputs from parent: `variant`, `userEmail`, `badgeText`.
 *   - Emits logout event up to parent `TicketListComponent.onLogout()`.
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. `TicketListComponent` renders `<app-header [userEmail]="userEmail" (logout)="onLogout()">`.
 *   2. Header displays the authenticated email (e.g. `qa.user@quicktix.test`).
 *   3. User clicks "Sign Out" button.
 *   4. `onLogout()` fires `this.logout.emit()`.
 *   5. Parent component receives the event and invokes `authService.logout()`.
 * ============================================================================
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  // Configures visual layout ('login' vs 'dashboard')
  @Input() variant: 'login' | 'dashboard' = 'dashboard';
  // Badge chip label (e.g., 'CORE TRACKER')
  @Input() badgeText = 'CORE TRACKER';
  // Displayed in user profile indicator
  @Input() userEmail = '';
  // User authorization role ('user' | 'admin')
  @Input() userRole: 'user' | 'admin' = 'user';
  // Controls visibility of user action buttons
  @Input() showUserActions = true;

  // Notifies parent container when sign out is initiated
  @Output() logout = new EventEmitter<void>();

  onLogout(): void {
    this.logout.emit();
  }
}
