# Product Specification (MVP)

This document defines the MVP functional specification for **Sristy-Dristy Bike House** (Legal Entity: **Sristy-Dristy Enterprise**).

---

## 1. System Overview

Sristy-Dristy Bike House is a production-grade pre-owned motorcycle dealership system. It comprises two major applications built as a unified Next.js App Router monolith:
1. **Public Showroom Website:** Customer-facing portal for browsing available motorcycles, viewing promotional offers, submitting sell-bike requests, submitting custom bike search requests, booking inspections, and initiating Call/WhatsApp inquiries.
2. **Admin Management Panel:** Comprehensive back-office application for showroom staff to manage inventory, customer business records, purchasing from sellers, selling to buyers, financial payment ledgers, receivables, payables, expenses, receipts, and audit history.

---

## 2. Public Showroom Specification

### Browsing & User Experience
- **No Mandatory Login:** All public features (browsing inventory, viewing bike details, checking offers, submitting forms, booking inspections, contacting via WhatsApp) operate without customer authentication.
- **Obsidian Theme:** Premium design aesthetic utilizing Obsidian backgrounds (`#0A0A0A`), Graphite cards (`#1A1A1A`), Warm Ivory text (`#F5F0E8`), and Muted Champagne accents (`#C8B88A`).
- **Call & WhatsApp Integration:** Direct CTA buttons on every bike detail page and header to contact showroom staff instantly.

### Public Pages
1. **Homepage (`/`):** Hero section, tagline ("Pre-Owned. Properly Checked. Ready to Ride."), feature highlights, and navigation preview.
2. **Available Bikes (`/bikes`):** Catalogue of pre-owned motorcycles filtered dynamically by brand, model, year, price range, engine CC, and condition.
3. **Bike Details (`/bikes/[id]`):** High-resolution image gallery, registration details, mileage, technical specifications, condition report, asking price, availability status, inspection request form, and WhatsApp CTA.
4. **Offers (`/offers`):** Active promotional discounts and seasonal sales linked to specific inventory items.
5. **Sell Your Bike (`/sell-your-bike`):** Form for motorcycle owners to submit their bike for showroom purchase (brand, model, year, asking price, description, photo uploads).
6. **Request a Bike (`/request-a-bike`):** Form for buyers seeking a specific bike model (brand, model, min/max year, min/max budget, max mileage, preferred color, required by date).
7. **Contact (`/contact`):** Showroom address, phone numbers, WhatsApp link, opening hours, interactive map location, and general inquiry form.

---

## 3. Admin System Specification

### Core Admin Modules
1. **Dashboard:** Real-time metrics (available inventory count, pending buy requests, pending sell submissions, total monthly sales, total receivables, total payables).
2. **Bike Inventory Management:** Full CRUD operations for motorcycle stock. Assign public statuses (`DRAFT`, `AVAILABLE`, `RESERVED`, `SOLD`, `HIDDEN`), upload/order photos, record condition assessments, and manage vehicle documents.
3. **Customer Management:** Create and edit customer business records, track roles (`BUYER`, `SELLER`, `POTENTIAL_BUYER`, `POTENTIAL_SELLER`, `BIKE_REQUESTER`), manage NID verification lifecycle, store encrypted bank accounts, and attach private documents.
4. **Shop Purchase Workflow:** Record motorcycle acquisitions from sellers. Manage purchase agreements (`DRAFT`, `CONFIRMED`, `COMPLETED`, `CANCELLED`), track document transfers, and record outgoing payments (`PurchasePayment`).
5. **Customer Sale Workflow:** Record motorcycle sales to buyers. Manage sales agreements (`DRAFT`, `CONFIRMED`, `COMPLETED`, `CANCELLED`), track discounts, record incoming payments (`SalePayment`), and manage document handovers.
6. **Payment Ledger & Receipts:** Record individual payments. View buyer receivables (money owed TO shop) and seller payables (money owed BY shop). Generate receipts. Execute void operations with audit reasons (no silent deletions).
7. **Submissions & Request Handling:** Review public "Sell Your Bike" submissions (`SellBikeRequest`) and "Request a Bike" submissions (`BikeRequest`). Assign staff, update statuses, and convert submissions into active customer/inventory records.
8. **Operational Expenses:** Record showroom operational expenses (`Expense`) with category, amount, date, payee, and receipt attachment.
9. **Shop Settings & Audit Log:** Configure showroom details and view immutable system audit logs (`AuditLog`) tracking all financial and inventory changes.

---

## 4. Customer Information & NID Policy

### Customer Record Fields
- **Required at Creation:** Full Name, Normalized Phone Number.
- **Required before Final Transaction:** Physical Address, NID Number & Documentation.
- **Optional Fields:** WhatsApp Number, Email, Father's Name, Emergency Contact, Bank Account Details, Internal Admin Notes.

### NID Lifecycle & Verification Rules
- Statuses: `PENDING`, `SUBMITTED`, `VERIFIED`, `NEEDS_CORRECTION`.
- Customers may be created with NID status `PENDING`.
- Enquiries, bike requests, reservations, draft purchases, draft sales, and initial deposit payments are permitted while NID status is `PENDING`.
- Final transaction document completion requires a minimum NID status of `SUBMITTED`.
- Ownership transfer completion requires `VERIFIED`.

---

## 5. Explicit MVP Exclusions

The following features are strictly excluded from the initial MVP release:
- Native mobile applications (iOS / Android).
- Custom in-house public live chat engine (WhatsApp is used exclusively).
- Automated online payment gateway processing (bKash / Nagad / SSLCommerz APIs).
- Automated WhatsApp API messaging bots.
- Enterprise multi-branch ERP accounting.
- Interest-bearing loan or installment interest calculations.
- Granular custom employee permissions beyond core admin roles (`SUPER_ADMIN`, `MANAGER`, `SALES_AGENT`).
