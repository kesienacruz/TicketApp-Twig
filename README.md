# 🎟 TicketApp — Multi-Framework Frontend

This repo contains the same Ticket Management UI implemented in **React**, **Vue 3**, and a **Twig-style static app**.

## Directories

- ./react-ticketapp  
  React + Tailwind starter with responsive navbar, hero (wave + overlapping circle), shared decorative circles.

- ./vue-ticketapp  
  Vue 3 + Tailwind starter with the same responsive layout and assets.

- ./twig-ticketapp  
  Production-ready static HTML/CSS/JS:
  - localStorage auth (ticketapp_session)
  - guarded routes via hash (#/dashboard, #/tickets)
  - CRUD tickets (create / edit / delete) with validation
  - accessible delete modal + toasts
  - responsive navbar with hamburger
  - decorative circles + hero wave

- ./assets  
  Global SVG assets reused by all implementations:
  - hero-wave.svg (wavy hero background)
  - decor-circle.svg (overlapping hero accent)
  - bg-circle.svg (site-wide blurred circle accents)

## Shared Visual Rules

- Max content width 1440px (`.page-shell`)
- Wave hero + decorative circles (at least two circles per site)
- Card UI: rounded corners, soft shadow
- Status badges:
  - open → green
  - in_progress → amber
  - closed → gray
- Accessible focus states, aria-live toasts, ESC-to-close modal
- Mobile-first:
  - Navbar collapses to hamburger under 768px
  - Stacked vertical layout on small screens

## Test Credentials (Twig app)
Email: `test@ticketapp.test`  
Password: `password123`

Open `twig-ticketapp/index.html` directly in your browser to use the full app.
