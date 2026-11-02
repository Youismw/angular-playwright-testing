# CRITICAL MANDATORY RULES FOR ALL AI AGENTS (READ BEFORE ANY ACTION)

## Core Principle: Truthful Verification Over "Green-at-All-Costs" (No Reward Hacking)
Your objective as an engineering agent is **genuine, truthful verification of real system behavior**—never forcing a "success" or green test result for the sake of appearing successful. A test or feature that appears to work only because state was hardcoded, bypassed, or silently overwritten is a **false positive** that defeats the entire purpose of software engineering and testing.

---

## Rule 1: NEVER Silently Overwrite Database or External State Behind the User's Back
1. **Respect Live Database State & Manual User Mutations**:
   - When working with any database, storage layer, or external tool (such as **MongoDB Compass**, SQL clients, or seeded collections), **never** configure reset hooks or application startup code to blindly overwrite existing baseline records (`$set`, `UPDATE`, or full-table re-writes) on every run.
   - In QuickTix (`server/src/routes/playwright/test.routes.ts` -> `POST /api/test/reset`), existing user documents in `quicktix_test.users` must **never** be overwritten once their `_id` exists. Reset hooks may **ONLY**:
     - Clean up ephemeral/dynamic records created during test execution (`{ _id: { $nin: allowedSeedUserIds } }`).
     - Insert baseline seed records **only if their `_id` is completely missing** from the database.
2. **Why This Is Strictly Prohibited**:
   - Developers and QA actively mutate database records in external tools (e.g., changing `qa.user@quicktix.test` or worker credentials in MongoDB Compass) to verify that the application and test suite genuinely read from the database and **fail when database state is broken**.
   - Silently overwriting existing records on every run:
     1. Wipes out the user's manual database edits and reverts them to hardcoded values, causing tests to **falsely pass** instead of testing the database.
     2. Modifies documents in the background while the user has them open in their database client, causing concurrent write conflicts (such as MongoDB Compass's `"Document was modified in the background or it no longer exists. Do you wish to continue and possibly overwrite new changes?"`).

---

## Rule 2: NEVER Hardcode Fallbacks, Shortcuts, or Rigged Logic to Mask Failures
1. **No Hardcoded Fallbacks in Application or Test Code**:
   - Never introduce fallback values (e.g., `user.email || 'qa.user@quicktix.test'`, silent `catch {}` blocks that return fake success objects, or hardcoded default credentials) that hide missing data, broken queries, or failed authentication.
   - If the database, API, or state is missing or corrupted, the application and tests **must surface the error honestly**.
2. **No Bypassing the System Under Test**:
   - Never replace a real database query, API call, authentication check, or UI flow with a hardcoded constant or mock just to make a broken flow succeed or run faster.
   - Every layer (UI -> API -> Auth -> Database) must genuinely depend on the real output of the layer beneath it.

---

## Rule 3: NEVER Weaken Assertions or Rig Tests to Force a Pass
1. **No Tautological or Diluted Assertions**:
   - Never write assertions that pass regardless of actual outcome (e.g., `expect(ticketList.or(ticketEmpty)).toBeVisible()`, `expect(status).toBeDefined()`, or removing strict equality checks).
   - Never delete, skip, or gut a failing test assertion to make a test suite report 100% passing.
2. **When Something Fails, Diagnose Honestly**:
   - If a test fails, investigate the real root cause. If it failed because the database or code was mutated, report that the test **correctly caught the mutation**—never "fix" the failure by making the test ignore the database or overwrite the mutated data.
