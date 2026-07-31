# Implementation Plan

Document all 14 phases with clear scope, deliverables, and verification steps:

## Phase 0 — Foundation and Durable Documentation
**Status: Current Phase**
- Initialize Next.js application with TypeScript, Tailwind CSS, App Router, src directory
- Configure ESLint, strict TypeScript
- Initialize Prisma (configuration only, no business models)
- Create minimal responsive homepage placeholder
- Create minimal admin placeholder page
- Create health API endpoint
- Create comprehensive project documentation
- Verify: lint, typecheck, build all pass
- Commit and push to GitHub

## Phase 1 — PostgreSQL Development Environment and Prisma Schema
- Set up PostgreSQL development database
- Define complete Prisma schema based on DATABASE_DESIGN.md
- Create initial migration
- Seed script with synthetic test data (no real customer data)
- Verify schema matches design document

## Phase 2 — Secure Admin Authentication and Admin Shell
- Admin login page
- Server-side session management
- HttpOnly cookie authentication
- Admin layout with sidebar navigation
- Protected route middleware
- Login rate limiting
- Logout functionality
- Session expiration

## Phase 3 — Customer Management
- Customer CRUD (create, read, update, list, search)
- Phone number normalization
- Duplicate phone detection
- NID workflow (PENDING → SUBMITTED → VERIFIED)
- NID image upload (private storage)
- Customer role management
- Customer bank account management (masked display)
- Customer document upload
- Search and filtering

## Phase 4 — Bike Inventory
- Bike CRUD with image upload
- Bike condition assessment form
- Bike document management
- Status management (AVAILABLE, RESERVED, SOLD, UNLISTED)
- Status history tracking
- Image gallery with primary image selection
- Search and filtering

## Phase 5 — Shop Purchase Workflow
- Record bike purchase from seller
- Link purchase to customer (seller) and bike
- Purchase status workflow (DRAFT → CONFIRMED → COMPLETED)
- Purchase payment recording
- Seller payables tracking
- Database transactions for multi-record operations

## Phase 6 — Customer Sale Workflow
- Record bike sale to buyer
- Link sale to customer (buyer) and bike
- Sale status workflow (DRAFT → CONFIRMED → COMPLETED)
- Sale payment recording
- Buyer receivables tracking
- Discount application
- Auto-update bike public status
- Database transactions for multi-record operations

## Phase 7 — Payments, Dues, Receipts, and Audit Controls
- Individual payment recording (linked to purchase or sale)
- Receipt generation
- Payment void/reversal workflow (no silent deletion)
- Customer receivables summary (money owed to shop)
- Seller payables summary (money owed by shop)
- Audit log for all financial operations
- Balance calculation (server-side only)

## Phase 8 — Public Showroom
- Homepage with real bike data
- Bike catalogue with filtering/search
- Bike detail pages
- Image galleries
- WhatsApp and Call CTAs
- SEO optimization
- Responsive design polish

## Phase 9 — Sell-Bike Submissions
- Public form for selling bikes
- Image upload for bike photos
- Admin review interface
- Status tracking (NEW → REVIEWED → CONTACTED → PURCHASED/REJECTED)
- Link to customer creation when applicable

## Phase 10 — Requested-Bike Workflow
- Public form for bike requests
- Admin review interface
- Status tracking (NEW → REVIEWED → MATCHED → CLOSED)
- Link to customer creation when applicable

## Phase 11 — Offers, Enquiries, and Expenses
- Offer management (create, activate, deactivate)
- Public offer display
- General enquiry form
- Inspection booking
- Expense recording

## Phase 12 — Optional Customer Account and Customer Portal
- Customer signup (name, phone, password/OTP)
- Phone verification
- Link to existing customer record (no duplicates)
- Customer portal: view own enquiries, purchases, sales, payments, dues
- Customers cannot edit admin-controlled financial data

## Phase 13 — Security Audit, Complete Testing, Deployment, Backup, and Restore Validation
- Full security review against SECURITY_REQUIREMENTS.md
- Comprehensive testing
- Production deployment configuration
- Database backup and restore validation
- Dependency audit
- Performance testing
- Final documentation review

### Phase Rules
- Each phase is bounded and independently testable
- Each phase is committed separately and pushed after verification
- Each phase updates PROJECT_STATUS.md and HANDOFF.md
- No phase begins without user approval
- Phase 1 must not begin during Phase 0
