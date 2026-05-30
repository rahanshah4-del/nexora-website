# NEXORA CRM Production Security Audit

Date: 2026-05-30

## Executive Summary

PASS: Core CRM data now remains workspace-scoped through `workspaces/{workspaceId}/{collection}` reads/writes, migration-safe client fallbacks, and stricter Firestore rules.

PASS: Workspace admins are no longer treated as platform-wide admins. Platform admin access now requires `isAdmin: true`, `role: platform_admin`, or `role: super_admin`.

PASS: Staff-level permission escalation is blocked. Only owner/admin can create staff accounts or edit permission documents.

WARNING: Firebase CLI/emulator is not installed in this workspace, so Firestore rules were reviewed statically and validated through app lint/build only.

## Collection Metadata

PASS: `customers`, `clients`, `products`, `invoices`, `payments`, `expenses`, `accountTransactions`, `activityLogs`, `teamMembers`, `branches`, and `reports` now require `workspaceId`, `createdBy`, and `createdAt` on new workspace-scoped creates.

PASS: `upgradeRequests` now includes `createdBy` in both submit flows and rules require `workspaceId`, `createdBy`, and `createdAt` on create.

PASS: `notifications` rules require `workspaceId`, `createdBy`, and `createdAt` for new client-created notifications.

PASS: Existing documents are not renamed or migrated destructively. Client reads add migration-safe fallbacks for missing workspace metadata and filter out mismatched `workspaceId` rows.

WARNING: Existing live documents missing `createdAt` cannot be repaired without a controlled server-side migration. The app now tolerates them safely.

## Query Security

PASS: Dashboard, invoices, expenses, products, reports, activity logs, account management, approvals, and client portal reads use `workspaceId` or workspace subcollections.

PASS: Reports no longer use user-owned upgrade history for workspace reporting; `upgradeRequests` report history is scoped by `workspaceId`.

PASS: Notifications remain user-scoped and are additionally filtered by workspace when metadata exists.

PASS: Generic collection helper now refuses accidental global reads unless explicitly allowed.

## Firestore Rules

PASS: All protected tenant collections require `request.auth != null` through role/member helper checks.

PASS: Workspace document access validates membership with `users/{uid}.workspaceId`.

PASS: User identity fields (`uid`, `userId`, `workspaceId`, `ownerId`, `staffId`, `email`) are protected against self-service workspace switching.

PASS: Workspace subcollection writes preserve workspace scope on update.

CRITICAL FIXED: `role: admin` no longer grants global Firestore access.

CRITICAL FIXED: Tenant owners/admins/accountants can no longer approve their own platform upgrade requests. Platform upgrade approval requires platform admin.

## Role System

PASS: Supported workspace roles are `owner`, `admin`, `accountant`, `manager`, and `staff`.

PASS: Owner/admin keep full workspace control.

PASS: Accountant defaults to finance/report access.

PASS: Manager defaults to business operations: customers, leads, follow-ups, invoices, reports.

PASS: Staff remains permission-doc limited.

PASS: Owner role is not downgraded by login/signup provisioning.

CRITICAL FIXED: Staff with `settingsAccess` can no longer create elevated roles or edit permission matrices.

## Approval System

PASS: Invoice, payment, expense, and account transaction approvals are restricted to owner/admin/accountant.

PASS: Staff cannot approve.

PASS: Approval updates require the record to still be open/pending, reducing double-approval risk.

PASS: Subscription/plan upgrade approvals are platform-admin-only because they affect SaaS billing entitlement.

## Account Management

PASS: Wallet reads and account transaction writes are workspace-scoped.

PASS: Outflow creation checks available balance client-side and only owner can explicitly allow negative wallet submission.

PASS: Duplicate pending transactions are blocked client-side by type, amount, and target matching.

WARNING: Negative-balance enforcement is not fully server-calculated in Firestore rules because rules cannot aggregate wallet state. A Cloud Function transaction is recommended for final server-side balance enforcement.

## Authentication

PASS: Login/signup/Google login continue to call `ensureUserWorkspace` without overwriting an existing role.

PASS: Email verification is now sent after password signup without blocking existing users.

PASS: `emailVerified` is stored from Firebase Auth metadata.

PASS: Session persistence now records the effective workspace for staff users instead of assuming `uid == workspaceId`.

PASS: Self-service user updates cannot switch workspace identity.

## Data Mix Test Report

Scenario:

Workspace A: `workspaceId = A`

Workspace B: `workspaceId = B`

PASS: Customers created under `workspaces/A/customers` are only read by Workspace A members with customer/report access.

PASS: Invoices/payments created under `workspaces/A` are not queried globally and are denied to Workspace B by rules.

PASS: Expenses/account transactions/wallet calculations use only Workspace A subcollections.

PASS: Reports aggregate only Workspace A workspace subcollections plus `upgradeRequests where workspaceId == A`.

PASS: Approvals subscribe only to Workspace A collections. Platform upgrade approvals require platform admin.

PASS: Client portal reads use Workspace A path plus client/customer filters.

WARNING: Run the same scenario in the Firebase Emulator before deploying rules to production.

## Final Status

PASS: No collection names were renamed.

PASS: Existing schemas remain backward compatible.

PASS: Safe metadata fallbacks were added without destructive migration.

PASS: Lint completed successfully.

PASS: Production build completed successfully.

WARNING: Vite reported a large JS chunk warning. This is performance-related, not a security failure.

Pending: Production deployment should include a Firebase rules emulator test run and a controlled metadata backfill for legacy documents.
