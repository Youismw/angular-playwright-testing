import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TicketFormComponent } from './ticket-form.component';
import { FormsModule } from '@angular/forms';
import { SimpleChange } from '@angular/core';

describe('TicketFormComponent', () => {
  let component: TicketFormComponent;
  let fixture: ComponentFixture<TicketFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketFormComponent, FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TicketFormComponent);
    component = fixture.componentInstance;
    component.isOpen = true;
    fixture.detectChanges();
  });

  it('should create the ticket form component', () => {
    expect(component).toBeTruthy();
  });

  it('should render all form inputs with designated testids and description maxlength 500', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="ticket-form"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="ticket-title-input"]')).toBeTruthy();
    const descInput = compiled.querySelector('[data-testid="ticket-description-input"]');
    expect(descInput).toBeTruthy();
    expect(descInput?.getAttribute('maxlength')).toBe('500');
    expect(compiled.querySelector('.char-count')?.textContent).toContain('/500');
    expect(compiled.querySelector('[data-testid="ticket-priority-select"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="ticket-status-select"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="ticket-submit"]')).toBeTruthy();
  });

  it('should show validation error when title is shorter than 3 characters', () => {
    component.title = 'ab';
    component.validateTitle();
    fixture.detectChanges();

    expect(component.titleError).toBe('Title must be between 3 and 100 characters');

    const compiled = fixture.nativeElement as HTMLElement;
    const errorAlert = compiled.querySelector('[data-testid="ticket-title-error"]');
    expect(errorAlert).toBeTruthy();
    expect(errorAlert?.getAttribute('role')).toBe('alert');
    expect(errorAlert?.textContent).toContain('Title must be between 3 and 100 characters');
  });

  it('should not emit save event when validation fails', () => {
    let saved = false;
    component.save.subscribe(() => {
      saved = true;
    });

    component.title = 'ab';
    component.onSubmit();

    expect(saved).toBe(false);
  });

  it('should emit save event with valid form data', () => {
    let emittedData: any = null;
    component.save.subscribe((data) => {
      emittedData = data;
    });

    component.title = 'Valid New Ticket Title';
    component.description = 'Valid description for testing';
    component.priority = 'High';
    component.status = 'Open';

    component.onSubmit();

    expect(emittedData).toEqual({
      title: 'Valid New Ticket Title',
      description: 'Valid description for testing',
      priority: 'High',
      status: 'Open',
    });
  });

  it('should prefill fields in edit mode and emit cancel when cancelled', () => {
    component.initialTicket = {
      _id: '123',
      title: 'Existing Ticket',
      description: 'Existing Desc',
      priority: 'Urgent',
      status: 'In Progress',
      createdAt: '',
      updatedAt: '',
    };
    component.ngOnChanges({
      isOpen: new SimpleChange(false, true, true),
    });
    fixture.detectChanges();

    expect(component.isEditing).toBe(true);
    expect(component.title).toBe('Existing Ticket');
    expect(component.priority).toBe('Urgent');

    let cancelled = false;
    component.cancel.subscribe(() => {
      cancelled = true;
    });

    component.onCancel();
    expect(cancelled).toBe(true);
  });
});
