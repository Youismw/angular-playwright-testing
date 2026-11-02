/**
 * ============================================================================
 * FOLDER: server/src/models/
 * ============================================================================
 * Data Modeling Layer: Contains Mongoose schema definitions, TypeScript
 * interfaces, and database model bindings for all entities in the backend.
 *
 * ============================================================================
 * MODULE: server/src/models/User.ts (User Identity Data Model)
 * ============================================================================
 * WHAT THIS MODULE DOES:
 * Defines the MongoDB schema and TypeScript interface for User accounts.
 * Critically, it compiles the model on `userDbConnection` (MongoDB Users DB on
 * port 27017), ensuring complete database-level separation from ticket data.
 *
 * COMMUNICATES WITH:
 *   - `server/src/config/db.ts`: Imports `userDbConnection` to bind the model.
 *   - `server/src/routes/auth.routes.ts`: Queried via `User.findOne({ email })`
 *     to verify user credentials during authentication.
 *   - `server/src/routes/playwright/test.routes.ts`: Seeded via `User.create()`
 *     during E2E test resets.
 *
 * HYPOTHETICAL RUNTIME FLOW:
 *   1. User submits login credentials on frontend (`qa.user@quicktix.test`).
 *   2. `auth.routes.ts` receives request and calls `User.findOne({ email: cleanEmail })`.
 *   3. Mongoose translates this into a MongoDB query over `userDbConnection` (port 27017).
 *   4. Returns an `IUser` document containing the bcrypt-hashed password string.
 * ============================================================================
 */

import { Schema, Document, Types } from 'mongoose';
import { mainDbConnection } from '../config/db.js';

// TypeScript representation of a User document
export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  role: string;
  assignedWorker?: string;    // Visual Worker identifier in MongoDB Compass
  workerRole?: string;        // Visual description of this account's role in the worker
  ownedTestSuites?: string[]; // Exact folders and .spec.ts files owned by this worker in MongoDB Compass
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose schema definition with validation rules
const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,     // Enforces unique constraint index in MongoDB
      lowercase: true,  // Automatically lowercases emails before saving/querying
      trim: true,       // Strips accidental leading/trailing whitespace
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
    },
    password: {
      type: String,
      required: true,   // Stores the bcrypt-hashed password string
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    assignedWorker: {
      type: String,
    },
    workerRole: {
      type: String,
    },
    ownedTestSuites: {
      type: [String],
      default: undefined,
    },
  },
  {
    timestamps: true,   // Automatically creates and updates createdAt & updatedAt fields
  }
);

// Compile the model on mainDbConnection (MongoDB collection: 'users')
export const User = mainDbConnection.model<IUser>('User', userSchema);
