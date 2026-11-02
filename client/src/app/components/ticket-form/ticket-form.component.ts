/**
 * ============================================================================
 * FOLDER: client/src/app/components/ticket-form/
 * ============================================================================
 * Ticket Form Modal Directory: Contains the creation/editing modal dialog,
 * validation alerts, and form controls.
 *
 * ============================================================================
 * MODULE: client/src/app/components/ticket-form/ticket-form.component.ts (Ticket Form Modal)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Modal dialog component used for BOTH creating new tickets and editing existing ones:
 *   1. Dual Mode: If `initialTicket` is null, operates in "Create" mode; otherwise in "Edit" mode.
 *   2. Synchronizes Form State: `ngOnChanges` resets or pre-populates form fields
 *      whenever the modal opens.
 *   3. Client-Side Invariant Validation: Enforces that `title` is 3 to 100 characters.
 *      If invalid, displays an inline error alert `[data-testid="ticket-title-error"]`.
 *   4. Emits `@Output() save` with validated payload to parent `TicketListComponent`.
 *   5. Emits `@Output() cancel` to close without changes.
 *
 * COMMUNICATES WITH:
 *   - Parent `TicketListComponent`: Hosted in template `<app-ticket-form>`.
 *   - Tested by Playwright:
 *     - Test 2: "Create ticket and see in list"
 *     - Test 3: "Empty title shows inline error"
 *     - Test 4: "Edit seeded Open ticket to Resolved"
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. User clicks "+ Create Ticket" on dashboard.
 *   2. Parent sets `isFormModalOpen = true`, `initialTicket = null`.
 *   3. `ngOnChanges` resets fields to defaults (`priority = 'Medium'`, `status = 'Open'`).
 *   4. User leaves title blank and submits.
 *   5. `validateTitle()` detects empty string -> sets `titleError = 'Title must be between 3 and 100 characters'`.
 *   6. Modal stays open and displays the red inline error message.
 *   7. User enters valid title and submits -> emits `save` event with formData.
 * ============================================================================
 */

import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Ticket, TicketPriority, TicketStatus } from '../../services/ticket.service';

// Interface representing the form data emitted on save
export interface TicketFormData {
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
}

@Component({
  selector: 'app-ticket-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './ticket-form.component.html',
  styleUrl: './ticket-form.component.css',
})
export class TicketFormComponent implements OnChanges {
  // Modal visibility toggle
  @Input() isOpen = false;
  // If provided, form operates in edit mode; if null, in create mode
  @Input() initialTicket: Ticket | null = null;
  // Spinner state on submit button
  @Input() isSubmitting = false;
  // Error message returned from backend (e.g. 400 validation error)
  @Input() serverError = '';

  // Emits form payload up to parent
  @Output() save = new EventEmitter<TicketFormData>();
  // Emits close request
  @Output() cancel = new EventEmitter<void>();

  // Form field state bindings
  title = '';
  description = '';
  priority: TicketPriority = 'Medium';
  status: TicketStatus = 'Open';
  titleError = '';

  get isEditing(): boolean {
    return !!this.initialTicket;
  }

  /**
   * Resets or populates form fields whenever the modal visibility or initialTicket changes.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['isOpen'] && this.isOpen) || (changes['initialTicket'] && this.isOpen)) {
      if (this.initialTicket) {
        this.title = this.initialTicket.title;
        this.description = this.initialTicket.description || '';
        this.priority = this.initialTicket.priority;
        this.status = this.initialTicket.status;
      } else {
        this.title = '';
        this.description = '';
        this.priority = 'Medium';
        this.status = 'Open';
      }
      this.titleError = '';
    }
  }

  /**
   * Client-side validation for title length (3 - 100 characters).
   */
  validateTitle(): void {
    const trimmed = (this.title || '').trim();
    if (!trimmed || trimmed.length < 3 || trimmed.length > 100) {
      this.titleError = 'Title must be between 3 and 100 characters';
    } else {
      this.titleError = '';
    }
  }

  /**
   * Validates inputs before emitting save event to parent.
   */
  onSubmit(): void {
    this.validateTitle();
    if (this.titleError) {
      return; // Stop submission if title is invalid
    }

    this.save.emit({
      title: this.title.trim(),
      description: this.description.trim(),
      priority: this.priority,
      status: this.status,
    });
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
