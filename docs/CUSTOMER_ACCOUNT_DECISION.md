# Customer Account Decision

Document these locked decisions:

## Browsing Does Not Require Login
Customer signup is optional. No login is required for:
- Browsing the bike catalogue
- Viewing bike details
- Viewing offers
- WhatsApp communication
- General enquiries
- Sell Your Bike submissions
- Request a Bike submissions
- Inspection booking requests

## Separation of Business Records and Login Accounts
- Customer business records (Customer entity) and customer login accounts (CustomerAccount entity) are separate database concepts
- An admin may create a Customer record without any associated login account
- A customer may later create a CustomerAccount and securely link it to their existing Customer record

## Account Linking
- Linking uses verified phone ownership (OTP or similar verification)
- The system matches on verified phone number
- Linking must not create duplicate Customer records
- If a matching Customer record exists, the new CustomerAccount links to it
- If no matching Customer record exists, a new Customer record is created along with the account

## Initial Signup Requirements
Initial signup collects only:
- Full name (required)
- Phone number (required, normalized)
- Password or OTP verification (required)
- Email (optional)
- Acceptance of privacy terms (required)

Initial signup does NOT require:
- NID number or images
- Bank account details
- Address
- Father's name

These can be submitted later through a protected account settings process.

## Customer Portal Permissions
Once implemented, customers may view only their own:
- Enquiries
- Bike requests
- Sell-bike submissions
- Purchases (bikes they bought)
- Sales (bikes they sold to the shop)
- Receipts
- Valid payment history
- Remaining due amount
- Next payment date

Customers CANNOT edit admin-controlled data:
- Prices
- Discounts
- Payments (amounts, dates)
- Outstanding dues
- Purchases (records)
- Sales (records)
- Receipts (content)
- Audit history

## Implementation Timing
- The customer portal will be implemented ONLY after core admin modules are stable (Phase 12)
- The database design includes the CustomerAccount entity from the start to avoid schema migration complications
- The one-to-one Customer ↔ CustomerAccount relation is designed into the schema but not implemented in code until Phase 12
