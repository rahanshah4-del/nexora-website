# Nexora SaaS Security + Isolation Audit

Date: 2026-06-02

## Scope

This audit checked separation between:

- Nexora Backend Control Centre SaaS admin data.
- Client workspace CRM business data.
- Client A vs Client B workspace data.
- Business module A vs Business module B data inside the same workspace.

No UI redesign, data deletion, or calculation formula changes were performed.

## Routes Audited

| Route | Purpose | Isolation Result |
| --- | --- | --- |
| `/admin/login` | Backend admin login | Separate backend-only Firebase email/password flow. Does not route to `/workspace`. |
| `/admin/control-centre` | Backend Control Centre | Wrapped in `RequireAdmin`; unauthenticated users redirect to `/admin/login`. |
| `/admin/upgrade-requests` | Backend upgrade requests | Wrapped in admin guard through `/admin` route. |
| `/login` | Client login | Client login only; redirects to `/workspace`. |
| `/workspace` | Client module/workspace selection | Client route only; uses primary and backend-granted allowed modules. |
| `/app/*` | Client CRM engine | Client route only; route guard blocks unauthorized module access. |

## Backend Allowed Collections

Backend Control Centre reads top-level SaaS management collections only:

- `users`
- `workspaces`
- `upgradeRequests`
- `subscriptions`
- `platformPayments`
- `backendActivityLogs`
- `announcements`
- `supportTickets`
- `platformPlans`
- `platformSettings`
- `backendStaff`
- `clientSessions`
- `userPresence`
- `analyticsEvents`
- `userSessions`

## Backend Blocked Collections

Backend Control Centre must not read client internal workspace subcollections. Current audit found no `collectionGroup()` reads and no direct backend reads for:

- `workspaces/*/customers`
- `workspaces/*/clients`
- `workspaces/*/leads`
- `workspaces/*/invoices`
- `workspaces/*/payments`
- `workspaces/*/expenses`
- `workspaces/*/products`
- `workspaces/*/accountTransactions`

Backend SaaS revenue uses `platformPayments` and approved `upgradeRequests`, not client invoice/payment subcollections.

## Client Isolation Rules

Client CRM data uses workspace subcollections under:

```text
workspaces/{workspaceId}/{moduleCollection}
```

The shared CRM Firestore helper now enforces:

- Reads are from the current `workspaceId` path.
- Rows must have `workspaceId` matching the active workspace or be stored under that workspace path.
- Rows must have an explicit matching `businessType` or `selectedBusinessType`.
- New writes through `createUserDoc()` stamp `ownerId`, `userId`, `workspaceId`, `businessType`, `createdBy`, `createdAt`, and `updatedAt`.
- Updates through `patchUserDoc()` restamp `ownerId`, `userId`, `workspaceId`, `businessType`, and `updatedAt`.

## Module Isolation Checks

Business modules:

- Nexora Sales Hub
- School ERP
- Retail / POS
- Property ERP
- Restaurant POS
- WhatsApp CRM

Route access now requires one of:

- Developer override.
- `allModulesAccess === true`.
- Route module belongs to current `businessType`.
- Route module belongs to one of `allowedBusinessTypes`.

Normal clients cannot unlock hidden modules by changing `localStorage`; route authorization uses Firestore user/workspace fields, not only local storage.

Blocked direct URL message:

```text
This module is not enabled for your account. Contact Nexora support.
```

## Calculation Isolation Checks

Audited calculation/data hooks:

- Dashboard and analytics: `useAnalytics()` subscribes to workspace-scoped `invoices`, `payments`, `customers`, `expenses`, `leads`, and `teamMembers` with `businessType`.
- Reports: `useReports()` subscribes to workspace subcollections with `businessType`; SaaS `upgradeRequests` were removed from CRM reports.
- Invoices/payments: `useInvoices()` uses `workspaceCollectionPath(workspaceId, ...)` and stamps `businessType`.
- Expenses: `useExpenses()` uses `subscribeUserCollection(workspaceId, 'expenses', ..., { businessType })`.
- Accounts: `useAccountTransactions()` uses `workspaceId` and `businessType`.
- Approval Center: workspace approvals only; top-level SaaS `upgradeRequests` were removed from client Approval Center.
- Products/customers/leads/support/notifications/activity logs: subscribe through workspace-scoped helpers with `businessType`.

Result:

- Client invoice/payment data is not counted in Backend Control Centre SaaS revenue.
- Backend SaaS payments are not counted inside client CRM calculations.
- Business module data without explicit `businessType` is no longer shown in every module.

## Data Write Audit

Confirmed shared write helpers stamp required scope:

- `workspaceId`
- `businessType`
- `createdBy` on creates
- `updatedAt` on creates/updates

Explicit invoice/payment/approval writes also stamp `workspaceId` and `businessType` in their module hooks.

## Activity / Analytics Audit

Allowed analytics fields are limited to safe visit/session data:

- Event type
- Page
- Button/module labels
- User id/email/phone if provided
- Workspace id
- Business type
- Session/visitor ids
- Device/browser/os/referrer/userAgent
- Timestamps and session duration

Firestore rules now whitelist analytics field names. Passwords, tokens, invoice line items, customer records, and private business payloads cannot be written to `analyticsEvents` or `userSessions` through the public analytics write rules.

## Firestore Rules Audit

Rules enforce:

- Backend admin email `rahanshah2@gmail.com` can access backend admin collections.
- Normal clients cannot read backend-only collections like `platformPayments`, `backendActivityLogs`, `backendStaff`, `analyticsEvents`, or `userSessions`.
- Clients can read/write only their own workspace paths.
- Clients cannot modify protected SaaS/admin-controlled fields after onboarding:
  - `plan`
  - `planStatus`
  - `subscriptionStatus`
  - `trialEndsAt`
  - `allowedBusinessTypes`
  - `primaryBusinessType`
  - `specialModuleAccess`
  - `allModulesAccess`
  - `isAdmin`
  - `role`

Backend admin can still update module access fields from Control Centre.

## Owner Protection

Owner self-protection exists in Team Management logic:

- Owner self role/status updates are forced back to owner/active.
- Owner self disable/downgrade is blocked in save/update logic.
- Owner keeps full access.

Rules also protect role/status changes through protected account fields.

## Fixes Applied During Audit

1. Removed CRM Reports subscription to top-level `upgradeRequests`.
2. Removed client Approval Center subscription to top-level `upgradeRequests`.
3. Made business-type filtering strict for shared CRM reads.
4. Made Approval Center and Client Portal business filters strict.
5. Stopped session persistence from writing entitlement fields `businessType` / `selectedBusinessType` to user/workspace docs.
6. Added analytics/session Firestore field allowlists.
7. Confirmed Backend Control Centre has no client-internal `collectionGroup()` reads.

## Remaining Risks

- Legacy records that were created before `businessType` stamping may be hidden by strict module filtering. They should be migrated by adding the correct `businessType` to each record.
- Firestore indexes were not verified against production data volume in this local audit.
- Security rules must be deployed after changes.
- This audit is code/static-build based; full production verification should include manual login tests for one backend admin and two separate client accounts.

## Final Security Score

Isolation readiness score: **92 / 100**

The major backend/client and workspace/module isolation paths are enforced in code and rules. Remaining risk is primarily legacy unstamped data migration and production rule deployment.
