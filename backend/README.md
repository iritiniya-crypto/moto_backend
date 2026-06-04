# Moto Mini App Backend

Backend foundation for the Telegram Mini App. The existing Vue frontend is intentionally untouched.

## Stack

- Node.js
- NestJS
- TypeScript
- Prisma
- PostgreSQL
- Docker Compose

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

## Quality Checks

```bash
npm run test
npm run build
```

`npm run build` now runs `npm run test` first via the `prebuild` hook.
The repository pre-commit hook also runs `npm run lint && npm run test`.

API prefix: `http://localhost:3000/api`

Dev auth is enabled by default and attaches a development user to every request:

```ts
req.user = {
  id: 'dev-instructor-nikita',
  role: 'INSTRUCTOR'
}
```

## Domain Notes

- Instructors are stored as a dedicated entity with first name, last name, Telegram username, and assigned students.
- The default seeded instructor is Nikita Александров (`@Nikita_Alex_Vietnam`).
- Booking slot statuses: `available`, `requested`, `confirmed`, `completed`, `cancelled`.
- Training packages are manual records. They are not automatically calculated from training history.
- A completed training has a report and a training history record.
- Videos are currently Telegram links and belong to a specific training/report.
- `CalendarSyncEvent` is reserved for future calendar provider integrations.

## Read-Only Endpoints

```text
GET /api/students
GET /api/students/:id/profile
GET /api/instructors
GET /api/instructors/:id/profile
GET /api/skills
GET /api/booking-slots
GET /api/instructor/calendar
```

## Postman

Import the collection:

```text
postman/Moto Mini App Backend.postman_collection.json
```

The collection uses `{{baseUrl}}`, defaulting to `http://localhost:3000`.
