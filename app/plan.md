# PROJECT: Open Backstage (CYT Fredericksburg)

## 1. CORE MISSION
Build a localized, self-hosted operational dashboard to bypass the limitations of the legacy National website.
**Goal:** Relieve staff burnout, ensure data safety, and create a mobile-friendly "Home Hub" for operations.

## 2. THE TECH STACK
- **Backend:** Self-Hosted Baserow (Docker).
- **Frontend:** React / Next.js (Mobile-first).
- **Payment:** Payment Agnostic. We use external links (Zeffy/Square). We do NOT process credit cards in-app.
- **Hosting:** DigitalOcean (Coolify/Portainer).

## 3. POLITICAL & COMPLIANCE CONSTRAINTS (Non-Negotiable)
1.  **The "National" Wall:** We cannot integrate with the National Website via API. The legacy system is fragile and unmaintained.
2.  **The "CSV" Rule:** We must eventually export data to CSV to satisfy National's royalty/insurance requirements. The National DB is the "Legal Source of Truth." Open Backstage is the "Operational Source of Truth."
3.  **The "Zeffy" Protocol:** We use Zeffy for payments to save fees. We must explicitly warn parents about the "Optional Tip" model.
4.  **No "Shadow" Accounts:** We do not create "new" accounts. We map to the existing National ID (manually if needed) to prevent data fragmentation.

## 4. BRANDING
- **Name:** Open Backstage
- **Metaphor:** "Front of House" is the National Site (Public/Tickets). "Backstage" is our tool (Staff/Operations).
- **Domain:** open-backstage.org

## 5. CURRENT STATUS (Jan 2026)
- **Phase:** Spring Pilot.
- **Scope:** Casting, Class Registration, Payment Tracking, Rosters.
- **Not in Scope:** Automated Emails, Costume Inventory (Push to Summer).
