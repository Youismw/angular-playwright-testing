import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TicketService, Ticket } from './ticket.service';

describe('TicketService', () => {
  let service: TicketService;
  let httpMock: HttpTestingController;

  const mockTickets: Ticket[] = [
    {
      _id: '100000000000000000000001',
      title: 'Fix login button styling',
      description: 'Login button alignment is off on mobile screens',
      priority: 'High',
      status: 'Open',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TicketService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(TicketService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch all tickets without filter', () => {
    service.getTickets().subscribe((tickets) => {
      expect(tickets.length).toBe(1);
      expect(tickets[0].title).toBe('Fix login button styling');
    });

    const req = httpMock.expectOne('/api/tickets');
    expect(req.request.method).toBe('GET');
    req.flush(mockTickets);
  });

  it('should fetch tickets with status query param when specified', () => {
    service.getTickets('Open').subscribe((tickets) => {
      expect(tickets.length).toBe(1);
    });

    const req = httpMock.expectOne('/api/tickets?status=Open');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('status')).toBe('Open');
    req.flush(mockTickets);
  });

  it('should get single ticket by id using template literal endpoint', () => {
    service.getTicket('100000000000000000000001').subscribe((ticket) => {
      expect(ticket._id).toBe('100000000000000000000001');
    });

    const req = httpMock.expectOne('/api/tickets/100000000000000000000001');
    expect(req.request.method).toBe('GET');
    req.flush(mockTickets[0]);
  });

  it('should post new ticket to /api/tickets', () => {
    const payload = {
      title: 'New Bug',
      description: 'Details',
      priority: 'Urgent' as const,
      status: 'Open' as const,
    };

    service.createTicket(payload).subscribe((created) => {
      expect(created._id).toBe('100000000000000000000002');
      expect(created.title).toBe('New Bug');
    });

    const req = httpMock.expectOne('/api/tickets');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ ...payload, _id: '100000000000000000000002' });
  });

  it('should update ticket via PUT', () => {
    service.updateTicket('100000000000000000000001', { status: 'Resolved' }).subscribe((updated) => {
      expect(updated.status).toBe('Resolved');
    });

    const req = httpMock.expectOne('/api/tickets/100000000000000000000001');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ status: 'Resolved' });
    req.flush({ ...mockTickets[0], status: 'Resolved' });
  });

  it('should delete ticket via DELETE', () => {
    service.deleteTicket('100000000000000000000001').subscribe((res) => {
      expect(res).toBeFalsy();
    });

    const req = httpMock.expectOne('/api/tickets/100000000000000000000001');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
