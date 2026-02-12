# LOOP — Inter-department Communication & Request Management Platform

A production-ready internal web platform for clothing manufacturing companies to manage structured inter-department requests ("tickets") with dynamic form schemas, SLA tracking, real-time updates, and role-based access control.

---

## Architecture Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Backend    │────▶│  PostgreSQL  │
│  Next.js 14  │     │   NestJS     │     │   + Prisma   │
│  Port: 3000  │◀────│  Port: 4000  │     │  Port: 5432  │
└──────────────┘     └──────┬───────┘     └──────────────┘
     WebSocket ◀────────────┘ Socket.IO
                              │
                       ┌──────┴───────┐
                       │    Redis     │
                       │  Port: 6379  │
                       └──────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TailwindCSS, Zustand |
| Backend | NestJS, Express, Prisma ORM, Socket.IO |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | JWT + Refresh Tokens, bcrypt |
| Infra | Docker, docker-compose |

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)

### Option 1: Docker (Production)
```bash
docker compose up --build
```

### Option 2: Local Development
```bash
# 1. Start databases
docker compose up -d postgres redis

# 2. Setup backend
cd backend
cp .env .env.local  # Edit if needed
npm install
npx prisma generate
npx prisma db push
npx ts-node prisma/seed.ts
npm run start:dev

# 3. Setup frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Option 3: Automated
```bash
chmod +x setup.sh && ./setup.sh
```

## Default Login

| Role | Email | Password |
|------|-------|----------|
| **Global Admin** | `admin@loop.local` | `Admin123!` |
| Sales Head | `joao.sales@loop.local` | `User123!` |
| Design Head | `ana.design@loop.local` | `User123!` |
| DAF Head | `sofia.daf@loop.local` | `User123!` |

## URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:4000/api |
| Swagger Docs | http://localhost:4000/api/docs |

---

## Features

### Core Ticket System
- Structured tickets with ID format `LOOP-000001`
- 6-status workflow: Open → In Progress → Waiting Reply → Approved → Rejected → Closed
- 4 priority levels with visual indicators
- Inter-department routing (From Dept → To Dept)
- Threaded conversations with @mentions
- File attachments with image preview
- Internal notes (visible only to target department)
- Ticket watchers (follow updates)
- Ticket duplication
- Full audit trail / history log

### Dynamic Form Schema Engine
- Form schemas stored as JSON in database
- Request Category → Subtype → Form Schema hierarchy
- 15 supported field types (text, select, date, file upload, etc.)
- Conditional field visibility (e.g., show client field only if entity_type = Client)
- Admin can create/edit form schemas via Form Builder UI
- Form submissions stored as JSON linked to tickets

### Pre-configured Request Types

**Design Department:**
- Artwork, 3D Models, Fabrics, Boards, Marketing, Showroom

**DAF (Finance):**
- Credit Note, Transport Guide, Remittance Guide, Create Client, Payments, Proforma Invoice

**Information:**
- Missing Info, General Info, Information Divergence, Price Calculation Sheet

### Operational Actions
- Ticket subtypes can define custom actions (Approve, Reject, Complete, Request Correction)
- Actions change ticket status and create audit entries

### SLA System
- Per-subtype SLA configuration (response + resolution hours)
- Color-coded SLA indicators (Green/Yellow/Red)
- SLA timer pauses during "Waiting Reply" status
- Overdue detection and highlighting

### Role-Based Access Control
- **Global Admin**: Full system access
- **Department Head**: Department-wide visibility + management
- **Department User**: Own tickets + department tickets only

### Real-time Updates
- Socket.IO integration for live notifications
- Ticket room subscriptions
- Instant message delivery

### Analytics & Export
- Tickets by department, status, priority
- Monthly ticket volume
- Overdue rate tracking
- CSV export

### Notification System
- In-app notifications with unread counter
- Per-user notification preferences
- Triggers: ticket created, assigned, replied, status changed, mentioned, overdue

---

## API Endpoints

### Auth
```
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/password-reset/request
POST /api/auth/password-reset
```

### Tickets
```
GET    /api/tickets
GET    /api/tickets/dashboard
GET    /api/tickets/:id
POST   /api/tickets
PATCH  /api/tickets/:id
POST   /api/tickets/:id/messages
PATCH  /api/tickets/messages/:id
DELETE /api/tickets/messages/:id
POST   /api/tickets/:id/notes
POST   /api/tickets/:id/watchers
DELETE /api/tickets/:id/watchers/:userId
POST   /api/tickets/:id/duplicate
POST   /api/tickets/:id/actions/:action
```

### Users, Departments, Forms, Analytics, Audit, Settings, Search, Files
See Swagger documentation at `/api/docs`

---

## Project Structure

```
loop/
├── docker-compose.yml
├── setup.sh
├── backend/
│   ├── Dockerfile
│   ├── prisma/
│   │   ├── schema.prisma          # Complete database schema
│   │   └── seed.ts                # Seed data with departments, users, forms
│   └── src/
│       ├── main.ts                # NestJS bootstrap
│       ├── app.module.ts          # Root module
│       ├── prisma/                # Prisma service (global)
│       ├── common/                # Guards, filters, decorators, interceptors
│       └── modules/
│           ├── auth/              # JWT auth + refresh tokens
│           ├── users/             # User CRUD (admin only)
│           ├── departments/       # Department management
│           ├── tickets/           # Core ticket system
│           ├── notifications/     # In-app + email notifications
│           ├── forms/             # Form schema engine
│           ├── analytics/         # Reporting + export
│           ├── audit/             # Audit log
│           ├── settings/          # System settings
│           ├── files/             # File upload/download
│           ├── search/            # Global search
│           └── gateway/           # Socket.IO gateway
└── frontend/
    ├── Dockerfile
    └── src/
        ├── app/
        │   ├── auth/page.tsx            # Login
        │   └── dashboard/
        │       ├── layout.tsx           # Sidebar + top bar
        │       ├── page.tsx             # Dashboard home
        │       ├── tickets/page.tsx     # Ticket list + create
        │       ├── tickets/[id]/page.tsx # Ticket detail
        │       ├── users/page.tsx       # User management
        │       ├── departments/page.tsx # Department overview
        │       ├── analytics/page.tsx   # Charts + export
        │       ├── settings/page.tsx    # System settings
        │       ├── forms/page.tsx       # Form builder
        │       ├── audit/page.tsx       # Audit log
        │       └── notifications/page.tsx
        ├── lib/api.ts                   # API client with token refresh
        ├── stores/
        │   ├── auth.ts                  # Auth state (Zustand)
        │   └── notifications.ts         # Notification state
        └── types/
```

## Database Schema

The system uses **32 tables** covering:
- Users, departments, roles
- Tickets with full history tracking
- Messages with mentions and attachments
- Form schemas and submissions (JSON)
- Notifications with preferences and policies
- Audit logs
- System settings
- Saved views

## Environment Variables

See `backend/.env` for all configuration options.

## License

Proprietary - Internal Company Use
