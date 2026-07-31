# Testing Checklist

## General Verification (Every Phase)
- pnpm lint passes
- pnpm typecheck passes  
- pnpm build passes
- No TypeScript `any` usage without documented justification
- No real customer data in test fixtures or seeds
- No .env or credentials committed
- Documentation updated
- Git commit is clean

## Phase 0: Project Initialization
- Homepage renders correctly
- Admin placeholder renders correctly
- Health endpoint returns correct JSON
- TypeScript strict mode enabled
- No secrets in git
- All docs created and complete

## Phase 1: Database Schema & Setup (Planned)
- Prisma migrations run successfully on empty database
- All enum values are correctly defined
- Foreign key constraints prevent orphaned records
- Default values and unique constraints function as expected
- Seed script successfully populates development data

## Phase 2: Core Authentication (Planned)
- Admin login succeeds with valid credentials
- Admin login fails securely with invalid credentials
- Session cookies are HttpOnly and secure
- Unauthorized access to admin routes redirects to login
- Logout successfully invalidates the session

## Phase 3: Inventory Management (Planned)
- Create new motorcycle record successfully
- Validate required fields (chassis number, engine number) prevent creation if missing
- Update existing motorcycle status (e.g., from IN_STOCK to SOLD)
- Prevent duplicate chassis numbers
- Filter and search inventory items correctly

## Phase 4: Customer Management (Planned)
- Create customer profile successfully
- Update customer contact information
- Ensure NID uniqueness if provided
- File uploads for documents process and store correctly
- Fetch customer profile with associated purchase history

## Phase 5: Sales Processing (Planned)
- Form validation catches insufficient deposit or missing details
- Sale creation wraps inventory update, financial record, and sale record in atomic transaction
- Financial calculations correctly sum price, discounts, and payments
- Finalizing a sale marks the associated vehicle as sold

## Phase 6: Payment Tracking & Installments (Planned)
- Record a new payment toward an existing sale successfully
- Prevent payments that exceed the remaining balance
- Update payment schedules and arrears calculations accurately
- Generate correct receipt data for print

## Phase 7: Document Generation (Planned)
- Generate sale receipt PDF/HTML with accurate data
- Generate quotation documents correctly
- Invoice formatting matches business requirements
- Ensure all business details (Sristy-Dristy Bike House) appear on docs

## Phase 8: Financial Reporting (Planned)
- Daily sales report aggregates totals correctly
- Profit calculations sum correctly without floating-point errors
- Expense tracking records properly deduct from net profit
- Filter reports by date range accurately

## Phase 9: Admin Dashboard (Planned)
- Dashboard statistics reflect current database state
- Recent sales widget displays correctly formatted dates and amounts
- Low inventory alerts trigger at correct thresholds
- Data visualization charts render without errors

## Phase 10: Public Website (Planned)
- Available inventory displays correctly to public users
- Vehicle details pages load fast with accurate data
- Contact forms submit successfully and notify admins
- SEO meta tags render correctly for indexing

## Phase 11: Settings & Audit Logging (Planned)
- Application settings update correctly and persist
- Admin user management successfully adds/removes accounts
- Audit logs capture user ID, action, timestamp, and payload for mutations
- Audit logs cannot be modified by standard admin interface

## Phase 12: Production Readiness (Planned)
- Build output size is optimized
- Error boundaries catch and log unexpected exceptions gracefully
- Rate limiters successfully block abuse
- HTTPS enforcement is active

## Phase 13: Final Review & Handover (Planned)
- Complete end-to-end walkthrough passes
- All testing checklist items verified
- User manual and handover documentation finalized
- Backup and restore procedures tested successfully
