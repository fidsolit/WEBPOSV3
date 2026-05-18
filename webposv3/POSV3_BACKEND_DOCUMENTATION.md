# POS V3 Backend Documentation

## Document Purpose

This document explains the backend architecture, database structure, security model, data flow, and backend-related integrations used by POS V3. It is intended for developers, technical reviewers, deployment staff, and future maintainers.

## 1. Backend Overview

POS V3 uses a Supabase-backed architecture for authentication, database access, and row-level security. The frontend is built in Next.js, but most operational data handling is performed directly against Supabase tables using the Supabase JavaScript client.

The backend is primarily composed of:

- Supabase Authentication
- Supabase PostgreSQL database
- SQL migration files
- Row-Level Security policies
- frontend-to-Supabase data operations
- lightweight helper utilities for logging and shared access

## 2. Core Backend Stack

### Application Layer

- Next.js App Router
- React client-side pages and modules

### Backend Service Layer

- Supabase Auth
- Supabase Postgres
- Supabase RLS

### Key Backend Files

- [supabaseClient.ts](/C:/Users/FCODES/Desktop/PROJECTS/webposv3/webposv3/lib/supabaseClient.ts)
- [supabaseServer.ts](/C:/Users/FCODES/Desktop/PROJECTS/webposv3/webposv3/lib/supabaseServer.ts)
- [activityLogger.ts](/C:/Users/FCODES/Desktop/PROJECTS/webposv3/webposv3/lib/activityLogger.ts)

## 3. Supabase Client Setup

### Client-Side Supabase Access

The project uses a shared Supabase client initialized from public environment variables.

File:

- [supabaseClient.ts](/C:/Users/FCODES/Desktop/PROJECTS/webposv3/webposv3/lib/supabaseClient.ts)

Behavior:

- creates a reusable Supabase client
- uses `NEXT_PUBLIC_SUPABASE_URL`
- uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Server Helper

File:

- [supabaseServer.ts](/C:/Users/FCODES/Desktop/PROJECTS/webposv3/webposv3/lib/supabaseServer.ts)

Current role:

- provides a helper to create a Supabase client for server-side usage if needed

## 4. Authentication Backend

Authentication is managed by Supabase Auth.

### Current Authentication Flow

1. user signs in with email and password
2. frontend retrieves the authenticated user
3. frontend checks the user profile row
4. role and approval are validated
5. user is redirected based on access rights

### Related Data

- `auth.users`
- `public.profiles`

### Related Files

- [page.tsx](/C:/Users/FCODES/Desktop/PROJECTS/webposv3/webposv3/app/auth/login/page.tsx)
- [sidebar.tsx](/C:/Users/FCODES/Desktop/PROJECTS/webposv3/webposv3/app/components/sidebar.tsx)
- [supabase_setup.sql](/C:/Users/FCODES/Desktop/PROJECTS/webposv3/webposv3/supabase_setup.sql)

### Trigger-Based Profile Creation

The backend includes a SQL trigger setup that creates a profile row when a new auth user is created.

The setup includes:

- `public.on_auth_user_created()` function
- `on_auth_user_created` trigger on `auth.users`

## 5. Database Design Overview

The POS V3 backend is built around several business domains:

- users and roles
- branches
- products and inventory
- sales and payments
- customer registry and customer credits
- stock movement history
- inventory losses
- user activity logs

## 6. Major Database Tables

### 6.1 Profiles

Purpose:

- stores user metadata used by the application

Important fields used by the app:

- `id`
- `full_name`
- `role`
- `branch_id`
- `is_approved`

Usage:

- role validation
- branch scoping
- cashier approval flow
- activity attribution

### 6.2 Branches

Purpose:

- groups operational data by branch

Used by:

- inventory
- sales
- customer credits
- customers
- stock movements
- user activity logs

### 6.3 Products

Purpose:

- stores sellable item master data

Important fields:

- `id`
- `name`
- `barcode`
- `price`
- `cost`
- `updated_at`
- `low_stock_threshold` from schema migration history

Indexes and hardening are defined in:

- [phase1_schema_upgrade.sql](/C:/Users/FCODES/Desktop/PROJECTS/webposv3/webposv3/phase1_schema_upgrade.sql)

### 6.4 Inventory

Purpose:

- stores current stock per branch and per product

Important fields:

- `id`
- `product_id`
- `branch_id`
- `stock`
- `min_stock`

Key constraints:

- unique inventory per `branch_id + product_id`
- non-negative stock

### 6.5 Product Variants

Purpose:

- stores product variation records

Important fields:

- `id`
- `product_id`
- `name`
- `sku`
- `price`
- `barcode`

Defined in:

- [phase1_inventory_variant_loss_upgrade.sql](/C:/Users/FCODES/Desktop/PROJECTS/webposv3/webposv3/phase1_inventory_variant_loss_upgrade.sql)

### 6.6 Inventory Variant Stock

Purpose:

- stores stock by variant and branch

Important fields:

- `variant_id`
- `branch_id`
- `stock`
- `updated_at`

### 6.7 Sales

Purpose:

- stores sale headers / transaction summary

Important fields:

- `id`
- `branch_id`
- `user_id`
- `receipt_no`
- `status`
- `subtotal`
- `tax`
- `discount_amount`
- `net_total`
- `total`
- `voided_at`
- `voided_by`
- `void_reason`
- `created_at`
- `updated_at`

Used by:

- dashboard
- recent transactions
- reports
- transaction detail view
- void processing

### 6.8 Sale Items

Purpose:

- stores line items per sale

Important fields:

- `sale_id`
- `product_id`
- `quantity`
- `price`
- `unit_cost`
- `line_subtotal`
- `net_line_total`
- `note`

### 6.9 Payments

Purpose:

- stores payment records for a sale

Important fields:

- `sale_id`
- `method`
- `amount`
- `status`
- `reference_no`
- `note`

### 6.10 Customer Credits

Purpose:

- tracks customer balances and promise-to-pay dates

Important fields:

- `customer_name`
- `contact_number`
- `amount`
- `note`
- `promise_to_pay_date`
- `is_paid`
- `payment_status`
- `branch_id`
- `created_by`

Additional backend logic:

- trigger function `set_customer_credit_status()`
- trigger `trg_set_customer_credit_status`

This auto-updates status to:

- `pending`
- `paid`
- `overdue`

Defined in:

- [phase1_role_credit_upgrade.sql](/C:/Users/FCODES/Desktop/PROJECTS/webposv3/webposv3/phase1_role_credit_upgrade.sql)

### 6.11 Customers

Purpose:

- stores customer registry records separately from credit transactions

Important fields:

- `full_name`
- `contact_number`
- `email`
- `address`
- `notes`
- `branch_id`
- `created_by`
- `created_at`
- `updated_at`

Defined in:

- [phase1_customer_registry_upgrade.sql](/C:/Users/FCODES/Desktop/PROJECTS/webposv3/webposv3/phase1_customer_registry_upgrade.sql)

### 6.12 Inventory Losses

Purpose:

- records damaged, expired, missing, or otherwise removed stock

Important fields:

- `branch_id`
- `product_id`
- `variant_id`
- `quantity`
- `reason`
- `created_by`
- `created_at`

### 6.13 Stock Movements

Purpose:

- stores auditable stock activity history

Important fields:

- `branch_id`
- `product_id`
- `movement_type`
- `quantity`
- `unit_cost`
- `reference_type`
- `reference_id`
- `note`
- `created_by`
- `created_at`

Allowed `movement_type` values:

- `sale`
- `restock`
- `adjustment`
- `transfer_in`
- `transfer_out`
- `void_restore`

Current application usage:

- `restock` for delivery stock refills
- `adjustment` for inventory loss
- `sale` for stock deduction after completed sale
- `void_restore` for restoring inventory after voiding a sale

Defined in:

- [phase1_schema_upgrade.sql](/C:/Users/FCODES/Desktop/PROJECTS/webposv3/webposv3/phase1_schema_upgrade.sql)

Policies added in:

- [phase1_stock_movements_policy_upgrade.sql](/C:/Users/FCODES/Desktop/PROJECTS/webposv3/webposv3/phase1_stock_movements_policy_upgrade.sql)

### 6.14 User Activity Logs

Purpose:

- records login and logout activity

Important fields:

- `user_id`
- `branch_id`
- `activity_type`
- `created_at`

Allowed activity types:

- `login`
- `logout`

Defined in:

- [phase1_user_activity_logs_upgrade.sql](/C:/Users/FCODES/Desktop/PROJECTS/webposv3/webposv3/phase1_user_activity_logs_upgrade.sql)

## 7. SQL Migration Files

The project uses SQL upgrade files to evolve schema and policies.

### Main Schema Upgrade

- [phase1_schema_upgrade.sql](/C:/Users/FCODES/Desktop/PROJECTS/webposv3/webposv3/phase1_schema_upgrade.sql)

Covers:

- product hardening
- inventory hardening
- stock movements
- sales structure updates
- sale item updates
- payments updates
- saved carts

### Role + Credit Upgrade

- [phase1_role_credit_upgrade.sql](/C:/Users/FCODES/Desktop/PROJECTS/webposv3/webposv3/phase1_role_credit_upgrade.sql)

Covers:

- customer credits
- credit status trigger
- sales, sale_items, payments RLS

### Customer Registry Upgrade

- [phase1_customer_registry_upgrade.sql](/C:/Users/FCODES/Desktop/PROJECTS/webposv3/webposv3/phase1_customer_registry_upgrade.sql)

Covers:

- customer registry table
- customer RLS policies

### Inventory Variant + Loss Upgrade

- [phase1_inventory_variant_loss_upgrade.sql](/C:/Users/FCODES/Desktop/PROJECTS/webposv3/webposv3/phase1_inventory_variant_loss_upgrade.sql)

Covers:

- product variants
- inventory variant stock
- inventory losses

### Stock Movement Policy Upgrade

- [phase1_stock_movements_policy_upgrade.sql](/C:/Users/FCODES/Desktop/PROJECTS/webposv3/webposv3/phase1_stock_movements_policy_upgrade.sql)

Covers:

- enabling RLS for `stock_movements`
- select policy
- insert policy

### User Activity Logs Upgrade

- [phase1_user_activity_logs_upgrade.sql](/C:/Users/FCODES/Desktop/PROJECTS/webposv3/webposv3/phase1_user_activity_logs_upgrade.sql)

Covers:

- `user_activity_logs` table
- indexes
- RLS policies for select and insert

## 8. Row-Level Security Model

POS V3 relies heavily on Supabase RLS for access control.

### RLS Pattern Used

Most policies follow one of these rules:

- admin can access records across the system
- non-admin users can only access records linked to their branch
- insert operations usually require `created_by = auth.uid()` or `user_id = auth.uid()`

### Examples of Protected Tables

- `customers`
- `customer_credits`
- `sales`
- `sale_items`
- `payments`
- `stock_movements`
- `user_activity_logs`

## 9. Backend Data Flows

### 9.1 Login Flow

1. `supabase.auth.signInWithPassword()` authenticates user
2. application fetches profile row
3. approval and role are checked
4. `logUserActivity("login")` writes into `user_activity_logs`

### 9.2 Logout Flow

1. sidebar logout button calls `logUserActivity("logout")`
2. activity row is inserted
3. `supabase.auth.signOut()` ends the session

### 9.3 Sale Processing Flow

1. insert into `sales`
2. update generated `receipt_no`
3. insert `sale_items`
4. insert `payments`
5. reduce inventory stock
6. insert `stock_movements` rows with `movement_type = 'sale'`

### 9.4 Delivery Refill Flow

1. validate selected product and quantity
2. fetch current inventory row
3. update inventory stock upward
4. insert `stock_movements` row with `movement_type = 'restock'`
5. rollback stock if movement logging fails

### 9.5 Inventory Loss Flow

1. validate product and quantity
2. fetch inventory row
3. insert `inventory_losses`
4. reduce inventory stock
5. insert `stock_movements` row with `movement_type = 'adjustment'`
6. rollback stock and delete the loss row if logging fails

### 9.6 Void Sale Flow

1. fetch sale and sale items
2. restore inventory quantity for each item
3. insert `stock_movements` row with `movement_type = 'void_restore'`
4. update sale status to `void`

## 10. Backend Logging and Auditability

POS V3 includes two important backend audit mechanisms.

### User Activity Logging

Tracks:

- login
- logout

Purpose:

- monitor recent system access
- support admin oversight

### Stock Movement Logging

Tracks:

- stock increase
- stock decrease
- stock restoration
- stock adjustment

Purpose:

- create inventory audit trail
- explain stock changes over time

## 11. API-Like Behavior in the Current App

The application mostly writes directly to Supabase instead of using many custom backend API routes.

Current direct-write areas include:

- login/logout activity
- sales creation
- inventory delivery
- inventory loss
- customer CRUD
- customer credit entries

### Existing Custom Route

- [route.ts](/C:/Users/FCODES/Desktop/PROJECTS/webposv3/webposv3/app/api/sms/reminder/route.ts)

Purpose:

- handles SMS reminder sending for customer credit follow-up

## 12. Error Handling Strategy

The backend interaction style is mostly optimistic but guarded by validation and rollback where needed.

Examples:

- invalid stock quantities are rejected before write
- stock refills rollback inventory if stock movement insert fails
- inventory loss reverses changes if movement logging fails
- sale flow alerts if stock history cannot be inserted
- RLS violations are surfaced with clearer guidance in stock refill flow

## 13. Current Backend Strengths

POS V3 backend already supports:

- branch-aware access control
- auditable stock movement history
- user access history
- customer credit lifecycle management
- delivery and loss stock workflows
- sales and payment persistence
- expandable SQL migration structure

## 14. Current Backend Limitations

These are important to know for future maintenance:

- many writes are still performed directly from client-side pages
- some flows depend on the frontend to coordinate multi-step writes
- not all operations are wrapped in database transactions
- sale rollback is limited if a later step fails after early inserts
- server-only protected business actions could be further hardened with RPCs or server actions

## 15. Recommended Backend Improvements

For future versions, the following are recommended:

- move critical stock and sales writes into Supabase RPC or secure server actions
- wrap multi-step inventory and sales operations in database transactions
- add explicit `stock_movements` policies for updates/deletes only if required
- add structured audit logs for approval changes and role changes
- add backend validation for barcode uniqueness across all related item types
- add reporting views or materialized views for analytics-heavy screens

## 16. Environment Requirements

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Required Supabase setup:

- Auth enabled
- PostgreSQL schema applied
- all migration SQL files executed as needed
- RLS policies created

## 17. Conclusion

The POS V3 backend is a Supabase-centered retail backend that combines authentication, branch-aware access control, operational data persistence, and audit logging. It already supports the core needs of a working POS platform, including stock movement history, customer credit tracking, recent user activity logging, and management reporting support.

Its strongest backend characteristics are:

- practical schema upgrades through SQL files
- strong use of Supabase RLS
- stock movement auditability
- user activity tracking
- branch-based operational scoping
