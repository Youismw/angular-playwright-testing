import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TicketComponent } from './ticket.component';
import { Ticket } from '../../services/ticket.service';

describe('TicketComponent', () => {
  let component: TicketComponent;
  let fixture: ComponentFixture<TicketComponent>;

  const mockTicket: Ticket = {
    _id: '100000000000000000000001',
    title: 'Fix login button styling',
    description: 'Login button alignment is off on mobile screens',
    priority: 'High',
    status: 'Open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TicketComponent);
    component = fixture.componentInstance;
    component.ticket = mockTicket;
    fixture.detectChanges();
  });

  it('should create the ticket component', () => {
    expect(component).toBeTruthy();
  });

  it('should render ticket row attributes and title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const row = compiled.querySelector('[data-testid="ticket-row"]');
    expect(row).toBeTruthy();
    expect(row?.getAttribute('data-ticket-id')).toBe('100000000000000000000001');

    const title = compiled.querySelector('[data-testid="ticket-title"]');
    expect(title?.textContent).toContain('Fix login button styling');

    const desc = compiled.querySelector('.ticket-desc');
    expect(desc?.textContent).toContain('Login button alignment is off on mobile screens');
  });

  it('should format status badge and priority badge using template literal styles', () => {
    expect(component.statusBadgeClass).toBe('badge badge-open');
    expect(component.priorityBadgeClass).toBe('priority-badge priority-high');

    const compiled = fixture.nativeElement as HTMLElement;
    const statusElem = compiled.querySelector('[data-testid="ticket-status"]');
    expect(statusElem?.textContent?.trim()).toBe('Open');
    expect(statusElem?.classList.contains('badge-open')).toBe(true);
  });

  it('should emit edit event when Edit button is clicked', () => {
    let emittedTicket: Ticket | null = null;
    component.edit.subscribe((t) => {
      emittedTicket = t;
    });

    const editBtn = fixture.nativeElement.querySelector('[data-testid="ticket-edit"]') as HTMLButtonElement;
    editBtn.click();

    expect(emittedTicket).toEqual(mockTicket);
  });

  it('should emit delete event when Delete button is clicked', () => {
    let emittedTicket: Ticket | null = null;
    component.delete.subscribe((t) => {
      emittedTicket = t;
    });

    const deleteBtn = fixture.nativeElement.querySelector('[data-testid="ticket-delete"]') as HTMLButtonElement;
    deleteBtn.click();

    expect(emittedTicket).toEqual(mockTicket);
  });

  it('should emit statusChange event when quick status dropdown changes', () => {
    let emittedChange: { id: string; status: any } | null = null;
    component.statusChange.subscribe((change) => {
      emittedChange = change;
    });

    const select = fixture.nativeElement.querySelector('[data-testid="ticket-quick-status"]') as HTMLSelectElement;
    expect(select).toBeTruthy();
    select.value = 'In Progress';
    select.dispatchEvent(new Event('change'));

    expect(emittedChange).toEqual({
      id: '100000000000000000000001',
      status: 'In Progress',
    });
  });
});

