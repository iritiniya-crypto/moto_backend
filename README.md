# Moto Mini App Backend

NestJS backend for the Moto Telegram Mini App. The Vue frontend is a separate project and is intentionally not changed from this backend workspace.

## Stack

- Node.js, NestJS, TypeScript
- Prisma ORM
- PostgreSQL
- Docker Compose
- `class-validator` / `class-transformer`

## Local Start

```bash
cd backend
cp .env.example .env
npm install
npm run db:up
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

Default API prefix:

```text
http://localhost:3000/api
```

PostgreSQL is exposed on host port `5433`, while `.env.example` currently points to `localhost:5432`. Keep the local `DATABASE_URL` aligned with how PostgreSQL is actually exposed in your environment before running migrations.

## Scripts

```bash
npm run db:up
npm run db:down
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
npm run test
npm run build
npm run lint
```

`npm run build` runs tests first through the `prebuild` hook. The pre-commit hook runs `npm run lint && npm run test`.

## Runtime Basics

- Global API prefix is `/api`.
- CORS is enabled.
- `ValidationPipe` uses `whitelist: true`, `forbidNonWhitelisted: true`, and `transform: true`.
- Production auth is not implemented yet.
- `DevAuthMiddleware` runs for all routes and attaches a development user to `req.user`.

```ts
req.user = {
  id: 'dev-instructor-nikita',
  role: 'INSTRUCTOR'
}
```

## Current Modules

```text
src/
  auth/                 dev auth middleware
  booking/              booking slots, request, confirm, reschedule, cancel
  calendar/             internal instructor calendar
  config/               env schema
  instructors/          dedicated Instructor entity endpoints
  notifications/        notification hook stubs
  prisma/               PrismaModule and PrismaService
  reports/              training report transaction
  skills/               skill catalog
  students/             students, packages, skills, manual history
  training-history/     module boundary for history domain
  users/                users module
  videos/               videos linked to training history
```

## Domain Rules

- The seeded instructor is Nikita Александров, Telegram username `Nikita_Alex_Vietnam`.
- Instructors are a dedicated `Instructor` entity and students reference `instructorId`.
- Booking slot statuses are `available`, `requested`, `reschedule`, `confirmed`, `completed`, `cancelled`.
- `requested` means a student requested an available slot.
- `reschedule` means an already confirmed training was moved and awaits Nikita's confirmation.
- `confirmed` means Nikita confirmed the requested or rescheduled training.
- `completed` means a report was saved and training history was created.
- Student cancel returns the same slot to `available` and clears student/request/reschedule fields.
- Training packages are fully manual. They are not calculated from training history.
- Videos are Telegram links tied to a specific `TrainingHistory`.
- `CalendarSyncEvent` is reserved for future Google Calendar or other provider integrations.

## Reschedule Behavior

Current backend behavior is same-slot reschedule:

1. A `confirmed` booking slot is updated by `POST /api/booking-slots/:slotId/reschedule`.
2. The same `slotId` becomes `reschedule`.
3. New time is stored in `startsAt` / `endsAt`.
4. Old confirmed time is stored in `previousStartsAt` / `previousDurationMinutes`.
5. `POST /api/booking-slots/:slotId/confirm` returns it to `confirmed`.

For compatibility with the calendar, reschedule confirmation also frees the previous time if no separate slot already exists for that old time. The frontend should still treat the rescheduled training itself as the same booking slot.

## Main Endpoints

```text
GET    /api/health
GET    /api/students
POST   /api/students
GET    /api/students/:id/profile
PATCH  /api/students/:studentId
GET    /api/students/:studentId/package
PUT    /api/students/:studentId/package
GET    /api/students/:studentId/skills
PUT    /api/students/:studentId/skills
POST   /api/students/:studentId/training-history/manual

GET    /api/instructors
GET    /api/instructors/:id/profile
GET    /api/skills

GET    /api/booking-slots
POST   /api/booking-slots
PATCH  /api/booking-slots/:slotId
DELETE /api/booking-slots/:slotId
POST   /api/booking-slots/:slotId/request
POST   /api/booking-slots/:slotId/reschedule
POST   /api/booking-slots/:slotId/confirm
POST   /api/booking-slots/:slotId/decline
POST   /api/booking-slots/:slotId/cancel

GET    /api/instructor/calendar
POST   /api/training-reports
POST   /api/training-history/:historyId/videos
```

Full request/response documentation is in `API.md`. Frontend integration notes are in `FRONTEND_INTEGRATION.md`.

## Prisma

Main schema file:

```text
prisma/schema.prisma
```

Current migration history includes:

```text
20260601000000_initial_foundation
20260602000000_write_endpoints_foundation
20260602010000_add_reschedule_booking_slot_status
20260603000000_add_previous_reschedule_fields
20260603010000_reschedule_target_slot_flow
20260603020000_revert_reschedule_target_slot_flow
20260604000000_add_instructor_entity
```

The `reschedule_target_slot_flow` migration is historical and is followed by a revert migration. Current schema does not use a `rescheduleSourceSlotId` field.

## Seed Data

`prisma/seed.ts` creates:

- Nikita instructor/user.
- Seed skills: Овал, Восьмерка, Змейка, Торможение, Развороты, Медленная езда, Взгляд, Город.
- Sample students Алексей and Мария.
- Manual training packages.
- Available, requested, confirmed, completed slots.
- A completed report, history record, and Telegram video link.

## Postman / Newman

Collections:

```text
postman/Moto Mini App Backend.postman_collection.json
postman/Moto Mini App Backend Write.postman_collection.json
postman/Moto Mini App Backend Cancel.postman_collection.json
```

Example:

```bash
npx newman run "postman/Moto Mini App Backend Write.postman_collection.json" --env-var baseUrl=http://127.0.0.1:3000
```
