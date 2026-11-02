/**
 * ============================================================================
 * FOLDER: server/src/models/
 * ============================================================================
 * Data Modeling Layer: Contains Mongoose schema definitions, TypeScript
 * interfaces, and database model bindings for all entities in the backend.
 *
 * ============================================================================
 * MODULE: server/src/models/Ticket.ts (Support Ticket Data Model)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Defines the schema, validation rules, indexes, and TypeScript types for
 * Support Tickets. It compiles the model on `mainDbConnection` (MongoDB collection: 'tickets').
 *
 * COMMUNICATES WITH:
 *   - `server/src/config/db.ts`: Imports `mainDbConnection` to bind the model.
 *   - `server/src/routes/ticket.routes.ts`: Used for all ticket CRUD operations
 *     (Ticket.find, Ticket.findOne, Ticket.create, Ticket.findByIdAndDelete).
 *   - `server/src/routes/playwright/test.routes.ts`: Used to wipe and seed test tickets.
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. User fills out ticket form and clicks 'Create Ticket' on frontend.
 *   2. `ticket.routes.ts` receives payload and calls `Ticket.create({ ...payload, owner: req.user.id })`.
 *   3. Mongoose validates:
 *      - title length is between 3 and 100 characters.
 *      - priority is one of: 'Low' | 'Medium' | 'High' | 'Urgent'.
 *      - status is one of: 'Open' | 'In Progress' | 'Resolved' | 'Closed'.
 *      - owner ObjectId is provided.
 *   4. Writes the document to the tickets collection in MongoDB.
 *   5. The compound index `{ owner: 1, createdAt: -1 }` accelerates queries when
 *      users view their ticket stream sorted by newest first.
 * ============================================================================
 */

import { Schema, Document, Types } from 'mongoose';
import { mainDbConnection } from '../config/db.js';

// Domain union types representing strict allowable states
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

// TypeScript interface representing a Ticket document in memory
export interface ITicket extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  priority: TicketPriority;
  status: TicketStatus;
  owner: Types.ObjectId; // References the User ObjectId who created this ticket
  ownerEmail?: string;  // Visual user email identifier in MongoDB Compass
  assignedWorker?: string; // Visual Worker identifier in MongoDB Compass
  ownedTestFolders?: string[]; // Test folders owned by this ticket's worker in MongoDB Compass
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose schema definition enforcing business validation rules
const ticketSchema = new Schema<ITicket>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [3, 'Title must be between 3 and 100 characters'],
      maxlength: [100, 'Title must be between 3 and 100 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description must not exceed 500 characters'],
      default: '',
    },
    priority: {
      type: String,
      enum: {
        values: ['Low', 'Medium', 'High', 'Urgent'],
        message: 'Priority must be Low, Medium, High, or Urgent',
      },
      default: 'Medium',
      required: true,
    },
    status: {
      type: String,
      enum: {
        values: ['Open', 'In Progress', 'Resolved', 'Closed'],
        message: 'Status must be Open, In Progress, Resolved, or Closed',
      },
      default: 'Open',
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Logical reference to User model
      required: true,
      index: true,
    },
    ownerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    assignedWorker: {
      type: String,
    },
    ownedTestFolders: {
      type: [String],
      default: undefined,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt timestamps
  }
);

// Compound index to optimize queries fetching a user's tickets ordered by creation time
ticketSchema.index({ owner: 1, createdAt: -1 });

// Compile the model on mainDbConnection (MongoDB collection: 'tickets')
export const Ticket = mainDbConnection.model<ITicket>('Ticket', ticketSchema);
