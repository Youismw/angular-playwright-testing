import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TicketListComponent } from './ticket-list.component';
import { TicketService, Ticket } from '../../services/ticket.service';
import { AuthService } from '../../services/auth.service';
import { of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { vi } from 'vitest';

describe('TicketListComponent', () => {
  let component: TicketListComponent;
  let fixture: ComponentFixture<TicketListComponent>;
  let ticketServiceSpy: any;
  let authServiceSpy: any;

  const mockTickets: Ticket[] = [
    {
      _id: '100000000000000000000001',
      title: 'Fix login button styling',
      description: 'Login button alignment is off on mobile screens',
      priority: 'High',
      status: 'Open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: '100000000000000000000002',
      title: 'Update documentation footer',
      description: 'Update copyright year in footer',
      priority: 'Low',
      status: 'Resolved',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    ticketServiceSpy = {
      getTickets: vi.fn().mockReturnValue(of(mockTickets)),
      createTicket: vi.fn().mockImplementation((t: any) =>
        of({ ...t, _id: '100000000000000000000009', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      ),
      updateTicket: vi.fn().mockImplementation((id: string, t: any) =>
        of({ ...mockTickets[0], ...t, _id: id })
      ),
      deleteTicket: vi.fn().mockReturnValue(of(undefined)),
    };

    authServiceSpy = {
      getUserEmail: vi.fn().mockReturnValue('qa.user@quicktix.test'),
      getUserRole: vi.fn().mockReturnValue('user'),
      logout: vi.fn(),
      isAuthenticated: vi.fn().mockReturnValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [TicketListComponent, FormsModule],
      providers: [
        { provide: TicketService, useValue: ticketServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TicketListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the ticket list component', () => {
    expect(component).toBeTruthy();
  });

  it('should load tickets on init', () => {
    expect(ticketServiceSpy.getTickets).toHaveBeenCalled();
    expect(component.tickets().length).toBe(2);
    expect(component.loading()).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="ticket-list"]')).toBeTruthy();
  });

  it('should trigger filter change when status is selected', () => {
    component.selectedStatus = 'Open';
    component.onFilterChange();

    expect(ticketServiceSpy.getTickets).toHaveBeenCalledWith('Open');
  });

  it('should open and close create modal', () => {
    component.openCreateModal();
    expect(component.isFormModalOpen()).toBe(true);
    expect(component.editingTicket).toBeNull();

    component.closeFormModal();
    expect(component.isFormModalOpen()).toBe(false);
  });

  it('should open edit modal with selected ticket', () => {
    component.openEditModal(mockTickets[0]);
    expect(component.isFormModalOpen()).toBe(true);
    expect(component.editingTicket).toBe(mockTickets[0]);
  });

  it('should handle ticket creation and update tickets signal', () => {
    component.openCreateModal();
    component.onSaveTicket({
      title: 'Brand New Ticket',
      description: 'Desc',
      priority: 'Urgent',
      status: 'Open',
    });

    expect(ticketServiceSpy.createTicket).toHaveBeenCalled();
    expect(component.tickets().length).toBe(3);
    expect(component.isFormModalOpen()).toBe(false);
  });

  it('should open delete confirm modal and remove ticket on confirmation', () => {
    component.openDeleteModal(mockTickets[0]);
    expect(component.isConfirmModalOpen()).toBe(true);
    expect(component.deletingTicket).toBe(mockTickets[0]);

    component.onConfirmDelete();
    expect(ticketServiceSpy.deleteTicket).toHaveBeenCalledWith('100000000000000000000001');
    expect(component.tickets().length).toBe(1);
    expect(component.isConfirmModalOpen()).toBe(false);
  });

  it('should delegate logout to authService', () => {
    component.onLogout();
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });

  it('should not prepend newly created ticket to tickets signal when filter does not match', () => {
    component.selectedStatus = 'Closed';
    const initialCount = component.tickets().length;

    component.openCreateModal();
    component.onSaveTicket({
      title: 'Open Ticket',
      description: 'Desc',
      priority: 'Low',
      status: 'Open',
    });

    expect(ticketServiceSpy.createTicket).toHaveBeenCalled();
    expect(component.tickets().length).toBe(initialCount);
    expect(component.isFormModalOpen()).toBe(false);
  });

  it('should remove ticket from view when status update no longer matches active filter', () => {
    component.selectedStatus = 'Open';
    component.tickets.set([...mockTickets]);
    const ticketToEdit = mockTickets[0]; // status: 'Open'

    component.openEditModal(ticketToEdit);
    component.onSaveTicket({
      title: ticketToEdit.title,
      description: ticketToEdit.description || '',
      priority: ticketToEdit.priority,
      status: 'Resolved',
    });

    expect(ticketServiceSpy.updateTicket).toHaveBeenCalled();
    const found = component.tickets().find((t) => t._id === ticketToEdit._id);
    expect(found).toBeUndefined();
  });

  it('should keep updated ticket in view when status still matches active filter', () => {
    component.selectedStatus = 'Open';
    component.tickets.set([...mockTickets]);
    const ticketToEdit = mockTickets[0]; // status: 'Open'

    component.openEditModal(ticketToEdit);
    component.onSaveTicket({
      title: 'Updated Title',
      description: ticketToEdit.description || '',
      priority: 'Urgent',
      status: 'Open',
    });

    expect(ticketServiceSpy.updateTicket).toHaveBeenCalled();
    const updated = component.tickets().find((t) => t._id === ticketToEdit._id);
    expect(updated).toBeDefined();
    expect(updated?.title).toBe('Updated Title');
  });

  it('should filter tickets in real-time based on searchQuery signal', () => {
    component.tickets.set([...mockTickets]);
    expect(component.filteredTickets().length).toBe(2);

    // Search by title keyword
    component.searchQuery.set('styling');
    expect(component.filteredTickets().length).toBe(1);
    expect(component.filteredTickets()[0].title).toBe('Fix login button styling');

    // Search by description keyword
    component.searchQuery.set('copyright');
    expect(component.filteredTickets().length).toBe(1);
    expect(component.filteredTickets()[0].title).toBe('Update documentation footer');

    // Clear search
    component.clearSearch();
    expect(component.searchQuery()).toBe('');
    expect(component.filteredTickets().length).toBe(2);
  });

  it('should update status and reload tickets when selectTab is called', () => {
    component.selectTab('In Progress');
    expect(component.selectedStatus).toBe('In Progress');
    expect(ticketServiceSpy.getTickets).toHaveBeenCalledWith('In Progress');
  });

  it('should handle onQuickStatusChange and update ticket status directly', () => {
    component.tickets.set([...mockTickets]);
    component.selectedStatus = 'All';

    component.onQuickStatusChange({
      id: '100000000000000000000001',
      status: 'Closed',
    });

    expect(ticketServiceSpy.updateTicket).toHaveBeenCalledWith('100000000000000000000001', {
      status: 'Closed',
    });
    const updated = component.tickets().find((t) => t._id === '100000000000000000000001');
    expect(updated?.status).toBe('Closed');
  });
});

