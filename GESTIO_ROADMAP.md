# Gestio - Product Roadmap & Business Strategy

This document outlines the strategy for transitioning **Gestio** from a single-user local tool to a "Local-First, Sync-Optional" professional business service.

---

## 🎯 The Vision
Transform Gestio into the go-to solution for small businesses that offer direct installments, moving them from "Excel Hell" to automated collections.

### Core Value Proposition
*   **Stop the Leaks:** No more forgotten payments or lost notes.
*   **Professionalism:** High-end aesthetics that build trust with customers (e.g., PDF receipts).
*   **Speed:** Faster than any spreadsheet.

---

## 💰 Business Model: Freemium SaaS (The "Obsidian" Style)

### **Tier 1: Free (Local Solo)**
*   **Storage:** Local SQLite database on the user's computer.
*   **Limit:** Up to 20 active customers.
*   **Target:** Small shops or those just starting.
*   **Why:** Builds trust. Zero friction to download and start using.

### **Tier 2: Pro (Cloud Sync & Mobile)**
*   **Price:** $15 - $25 USD / month.
*   **Features:**
    *   **Cloud Sync:** Real-time backup and multi-device access.
    *   **Mobile App:** View dashboard and collect payments on the go.
    *   **Unlimited Customers:** No restriction on business size.
    *   **WhatsApp Automation:** (Future) Automated reminders for overdue installments.

---

## 🛠️ Technical Roadmap

### **Phase 1: Foundation (Current)**
- [x] Premium Desktop UI (Glassmorphism/Dark Mode).
- [x] Local SQLite Architecture.
- [ ] **Next:** Refine "Ajustes" page to display Plan Tiers.
- [ ] **Next:** Add "Customer Limit" check in the creation flow.

### **Phase 2: Identity & Updates**
- [ ] **Auth (Supabase):** Implement a simple Login/Register flow.
- [ ] **Offline Auth:** Cache the Supabase session and a "Tier Flag" locally.
- [ ] **Auto-Updates:** Restore `electron-updater` to push fixes and new features automatically via GitHub Releases.

### **Phase 3: The Sync Engine**
- [ ] **Supabase Realtime:** Implement logic to sync local SQLite changes to the cloud.
- [ ] **License Leap:** Implement a 15-30 day "Offline Lease" to verify Pro status.

---

## 📈 Distribution Strategy

### 1. The "Manual 10" (Validation)
*   Visit local shops that offer credit.
*   Offer them a 1-month "Concierge Onboarding" (you set it up for them).
*   Goal: Learn what they hate about their current process.

### 2. High-Performance Landing Page
*   **Platform:** Framer (Current).
*   **CTA:** Big "Download Free" button (no credit card required).
*   **Video:** 30-second "Power Demo" showing the Installment Dashboard.

### 3. Lead Magnets
*   Ask for an email before the download to build an "Interest List" for the mobile app launch.

---

## 🗂️ Mind Map: The "Pro" Upgrade Loop
1. **Discovery:** User finds site through ads or local word-of-mouth.
2. **Action:** Downloads `.exe` for free.
3. **Value:** Migrates from Excel to Gestio (Aha! moment).
4. **Trigger:** Hits the 20-customer limit or wants to check data on their phone.
5. **Conversion:** Clicks "Upgrade" → Stripe/LemonSqueezy → Logs in.
6. **Retention:** Data is now safe in the cloud and available on mobile.

---
*Created on: 2025-12-25*
*Status: Strategy & Planning Phase*
