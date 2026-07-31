# Sristy-Dristy Bike House — Product Specification (MVP)

## Overview

The Sristy-Dristy Bike House Bike Management System is a premium, specialized software solution designed specifically for a pre-owned motorcycle dealership. It comprises a modern, fast, public-facing showroom website to attract customers and an extensive, secure administrative backend for daily operations. The system is designed to handle inventory lifecycle, customer relations, financial tracking, and digital presence without unnecessary complexity, targeting operational efficiency and a premium customer experience.

## Public Website Features

The public website serves as the digital storefront for Sristy-Dristy Bike House, designed to convert visitors into inquiries and showroom visits.

*   **Premium Homepage:** Features business branding, featured motorcycles, active promotional offers, and clear calls-to-action to browse inventory or contact the shop.
*   **Available Bike Catalogue:** A comprehensive list of currently available motorcycles with filtering options (brand, price range, condition, engine capacity, mileage) and sorting capabilities.
*   **Bike Details Page:** Individual pages for each motorcycle featuring high-quality image galleries, detailed specifications, condition reports, pricing, and direct inquiry options.
*   **Offer Display:** Prominent visibility for seasonal and promotional offers across the homepage and relevant listing pages.
*   **Sell Your Bike Submission Form:** A dedicated, frictionless form allowing anyone to submit their motorcycle details for appraisal and potential sale to the shop. No login is required.
*   **Request a Bike Submission Form:** A specialized form enabling visitors to request a specific make or model that is currently not in stock. No login is required.
*   **Contact Page:** Complete shop details, including physical address, embedded maps, operating hours, email, and primary contact numbers.
*   **Direct Communication Actions:** Embedded "Call" and "WhatsApp" action buttons on every relevant page (especially on bike detail pages and contact pages) for immediate customer interaction.
*   **Inspection Enquiry Form:** A form attached to available bikes allowing customers to schedule an in-person inspection or test ride.
*   **Frictionless Access:** The entire public website is accessible without user registration or login barriers, ensuring maximum reach and ease of use.

## Admin System Features

The administrative backend is a secure, role-based application for managing the dealership's core business functions.

*   **Dashboard:** A comprehensive overview of key business metrics, including current inventory levels, recent sales, pending requests, and financial summaries.
*   **Bike Inventory Management:** Full lifecycle management of motorcycles. Features include adding new bikes, editing details, uploading and managing image galleries, tracking current status (available, reserved, sold, in maintenance), and recording specifications.
*   **Customer Management:** A centralized CRM for all customer data. Features include creating new customer profiles, searching, editing details, tracking associated roles (buyer, seller), and managing the NID (National Identity) verification workflow.
*   **Shop Purchases:** Workflows to record motorcycles bought from private sellers, including agreed purchase prices, tracking payments made to the seller, and generating purchase agreements.
*   **Customer Sales:** Workflows to record motorcycles sold to buyers, tracking the agreed sale price, recording payments received, and managing the ownership transfer status.
*   **Payments Module:** A unified system to record individual financial transactions (cash, bank transfer, mobile financial services), linking each payment to specific purchase or sale records, and generating digital receipts.
*   **Customer Receivables:** Financial tracking of money owed to the dealership by buyers (e.g., pending installments, remaining balances after initial deposits).
*   **Seller Payables:** Financial tracking of money owed by the dealership to sellers (e.g., pending payments for purchased inventory).
*   **Bike Requests Management:** An interface to review, organize, and respond to public submissions from the "Request a Bike" form.
*   **Sell-Bike Submissions Management:** An interface to evaluate, track, and process leads generated from the public "Sell Your Bike" form.
*   **Offers Management:** Tools to create, edit, activate, deactivate, and schedule promotional campaigns and discount offers displayed on the public website.
*   **Expenses Tracking:** A dedicated ledger to record and categorize day-to-day shop operational expenses (utilities, maintenance, marketing, salaries) for accurate profitability analysis.
*   **Receipts System:** Automated generation, storage, and retrieval of professional, branded payment receipts for all financial transactions.
*   **Shop Settings:** Configuration management for core business information, contact details, operational parameters, and system-wide settings.
*   **Audit History:** Comprehensive logging of all significant data changes, tracking who made the change, when it occurred, and the nature of the modification for accountability and security.

## Customer Information Model

The system utilizes a flexible yet robust customer information model designed to accommodate real-world dealership operations, where complete information might not be immediately available during initial contact.

### Required or Conditionally Required Fields

*   **Full Name:** Mandatory at the time of profile creation.
*   **Phone Number:** Mandatory at the time of profile creation. System ensures numbers are normalized and formatted consistently.
*   **Address:** Required before any transaction (purchase or sale) can be formally processed and completed.
*   **NID (National Identity Number):** Conditionally required. Necessary before final transaction completion and ownership transfer. May start in a `PENDING` state during early interactions.

### Optional Fields

*   **Father's Name:** Collected for complete documentation when available.
*   **WhatsApp Number:** For secondary communication, if different from the primary phone number.
*   **Email Address:** For digital communications and electronic receipt delivery.
*   **Bank Account Details:** Used primarily for sellers to facilitate payments from the shop.
*   **Emergency Contact:** Additional contact information for critical scenarios.
*   **Internal Notes:** A secure, admin-only text area for staff to leave context, negotiation details, or specific customer preferences.

### NID Policy Workflow

The NID policy is designed to balance frictionless early engagement with strict legal compliance for final transactions.

1.  **Initial Status:** A customer profile may be created with the NID status marked as `PENDING`.
2.  **Permitted Actions Under Pending Status:** The system allows recording draft transactions, logging customer enquiries, managing bike requests, processing reservations, and accepting initial partial payments while the NID is pending.
3.  **Data Submission:** The customer's NID number, along with scanned images of the front and back of the NID card, can be uploaded and attached to the profile at any time after creation.
4.  **Final Requirement:** Final transaction closure (marking a sale or purchase as fully complete) and initiating the official ownership transfer process strictly require the configured NID requirements to be satisfied and validated within the system.

### Customer Roles

The model recognizes that a single individual may interact with the dealership in multiple capacities over time. One customer profile may hold multiple roles simultaneously, tracking their comprehensive history with the business.

*   **Buyer:** A customer who has purchased or is currently in the process of purchasing a motorcycle from the shop.
*   **Seller:** A customer who has sold or is currently selling a motorcycle to the shop.
*   **Potential Buyer:** An individual who has expressed active interest, scheduled an inspection, or made an enquiry about purchasing a bike.
*   **Potential Seller:** An individual who has submitted a "Sell Your Bike" form but has not yet concluded a transaction.
*   **Bike Requester:** An individual who has submitted a request for a specific motorcycle not currently in stock.

## Explicit Exclusions from MVP

To ensure focused delivery and maintain operational stability, the following features are strictly excluded from the Minimum Viable Product (Phase 0) release.

*   **Mobile Application:** No dedicated iOS or Android applications will be developed for the MVP. The website will be fully responsive for mobile browsers.
*   **Public Live Chat:** Real-time on-site chat functionality is excluded. Communication will rely on direct calls, WhatsApp links, and forms.
*   **Online Payment Gateway Integration:** The system will not process credit cards or digital payments directly through the website or admin panel. All financial transactions are recorded manually by admins.
*   **Automated WhatsApp API Integration:** There will be no automated messaging, chatbots, or automated notifications sent via the WhatsApp Business API. WhatsApp interactions are manual via standard links.
*   **Full Accounting ERP:** The system handles specific payments, receivables, payables, and expenses but does not replace a comprehensive, double-entry accounting system or handle advanced tax reporting.
*   **Multi-branch Support:** The MVP is designed to support a single physical dealership location.
*   **Interest-bearing Loan Calculation:** The system tracks outstanding balances and installments but does not include automated interest calculation engines or complex financing logic.
*   **Complex Employee Permission System:** The MVP will utilize a simplified role structure (e.g., standard Admin, Super Admin) rather than a granular, customizable, per-action permission matrix.
