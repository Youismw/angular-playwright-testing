/**
 * ============================================================================
 * FOLDER: client/src/app/components/ticket/
 * ============================================================================
 * Ticket Card Component Directory: Contains the individual ticket display card,
 * status badge styles, and action buttons.
 *
 * ============================================================================
 * MODULE: client/src/app/components/ticket/ticket.component.ts (Ticket Card View)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Presentational component that renders an individual ticket card:
 *   1. Accepts `@Input() ticket` object (title, description, priority, status, date).
 *   2. Generates dynamic CSS classes for badges (`badge-open`, `priority-urgent`, etc.).
 *   3. Emits `@Output() edit` when the user clicks the "Edit" button.
 *   4. Emits `@Output() delete` when the user clicks the "Delete" button.
 *
 * COMMUNICATES WITH:
 *   - Parent Component: Embedded inside `TicketListComponent` via `<app-ticket>`.
 *   - Events: Emits `edit` and `delete` events up to `TicketListComponent` to open
 *     the respective modal dialogs.
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. `TicketListComponent` loops over `tickets()` signal: `<app-ticket [ticket]="t">`.
 *   2. Card renders title, description, and status badges.
 *   3. User clicks "Edit" button on the card.
 *   4. `onEdit()` fires `this.edit.emit(this.ticket)`.
 *   5. Parent receives event and opens `TicketFormComponent` pre-populated with this ticket.
 * ============================================================================
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Ticket, TicketStatus } from '../../services/ticket.service';

@Component({
  selector: 'app-ticket',
  imports: [CommonModule],
  templateUrl: './ticket.component.html',
  styleUrl: './ticket.component.css',
})
export class TicketComponent {
  // Required input: the ticket data entity to display
  @Input({ required: true }) ticket!: Ticket;

  // Event emitters to notify the parent list container
  @Output() edit = new EventEmitter<Ticket>();
  @Output() delete = new EventEmitter<Ticket>();
  @Output() statusChange = new EventEmitter<{ id: string; status: TicketStatus }>();

  /**
   * Converts spaced status strings (e.g., 'In Progress') into CSS-safe class names ('in-progress').
   */
  getStatusClass(status: string): string {
    return status.toLowerCase().replace(/\s+/g, '-');
  }

  // Dynamic status badge styling
  get statusBadgeClass(): string {
    return `badge badge-${this.getStatusClass(this.ticket.status)}`;
  }

  // Dynamic priority badge styling
  get priorityBadgeClass(): string {
    return `priority-badge priority-${this.ticket.priority.toLowerCase()}`;
  }

  onEdit(): void {
    this.edit.emit(this.ticket);
  }

  onDelete(): void {
    this.delete.emit(this.ticket);
  }

  onStatusSelect(event: Event): void {
    event.stopPropagation();
    const newStatus = (event.target as HTMLSelectElement).value as TicketStatus;
    if (newStatus && newStatus !== this.ticket.status) {
      this.statusChange.emit({ id: this.ticket._id, status: newStatus });
    }
  }
}
