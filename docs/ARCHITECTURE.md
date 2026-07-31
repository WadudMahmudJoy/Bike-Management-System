# System Architecture

## Technology Stack
- **Runtime**: Node.js
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Validation**: Zod
- **Package Manager**: pnpm
- **Linting**: ESLint

## Architecture Pattern
- Full-stack TypeScript monolith
- Next.js App Router with Server Components by default
- Client Components only where interactivity is required
- Server Actions for mutations
- API Routes for external endpoints (health checks, webhooks)

## Directory Structure (Planned)
```
src/
  app/                    # Next.js App Router pages and layouts
    (public)/             # Public-facing routes (grouped)
    (admin)/              # Admin routes (grouped)
    api/                  # API routes
  lib/                    # Shared utilities and configuration
    db/                   # Database client and helpers
    validation/           # Zod schemas
  types/                  # TypeScript type definitions
prisma/
  schema.prisma           # Database schema
docs/                     # Project documentation
public/                   # Static assets
```

## Key Architectural Decisions
- Server Components by default for performance and security
- All form validation duplicated: client-side (UX) and server-side (security) using Zod
- Financial calculations performed server-side only
- No floating-point arithmetic for money — use Decimal-compatible types
- Database transactions for multi-record financial operations
- Separate public and admin route groups with independent layouts
- Private file storage for sensitive documents (NID, customer docs)
- Audit logging for all significant data mutations

## Security Architecture
- Server-side session management with HttpOnly cookies
- Server-side authorization checks on every protected route
- CSRF protection
- Input sanitization and validation via Zod
- No public admin registration
- Rate limiting on authentication endpoints
- Content Security Policy headers
- Sensitive field encryption at rest

## Data Flow
The data flow within the system relies on a unidirectional server-focused model:
1. **Public Site Requests**: End users access the public site. Requests are handled by Next.js Server Components, which securely query the PostgreSQL database via Prisma ORM and return rendered HTML.
2. **Admin Site Access**: Admin users access the protected admin routes. Every request undergoes a server-side authorization check before the layout or page is rendered.
3. **Mutations and Actions**: Form submissions and state changes are sent via Next.js Server Actions.
4. **Validation Pipeline**: Incoming data from Server Actions is strictly validated against Zod schemas. This ensures no malformed or unexpected data enters the business logic layer.
5. **Database Transactions**: Validated actions interact with the database. Multi-record operations (e.g., creating a sale, updating inventory, generating payment records) are executed within atomic database transactions to ensure consistency.
6. **Audit Logging**: Any significant mutation to the data (creation, modification, deletion) triggers a write to the audit log table within the same transaction, maintaining a secure trail of all actions.
