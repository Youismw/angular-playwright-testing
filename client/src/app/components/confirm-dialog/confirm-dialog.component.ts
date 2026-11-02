/**
 * ============================================================================
 * FOLDER: client/src/app/components/confirm-dialog/
 * ============================================================================
 * Confirmation Dialog Directory: Contains the custom deletion confirmation modal,
 * backdrop styling, and confirmation action controls.
 *
 * ============================================================================
 * MODULE: client/src/app/components/confirm-dialog/confirm-dialog.component.ts
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Modal confirmation dialog for destructive actions (specifically ticket deletion):
 *   1. Displays a stylized warning modal instead of native browser `window.confirm()`
 *      (which blocks UI rendering and is difficult to assert deterministically in E2E tests).
 *   2. Displays the specific item title being deleted so users avoid accidental deletion.
 *   3. Emits `@Output() confirm` when the user confirms deletion.
 *   4. Emits `@Output() cancel` when the user cancels or closes the dialog.
 *
 * COMMUNICATES WITH:
 *   - Parent `TicketListComponent`: Hosted in template `<app-confirm-dialog>`.
 *   - Tested by Playwright Test 6: "Delete ticket via confirm modal".
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. User clicks "Delete" on ticket card ("Setup automated backups").
 *   2. Parent opens dialog: sets `isConfirmModalOpen = true`, `deletingTicket = ticket`.
 *   3. Dialog renders with `[data-testid="confirm-dialog"]`.
 *   4. User clicks "Confirm Delete" (`[data-testid="confirm-btn"]`).
 *   5. `onConfirm()` emits `confirm` event to parent.
 *   6. Parent calls `ticketService.deleteTicket(id)` to remove the ticket from MongoDB.
 * ============================================================================
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  imports: [CommonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.css',
})
export class ConfirmDialogComponent {
  // Modal visibility flag
  @Input() isOpen = false;
  // Dialog headline text
  @Input() title = 'Delete Ticket?';
  // Title of the specific ticket being deleted (shown in warning body)
  @Input() itemTitle = '';

  // Event emitters notifying parent container
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
