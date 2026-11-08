Nandi Go — static website (Vercel) with a Supabase database.

Pages
- index.html — home: full-screen destination hero with the live route map, Coffee Estate Retreat boarding pass, all trips, how booking works, about, social, contact.
- partners.html — Business Partners (District / Taluk), Premium Business Kit, onboarding steps, clickable Karnataka district map, application (opens the District or Taluk Google Form).
- admin.html — admin page (Google sign-in, only nandigo2026@gmail.com): batches, bookings, partners, email alerts, settings. Not linked from the site; robots are told not to index it.
- district-partner-agreement.html — printable District Partner Agreement (draft for review).

Files
- site.css — styles for all pages. assets/admin.css — admin page styles.
- assets/data.js — EDIT HERE: every trip (prices, text, photos, inclusions), map pins. RETREAT_BATCHES is only a fallback if the database cannot be reached.
- assets/db.js — Supabase connection for the public pages (publishable key; visitors can only create booking requests and read open batches).
- assets/booking.js — the booking card. Any button with data-book="trip-id" opens it. The request is saved in Supabase and sent on WhatsApp. Links with ?ref=PARTNER-CODE tag bookings with that partner.
- assets/admin.js — the admin page.
- assets/hero.js, assets/scenes.js, assets/about.js — home page hero, landscape scenes, about section.
- assets/map-data.js — generated map outlines. India: DataMeet (CC BY 4.0). Karnataka districts: © OpenStreetMap contributors (ODbL). The credit line in the footer must stay.
- assets/icons.js — line icons used instead of emoji.

Day-to-day (no code editing)
- Batches, bookings, partners, Google Form links and alert email settings: admin.html.
- Districts with an approved District Partner turn grey on partners.html automatically.

One-time setup (Google sign-in, Google Forms, email alerts): see D:\travels\google-form-setup.md.
Database: Supabase project "Nandi Go" (hvxzgvigrlkovehfwtob).

Deploy: upload index.html, partners.html, admin.html, district-partner-agreement.html, site.css, the logo/icon files and the assets/ folder.
Do not upload .env.local, .vercel or addition/.

After editing site.css or any assets/* file, raise the ?v= number on its <link>/<script> tag in index.html, partners.html and admin.html so visitors get the new copy.
