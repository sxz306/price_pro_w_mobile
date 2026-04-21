# Price Pro

A full-stack pricing tool for sales reps built with Express + React + PostgreSQL.

## Architecture
- **Backend**: Express (TypeScript), Drizzle ORM, PostgreSQL
- **Frontend**: React, TanStack Query, shadcn/ui, Tailwind CSS, wouter routing
- **Dev server**: `npm run dev` — starts Express + Vite on port 5000

## Key Features
- Product catalog with unit costs and categories
- Customer database with email, size, region
- Quote creation with line items, per-item pricing sliders, and win-rate analysis
- Cost/margin breakdowns (gross profit % = (quotedPrice - totalCost) / totalCost × 100)
- Gmail integration for sending quotes to customers via email
- Communication history tracking per quote (outbound sends, inbound reply syncing)

## Data Model (shared/schema.ts)
- `customers` — id, name, size, region, email
- `products` — id, name, description, basePrice, cost, category
- `quotes` — id, customerId, customerName, customerEmail, status, createdAt, totalAmount
- `quoteItems` — id, quoteId, productId, quantity, unitPrice, priceMultiplier
- `communications` — id, quoteId, direction, senderEmail, recipientEmail, subject, body, gmailMessageId, gmailThreadId, sentAt

## API Routes (shared/routes.ts, server/routes.ts)
- CRUD for customers, products, quotes, quote items
- `POST /api/quotes/:quoteId/send` — sends quote via Gmail, creates communication record, auto-sets status to 'sent'
- `GET /api/quotes/:quoteId/communications` — list communication history
- `POST /api/quotes/:quoteId/sync-replies` — syncs Gmail thread replies into communications table

## Gmail Integration
- Uses Replit connector for Google Mail OAuth
- `server/gmail.ts` — helper functions for Gmail API (send, get thread replies, get sender email)
- Connection: `google-mail` connector via `REPLIT_CONNECTORS_HOSTNAME`

## Win Rate Formula
- `95 * exp(-2.5 * (multiplier - 0.7))`, clamped 2–98%
- Slider range: 70%–200% per item
- priceMultiplier persisted in `quote_items` table

## Frontend Structure
- `client/src/pages/` — QuoteDetails, Quotes, Customers, Products
- `client/src/hooks/` — use-quotes, use-quote-items, use-products, use-customers, use-communications
- `client/src/components/` — Layout, ui/ (shadcn components)

## Environment
- Login email: rep@pricepro.com
- Database: PostgreSQL via DATABASE_URL
- Secrets: SESSION_SECRET
- Gmail: google-mail integration (installed)
