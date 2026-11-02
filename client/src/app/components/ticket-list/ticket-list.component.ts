/**
 * ============================================================================
 * FOLDER: client/src/app/components/ticket-list/
 * ============================================================================
 * Ticket Dashboard Directory: Contains the primary dashboard view component,
 * filtering toolbar, ticket cards grid, and modal coordination logic.
 *
 * ============================================================================
 * MODULE: client/src/app/components/ticket-list/ticket-list.component.ts (Dashboard Controller)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Serves as the central stateful orchestrator for the user's ticket workspace:
 *   1. Data Stream: Manages the `tickets` signal (`signal<Ticket[]>([])`).
 *   2. Reactive Filtering: Uses an RxJS `filterSubject` and `switchMap` to ensure
 *      rapid dropdown filter changes cancel out-of-order in-flight HTTP requests.
 *   3. Modal Management: Coordinates the open/close lifecycle and state transitions
 *      for `<app-ticket-form>` and `<app-confirm-dialog>`.
 *   4. Immutable State Updates:
 *      - Creation: Prepends newly created tickets to the front of the list.
 *      - Update: Replaces the edited ticket in-place or removes it if filtered out.
 *      - Deletion: Removes the deleted ticket from the reactive array.
 *   5. Authentication & Sign Out: Displays user email and delegates logout to `AuthService`.
 *
 * COMMUNICATES WITH:
 *   - Services:
 *     - `client/src/app/services/ticket.service.ts`: Calls all CRUD methods.
 *     - `client/src/app/services/auth.service.ts`: Fetches user email and handles logout.
 *   - Child Components:
 *     - `HeaderComponent`: Top navigation bar.
 *     - `TicketComponent`: Child card for each ticket.
 *     - `TicketFormComponent`: Creation & edit modal.
 *     - `ConfirmDialogComponent`: Deletion confirmation dialog.
 *   - Route: Bound to protected route `/tickets` in `client/src/app/app.routes.ts`.
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. User navigates to `/tickets` -> `ngOnInit()` triggers `loadTickets()`.
 *   2. `filterSubject` emits `undefined` (representing 'All').
 *   3. `switchMap` calls `ticketService.getTickets()`.
 *   4. Response arrives: sets `tickets.set(data)` and `loading.set(false)`.
 *   5. Template loops over `tickets()` and renders `<app-ticket>` components.
 *   6. User clicks "+ Create Ticket" -> opens modal -> saves ticket.
 *   7. New ticket returned from server is prepended to `tickets` signal -> DOM updates instantly.
 * ============================================================================
 */

import { Component, OnInit, signal, computed, ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TicketService, Ticket, TicketStatus } from '../../services/ticket.service';
import { AuthService } from '../../services/auth.service';
import { HeaderComponent } from '../header/header.component';
import { TicketComponent } from '../ticket/ticket.component';
import { TicketFormComponent, TicketFormData } from '../ticket-form/ticket-form.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-ticket-list',
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    TicketComponent,
    TicketFormComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './ticket-list.component.html',
  styleUrl: './ticket-list.component.css',
})
export class TicketListComponent implements OnInit {
  // Subscription lifecycle manager
  private destroyRef = inject(DestroyRef);
  // Reactive stream for filter events
  private filterSubject = new Subject<string | undefined>();

  // --------------------------------------------------------------------------
  // Reactive Signals for UI State
  // --------------------------------------------------------------------------
  tickets = signal<Ticket[]>([]);
  loading = signal(true);
  selectedStatus = 'All';

  // Live text search query & category tabs inspired by modern MEAN dashboard
  searchQuery = signal<string>('');
  statusTabs = ['All', 'Open', 'In Progress', 'Resolved', 'Closed'];

  // Reactive computed signals
  filteredTickets = computed(() => {
    const list = this.tickets();
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return list;
    return list.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query))
    );
  });

  ticketStats = computed(() => {
    const list = this.tickets();
    return {
      total: list.length,
      open: list.filter((t) => t.status === 'Open').length,
      inProgress: list.filter((t) => t.status === 'In Progress').length,
      resolved: list.filter((t) => t.status === 'Resolved').length,
      closed: list.filter((t) => t.status === 'Closed').length,
    };
  });

  // Form Modal State (Creation and Edit)
  isFormModalOpen = signal(false);
  editingTicket: Ticket | null = null;
  isSubmitting = signal(false);
  formServerError = signal('');

  // Delete Confirmation Modal State
  isConfirmModalOpen = signal(false);
  deletingTicket: Ticket | null = null;

  constructor(
    private ticketService: TicketService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Setup reactive pipeline with switchMap to avoid race conditions when switching filters
    this.filterSubject
      .pipe(
        switchMap((filterStatus) => {
          this.loading.set(true);
          this.cdr.markForCheck();
          return this.ticketService.getTickets(filterStatus).pipe(
            catchError(() => {
              this.loading.set(false);
              this.cdr.markForCheck();
              return of([]);
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((data) => {
        this.tickets.set(data);
        this.loading.set(false);
        this.cdr.markForCheck();
      });

    // Initial data fetch
    this.loadTickets();
  }

  /**
   * Pushes the current filter value through the RxJS switchMap pipeline.
   */
  loadTickets(): void {
    const filterStatus = this.selectedStatus === 'All' ? undefined : this.selectedStatus;
    this.filterSubject.next(filterStatus);
  }

  onFilterChange(): void {
    this.loadTickets();
  }

  selectTab(tab: string): void {
    if (this.selectedStatus !== tab) {
      this.selectedStatus = tab;
      this.onFilterChange();
    }
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  onQuickStatusChange(change: { id: string; status: TicketStatus }): void {
    this.ticketService
      .updateTicket(change.id, { status: change.status })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          const current = [...this.tickets()];
          const index = current.findIndex((t) => t._id === updated._id);
          if (index !== -1) {
            if (this.selectedStatus === 'All' || this.selectedStatus === updated.status) {
              current[index] = updated;
              this.tickets.set(current);
            } else {
              current.splice(index, 1);
              this.tickets.set(current);
            }
            this.cdr.markForCheck();
          }
        },
        error: () => {
          // Re-sync ticket list from server if quick-status mutation fails so the <select> reverts cleanly
          this.loadTickets();
        },
      });
  }

  // --------------------------------------------------------------------------
  // Create & Edit Modal Actions
  // --------------------------------------------------------------------------
  openCreateModal(): void {
    this.editingTicket = null;
    this.formServerError.set('');
    this.isFormModalOpen.set(true);
    this.cdr.markForCheck();
  }

  openEditModal(ticket: Ticket): void {
    this.editingTicket = ticket;
    this.formServerError.set('');
    this.isFormModalOpen.set(true);
    this.cdr.markForCheck();
  }

  closeFormModal(): void {
    this.isFormModalOpen.set(false);
    this.editingTicket = null;
    this.formServerError.set('');
    this.cdr.markForCheck();
  }

  /**
   * Handles save events emitted by TicketFormComponent (both create and update).
   */
  onSaveTicket(formData: TicketFormData): void {
    this.isSubmitting.set(true);
    this.formServerError.set('');
    this.cdr.markForCheck();

    if (this.editingTicket) {
      // ------------------------------------------------------------------------
      // UPDATE FLOW (PUT /api/tickets/:id)
      // ------------------------------------------------------------------------
      const ticketId = this.editingTicket._id;
      this.ticketService
        .updateTicket(ticketId, formData)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (updated) => {
            this.isSubmitting.set(false);
            this.closeFormModal();
            const current = [...this.tickets()];
            const index = current.findIndex((t) => t._id === updated._id);
            if (index !== -1) {
              // If status still matches active filter, replace in-place
              if (this.selectedStatus === 'All' || this.selectedStatus === updated.status) {
                current[index] = updated;
                this.tickets.set(current);
              } else {
                // Otherwise remove from current view
                current.splice(index, 1);
                this.tickets.set(current);
              }
            } else {
              if (this.selectedStatus === 'All' || this.selectedStatus === updated.status) {
                this.loadTickets();
              }
            }
            this.cdr.markForCheck();
          },
          error: (err) => {
            this.isSubmitting.set(false);
            this.formServerError.set(err.error?.message || 'Failed to update ticket');
            this.cdr.markForCheck();
          },
        });
    } else {
      // ------------------------------------------------------------------------
      // CREATE FLOW (POST /api/tickets)
      // ------------------------------------------------------------------------
      this.ticketService
        .createTicket(formData)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (created) => {
            this.isSubmitting.set(false);
            this.closeFormModal();
            // Prepend new ticket to top of list if matching active filter
            if (this.selectedStatus === 'All' || this.selectedStatus === created.status) {
              this.tickets.set([created, ...this.tickets()]);
            }
            this.cdr.markForCheck();
          },
          error: (err) => {
            this.isSubmitting.set(false);
            this.formServerError.set(err.error?.message || 'Failed to create ticket');
            this.cdr.markForCheck();
          },
        });
    }
  }

  // --------------------------------------------------------------------------
  // Delete Modal Actions
  // --------------------------------------------------------------------------
  openDeleteModal(ticket: Ticket): void {
    this.deletingTicket = ticket;
    this.isConfirmModalOpen.set(true);
    this.cdr.markForCheck();
  }

  closeDeleteModal(): void {
    this.isConfirmModalOpen.set(false);
    this.deletingTicket = null;
    this.cdr.markForCheck();
  }

  /**
   * Confirms deletion and issues DELETE request to backend.
   */
  onConfirmDelete(): void {
    if (!this.deletingTicket) return;

    const id = this.deletingTicket._id;
    this.ticketService
      .deleteTicket(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Remove deleted ticket from reactive signal array
          this.tickets.set(this.tickets().filter((t) => t._id !== id));
          this.closeDeleteModal();
          this.cdr.markForCheck();
        },
        error: () => {
          this.closeDeleteModal();
          this.cdr.markForCheck();
        },
      });
  }

  // --------------------------------------------------------------------------
  // User Session Properties
  // --------------------------------------------------------------------------
  get userEmail(): string {
    return this.authService.getUserEmail();
  }

  get userRole(): 'user' | 'admin' {
    return this.authService.getUserRole();
  }

  onLogout(): void {
    this.authService.logout();
  }
}
