/**
 * ============================================================================
 * FOLDER: client/src/app/services/
 * ============================================================================
 * Service Layer: Contains root-level singleton services (`@Injectable({ providedIn: 'root' })`)
 * that encapsulate business logic, backend API calls, and reactive application state.
 *
 * ============================================================================
 * MODULE: client/src/app/services/ticket.service.ts (Support Ticket API Client)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Encapsulates all HTTP communication with the backend Ticket CRUD endpoints:
 *   - `getTickets(status?)`: Fetches tickets list, optionally filtered by status.
 *   - `getTicket(id)`: Fetches a single ticket by MongoDB ObjectId.
 *   - `createTicket(payload)`: Posts a new support ticket.
 *   - `updateTicket(id, payload)`: Sends PUT updates (e.g. status transition).
 *   - `deleteTicket(id)`: Sends DELETE request to remove a ticket.
 *
 * COMMUNICATES WITH:
 *   - Backend: Calls `/api/tickets` on `server/src/routes/ticket.routes.ts`.
 *   - Interceptor: Every request emitted here is automatically intercepted by
 *     `authInterceptor`, which attaches the Bearer token without manual code.
 *   - Proxy: During local development, `proxy.conf.json` proxies `/api/tickets`
 *     from port 4200 to port 3000.
 *   - Consumer: Consumed by `client/src/app/components/ticket-list/ticket-list.component.ts`.
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. User clicks status filter dropdown ("In Progress").
 *   2. `TicketListComponent` calls `ticketService.getTickets('In Progress')`.
 *   3. `HttpClient` sends `GET /api/tickets?status=In%20Progress`.
 *   4. `authInterceptor` stamps the Authorization header.
 *   5. Backend queries Tickets DB and returns JSON array of matching tickets.
 *   6. RxJS Observable emits array to the component, which updates its UI signal.
 * ============================================================================
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// TypeScript domain types mirroring backend CONTRACT.md
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export interface Ticket {
  _id: string;
  title: string;
  description?: string;
  priority: TicketPriority;
  status: TicketStatus;
  owner?: string;
  ownerEmail?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class TicketService {
  private readonly apiUrl = '/api/tickets';

  constructor(private http: HttpClient) {}

  /**
   * Fetches tickets belonging to the authenticated user.
   * Optionally appends ?status= filter parameter.
   */
  getTickets(status?: string): Observable<Ticket[]> {
    let params = new HttpParams();
    if (status && status !== 'All') {
      params = params.set('status', status);
    }
    return this.http.get<Ticket[]>(this.apiUrl, { params });
  }

  /**
   * Retrieves single ticket details by MongoDB ID.
   */
  getTicket(id: string): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.apiUrl}/${id}`);
  }

  /**
   * Creates a new support ticket in the Tickets database.
   */
  createTicket(payload: {
    title: string;
    description?: string;
    priority?: string;
    status?: string;
  }): Observable<Ticket> {
    return this.http.post<Ticket>(this.apiUrl, payload);
  }

  /**
   * Updates fields (such as status or title) on an existing ticket.
   */
  updateTicket(id: string, payload: Partial<Ticket>): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.apiUrl}/${id}`, payload);
  }

  /**
   * Deletes a support ticket by ID.
   */
  deleteTicket(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
