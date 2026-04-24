Added features
New page: app/customers/page.tsx

Admin-only access
Lists customers with unpaid credit
Shows:
customer name
contact number
total to pay amount
unpaid entries count
next due date
Search by name/contact
Send SMS button per customer
Credit now stores contact number

Updated app/pos/page.tsx Add Customer Credit modal:
added contact number input
Insert now saves contact_number in customer_credits
SMS reminder endpoint

Added app/api/sms/reminder/route.ts
Uses Twilio to send reminder messages to customer contact
DB migration updated

Updated phase1_role_credit_upgrade.sql:
adds contact_number column
adds index for contact number
keeps promise-to-pay and RLS policy setup
Dependency installed

Added twilio package in package.json