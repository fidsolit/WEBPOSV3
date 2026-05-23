# POS V3 Complete System Documentation

## Document Purpose

This document explains the full functionality, modules, workflows, and special features of the POS V3 system. It is written for client presentation, system turnover, operational reference, and feature overview.

## 1. System Introduction

POS V3 is a web-based point of sale and business operations system designed for retail use. It helps a business process transactions, manage stock, monitor low inventory, handle customer credit, control user access, and review sales and profit performance in one platform.

The system is intended for both daily store operations and management review.

## 2. Main Objectives

POS V3 is built to help the business:

- process sales quickly and accurately
- reduce manual inventory tracking
- monitor low-stock products before they run out
- record stock refills and stock losses properly
- manage customer credit and reminders
- record operating expenses
- control staff roles and access
- review recent user activity
- analyze sales, expenses, and profit performance

## 3. User Roles

### 3.1 Admin

Admin users have access to all major system functions.

Admin can:

- access the dashboard
- create and manage sales
- manage customers
- manage inventory
- manage expenses
- receive deliveries
- log stock losses
- review inventory history
- review low-stock alerts
- manage user roles and branches
- approve cashier accounts
- review user login/logout activity
- access reports
- access settings

### 3.2 Cashier

Cashier users are intended for transaction and daily front-counter operations.

Cashier can:

- log in to the POS
- process sales
- log and review expenses
- view working dashboard information allowed by the system
- use customer-related functions that are available in their role flow

Cashier accounts may require admin approval before they can transact.

## 4. Core Modules

### 4.1 Authentication Module

This module controls user access to the system.

Functions:

- user login
- user registration
- role-based access
- cashier approval validation
- logout process
- login and logout activity logging

Benefits:

- secures the system
- limits sensitive modules to admins
- tracks user session activity

### 4.2 Dashboard Module

The dashboard gives users a quick overview of the store’s current performance and operational status.

Functions:

- total revenue display
- today’s sales amount
- today’s transaction count
- low-stock alert summary
- recent transactions list
- due promise-to-pay credit alerts
- recent customer credit overview

Benefits:

- gives instant business visibility
- supports daily monitoring
- highlights urgent actions

### 4.3 Sales / POS Module

This is the main sales processing area of the system.

Functions:

- create new sale
- add products to cart
- product search by name
- barcode search during selling
- quantity management
- automatic price and total calculation
- payment recording
- transaction saving
- receipt number generation
- transaction detail viewing
- printable transaction receipt/details
- void sale function
- inventory restoration after void

Benefits:

- speeds up checkout
- reduces human error in computation
- preserves transaction history

### 4.4 Customer Module

This module stores customer data and credit-related information.

Functions:

- add new customer
- edit customer details
- store customer name
- store contact number
- store email
- store address
- store notes
- view unpaid customer balances
- group unpaid credit by customer
- mark credit as paid
- search customer unpaid accounts
- send SMS reminder for outstanding balances

Benefits:

- improves customer record keeping
- supports credit sales monitoring
- helps follow up unpaid accounts

### 4.5 Customer Credit Module

This module handles customer credit entries from the POS workflow.

Functions:

- add customer credit from dashboard
- record amount
- record contact number
- record note
- assign promise-to-pay date
- display due credit alerts
- display recent credit records

Benefits:

- supports flexible selling models
- helps track collectible balances

### 4.6 Inventory Module

This module manages all stock-related information.

Functions:

- add new product
- assign barcode
- assign unit cost
- assign selling price
- assign opening stock
- assign low-stock alert threshold
- paginate inventory list
- display current stock
- display alert level per item
- show low-stock alerts
- view inventory items by alert condition

Benefits:

- centralizes stock monitoring
- makes stock control easier
- improves visibility of product availability

### 4.7 Low-Stock Alert Module

This module monitors products that are nearing stock depletion.

Rule:

- an item is considered low stock when `current stock <= alert threshold`

Functions:

- detect low-stock items automatically
- display low-stock alerts on inventory
- show alert threshold beside stock level
- click alert to focus on affected inventory item
- highlight selected low-stock item in the inventory list
- open low-stock item detail view

Benefits:

- prevents unexpected stockouts
- supports proactive restocking

### 4.8 Delivery / Stock Refill Module

This module is used when new stock is received from suppliers.

Functions:

- receive delivery
- search product by name
- search product by barcode
- barcode auto-match product selection
- filtered product dropdown
- record delivery quantity
- optional unit cost input
- optional supplier name
- optional invoice or reference number
- optional delivery note
- automatic stock increase
- automatic stock movement log entry
- recent deliveries display

Benefits:

- supports proper restocking
- keeps refill activity documented
- reduces manual stock adjustment mistakes

### 4.9 Inventory Loss Module

This module is used when stock is damaged, expired, missing, or otherwise removed.

Functions:

- log inventory loss
- select affected product
- record quantity lost
- record reason
- reduce inventory stock automatically
- save recent loss log
- save inventory movement history

Benefits:

- improves stock accountability
- tracks shrinkage and damaged items

### 4.10 Inventory History Module

This module shows the movement history of stock activity.

History can include:

- deliveries or restocks
- sales deductions
- stock adjustments
- restored inventory from voided sales
- other movement types supported by the system

Functions:

- recent inventory movement list
- movement type labeling
- quantity increase or decrease indication
- encoded by display
- notes display
- date and time history

Benefits:

- gives audit visibility
- helps explain stock changes over time

### 4.11 User Management Module

This module is for admin use only.

Functions:

- view all staff accounts
- view roles
- change user role
- approve cashier
- unapprove cashier
- assign branch
- search users by name, ID, or branch
- filter users by role
- paginated user table

Benefits:

- makes role control easier
- supports branch assignment management

### 4.12 Recent User Activity Module

This module is visible only to admins and shows recent user access events.

Tracked events:

- login
- logout

Functions:

- recent activity table
- user name display
- branch display
- activity type display
- timestamp display

Benefits:

- supports staff monitoring
- improves security awareness

### 4.13 Reports Module

This module provides management-level insights.

Functions:

- total revenue reporting
- total cost of goods reporting
- total operating expense reporting
- gross profit reporting
- total net profit reporting after expenses
- daily profit metrics
- weekly profit metrics
- monthly profit metrics
- yearly profit metrics
- expense-aware financial summary
- top-selling items
- recent completed transactions
- recent logged expenses
- card view
- graph view

Benefits:

- supports better decision-making
- tracks profitability and performance
- helps monitor business outflows alongside sales

### 4.14 Expenses Module

This module allows the business to record and monitor store operating expenses.

Functions:

- log new expense entries
- edit existing expense records
- delete expense records
- categorize expenses
- record payment method
- record receipt or invoice reference number
- record expense date
- record detailed expense description
- display who logged each expense
- search expenses by description, category, reference, payment method, and user
- paginated expense table
- filtered expense total summary

Benefits:

- improves tracking of store outflows
- supports accountability through user-based logging
- gives management cleaner operating expense records
- feeds more accurate profit reporting

### 4.15 Settings Module

This module provides access to system settings and configuration area for admin use.

Purpose:

- support future configuration and administrative control

## 5. Special Features

The following are special or standout features of POS V3.

### 5.1 Clickable Low-Stock Alerts

Low-stock alerts are not only informational. They are interactive.

Special behavior:

- clicking a low-stock alert focuses the affected item in inventory
- the item can be highlighted
- the user can quickly move into stock review or refill action

### 5.2 Barcode-Based Product Selection

The system supports barcode use in both sales and delivery/refill workflows.

Special behavior:

- barcode can be scanned or typed
- matching item can be selected automatically
- reduces time in searching products manually

### 5.3 Delivery Refill with Audit Trail

Receiving stock is not just a stock edit. It is logged as a stock movement.

Special behavior:

- increases stock correctly
- stores refill details
- preserves note and supplier-related information
- contributes to inventory history

### 5.4 Void Sale with Inventory Restoration

Voiding a sale does not only change transaction status. It can also restore sold inventory.

Special behavior:

- returns inventory quantity
- records the restoration event
- keeps audit history

### 5.5 Customer Credit and Promise-to-Pay Alerts

The system supports credit tracking for customers.

Special behavior:

- unpaid balances are grouped and visible
- due dates can be monitored
- due alerts can be surfaced in dashboard
- SMS reminders can be sent

### 5.6 User Login/Logout Activity Tracking

The system records user access activity for security and accountability.

Special behavior:

- tracks login
- tracks logout
- visible to admin for recent review

### 5.7 Inventory Pagination for Performance

Large data lists can slow down systems over time, so POS V3 includes pagination for major list views.

Special behavior:

- paginated inventory
- paginated customer lists
- paginated users list
- paginated recent transaction views where applicable

This helps the system stay responsive as records grow.

## 6. Main Workflows

### 6.1 Login Workflow

1. User enters email and password
2. System validates credentials
3. System checks role and approval
4. Approved user is redirected to the dashboard
5. Login activity is logged

### 6.2 Sales Workflow

1. User opens New Sale
2. Products are selected by search or barcode
3. Cart is built
4. Sale totals are calculated
5. Transaction is saved
6. Receipt number is generated
7. Payment is saved
8. Inventory stock is reduced
9. Sale stock movement history is recorded

### 6.3 Void Transaction Workflow

1. Admin selects a sale to void
2. System confirms void request
3. Inventory is restored
4. Void restoration is logged
5. Sale status becomes void

### 6.4 Customer Credit Workflow

1. User records customer credit
2. Promise-to-pay date may be assigned
3. Credit appears in customer balances
4. Due alerts become visible
5. SMS reminder may be sent
6. Credit may later be marked paid

### 6.5 Inventory Refill Workflow

1. Admin opens Receive Delivery
2. Product is found by search or barcode
3. Delivery quantity is entered
4. Optional supplier/reference details are entered
5. Stock is updated
6. Stock movement is logged
7. Delivery appears in recent deliveries and inventory history

### 6.6 Inventory Loss Workflow

1. Admin opens Log Loss
2. Product is selected
3. Quantity and reason are entered
4. Stock is reduced
5. Loss log is stored
6. History entry is recorded

### 6.7 Low-Stock Response Workflow

1. System detects low-stock item
2. Alert appears in inventory
3. User clicks the alert
4. Related inventory item is shown/highlighted
5. Admin decides whether to refill stock

### 6.8 Logout Workflow

1. User clicks Logout
2. System signs out the user
3. Logout activity is logged
4. User returns to login page

## 7. Data Managed by the System

POS V3 manages these major data sets:

- user profiles
- roles
- branch assignments
- login/logout activities
- products
- barcodes
- stock quantities
- low-stock thresholds
- deliveries
- inventory losses
- stock movements
- sales
- sale items
- payments
- customer profiles
- customer credits
- due reminders
- reports and summaries

## 8. Security and Administrative Controls

The system includes several control mechanisms.

Examples:

- authenticated login
- admin-only management pages
- cashier approval
- branch-based access handling
- Supabase row-level restrictions
- recent activity visibility for admin
- stock movement audit trail

## 9. Operational Benefits to the Client

POS V3 helps the client by:

- improving speed at checkout
- improving stock accuracy
- reducing stock-related mistakes
- making low-stock detection easier
- documenting deliveries and losses
- improving accountability in user activity
- organizing customer credit operations
- providing profit and sales visibility

## 10. Recommended Usage

To maximize the value of the system, it is recommended that the client:

- require every user to use their own login
- approve cashier accounts before use
- review low-stock alerts daily
- encode deliveries immediately upon receipt
- record stock losses immediately once verified
- review user activity regularly
- check reports on a daily, weekly, and monthly basis

## 11. Summary

POS V3 is a complete retail POS and store operations platform. It combines transaction processing, customer management, stock monitoring, delivery refill tracking, inventory audit history, user monitoring, and profit reporting into a single operational system.

Its strongest value comes from combining daily store functions with management visibility and accountability features, especially:

- barcode-enabled sales and delivery handling
- clickable low-stock monitoring
- delivery and inventory history
- customer credit reminders
- admin-only recent user activity tracking
- structured reporting for business analysis
