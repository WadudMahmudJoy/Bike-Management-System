# UI Design System

This document outlines the design philosophy, components, and architectural rules for the User Interface of the Sristy-Dristy Bike House (Bike Management System) platform. It is split into two primary contexts: the Public Website and the Admin Dashboard.

## Public Website Design

### Design Philosophy
- **Premium but restrained:** The brand communicates luxury and trust through sophisticated typography, balanced spacing, high-quality photography, and absolute consistency.
- **Trustworthy aesthetics:** The design avoids flashy or gaudy elements. It relies on a professional, clean interface to establish immediate credibility.
- **Mobile-first responsive design:** All layouts, interactions, and typography scale fluidly from small mobile screens to large desktop monitors.
- **Performance optimized:** Fast page loads are prioritized. Images are strictly optimized and lazy-loaded.
- **Accessible:** The interface adheres to WCAG AA minimum contrast ratios, ensuring legibility for all users.

### Color Palette
- **Obsidian (`#0A0A0A`):** Primary background for a deep, premium feel.
- **Graphite (`#1A1A1A`, `#2A2A2A`):** Used for section backgrounds, cards, and subtle elevation.
- **Warm Ivory (`#F5F0E8`):** Primary text color, offering high readability against dark backgrounds without the harshness of pure white.
- **Muted Champagne (`#C8B88A`):** Accent color, used sparingly for Call-to-Action (CTA) buttons, active states, and key highlights.
- **Soft White (`#E8E0D4`):** Secondary text color for metadata, subtitles, and less critical information.
- **Error Red (`#D44638`):** Indicates error states, form validation failures, and warnings.
- **Success Green (`#4A8C5C`):** Indicates success states, confirmations, and positive feedback.

### Typography
- **Headings:** Geist Sans (provided natively by Next.js), utilizing bold weights for impact and clear visual hierarchy.
- **Body:** Geist Sans, regular weight for optimal readability in long-form content.
- **Monospace:** Geist Mono, reserved exclusively for technical specifications, engine CC, prices, and tabular data.
- **Bengali Text Support:** Relies on robust system fonts with appropriate fallbacks to ensure crisp, readable Bengali characters.
- **Responsive Sizing:** Font sizes are managed using CSS `clamp()` functions to ensure fluid scaling across viewport widths without reliance on excessive media queries.

### Spacing
- **Generous whitespace:** The design leverages whitespace heavily to let content breathe and focus the user's attention on the motorcycles.
- **Consistent scaling:** Spacing adheres to a strict 4px base scale (4, 8, 12, 16, 24, 32, 48, 64, 96).
- **Section padding:** Desktop views require a minimum of 64px vertical padding between major sections to establish clear content boundaries.

### Interactive Elements
- **Clear CTAs:** "Call" and "WhatsApp" action buttons are prominently placed on every relevant page (e.g., bike detail pages) to drive immediate customer engagement.
- **Subtle transitions:** Hover states and state changes use subtle transitions (200-300ms ease) to provide premium tactile feedback without feeling sluggish.
- **No excessive animation:** Parallax effects and heavy animations are strictly prohibited to maintain performance and a serious tone.
- **Accessibility:** Clear, visible focus indicators are maintained for users navigating via keyboard.

### Content Rules
- **No fake urgency:** Tactics like "Only 2 left!" or "Hurry, offer ends soon!" are strictly forbidden.
- **No fake reviews:** Testimonials and reviews must be 100% authentic.
- **No fake statistics:** "Sold counts," viewing numbers, or inventory statistics must reflect actual database figures.
- **No fake offers:** Promotions must be genuine and accurately applied.
- **Real information only:** Trust is the core metric; deception is not tolerated in the copy or UI.

## Admin Design

### Design Philosophy
- **Built for shop owners:** The interface is tailored for non-technical users running a physical business.
- **Clarity over aesthetics:** While still clean and professional, the primary goal is undeniable clarity.
- **Plain language:** Technical database terminology is completely avoided. Forms use everyday business wording.
- **Bengali-friendly architecture:** The UI provides generous line heights and proper Unicode support to perfectly accommodate Bengali script alongside English. Right-to-Left (RTL) is not required.

### Layout
- **Sidebar navigation:** The primary navigation is a persistent sidebar, collapsing into a hamburger menu on mobile devices.
- **Touch-friendly:** Buttons and interactive elements require a minimum 44px tap target to accommodate mobile usage on the shop floor.
- **Simple forms:** Forms are single-purpose and avoid overwhelming the user.
- **Clear validation:** Error messages are written in plain, actionable language.
- **Step-by-step workflows:** Complex operations (like intaking a new bike or processing a sale) are broken down into logical, wizard-like steps.

### Financial Display Rules
- **Prominent totals:** Important financial figures are isolated and displayed with high visual prominence.
- **Clear separation of flow:** Money the shop must **RECEIVE** (from buyers) is visually distinct from money the shop must **PAY** (to sellers).
- **Color coding:** 
  - **Green:** Receivables (money coming in).
  - **Amber/Orange:** Payables (money going out).
- **Readable formatting:** Numbers are displayed using large typography with correct regional thousand separators.
- **Currency symbol:** The Bangladeshi Taka symbol (৳) is always displayed adjacent to monetary amounts for absolute clarity.

### Admin Color Palette
- **Backgrounds:** Clean white (`#FFFFFF`) or light gray (`#F9FAFB`) for maximum contrast and readability during daytime shop hours.
- **Text:** Dark slate (`#111827`) for primary readability.
- **Primary Actions:** Trustworthy Blue (`#2563EB`) for primary buttons and links.
- **Positive/Receivables:** Success Green (`#16A34A`) for money coming in and success states.
- **Warnings/Payables:** Amber/Orange (`#D97706`) for money going out and non-critical alerts.
- **Errors/Destructive:** Red (`#DC2626`) for critical errors, deletions, and destructive actions.
- **Consistency:** Status colors (e.g., Pending, Completed, Cancelled) remain identical across all modules (Inventory, Sales, Expenses).
