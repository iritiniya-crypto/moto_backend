# Moto Mini App Frontend Integration Guide

Этот документ фиксирует текущий backend contract для постепенного перевода Vue frontend с mock/store на API. Frontend живет отдельно и из этого backend task не меняется.

## Source Of Truth

- Подробный API contract: `API.md`.
- Быстрая карта backend проекта: `README.md`.
- Вспомогательные frontend-типы: `FRONTEND_TYPES.ts`.
- Base URL локально: `http://localhost:3000/api`.

Backend работает с global prefix `/api`, CORS включен, dev auth включен. Telegram auth пока не реализован.

## Current Backend Shape

```text
src/
  auth/
  booking/
  calendar/
  config/
  instructors/
  notifications/
  prisma/
  reports/
  skills/
  students/
  training-history/
  users/
  videos/
```

Основные доменные сущности:

- `Instructor`: Никита и его ученики.
- `Student`: профиль ученика, уровень, фокус, план, инструктор.
- `BookingSlot`: календарный слот и запись.
- `TrainingReport`: отчет после confirmed-тренировки.
- `TrainingHistory`: история проведенных тренировок.
- `TrainingVideo`: Telegram video links для конкретной тренировки.
- `Skill` / `StudentSkill`: справочник навыков и проценты ученика.
- `TrainingPackage`: ручной пакет тренировок.

## Important Statuses

```ts
type BookingSlotStatus =
  | 'available'
  | 'requested'
  | 'reschedule'
  | 'confirmed'
  | 'completed'
  | 'cancelled';
```

Frontend buckets for Nikita:

```ts
const newRequests = slots.filter((slot) => slot.status === 'requested');
const rescheduleRequests = slots.filter((slot) => slot.status === 'reschedule');
const todayTrainings = slots.filter((slot) =>
  ['requested', 'reschedule', 'confirmed'].includes(slot.status) &&
  isToday(new Date(slot.startsAt))
);
```

Keep these buckets as the current expected behavior:

- Новые запросы: `requested`.
- Запросы на перенос: `reschedule`.
- Сегодня: `requested + reschedule + confirmed` на текущую дату.
- Свободные слоты для записи: `available`.
- Проведенные тренировки: `completed`.

## Booking Slots

### Read Slots

```http
GET /api/booking-slots
GET /api/booking-slots?status=available
GET /api/booking-slots?studentId=<studentId>
GET /api/booking-slots?studentId=<studentId>&status=confirmed
```

`studentId` filter behavior:

```sql
(studentId = :studentId) OR (status = 'available')
```

When `status` is also passed, backend applies both conditions:

```sql
((studentId = :studentId) OR (status = 'available')) AND (status = :status)
```

Practical result:

- `?studentId=<id>` returns student's own slots plus available slots.
- `?studentId=<id>&status=available` returns available slots.
- `?studentId=<id>&status=confirmed` returns confirmed slots for that student.

### Request Flow

```text
available
  POST /api/booking-slots/:slotId/request
requested
  POST /api/booking-slots/:slotId/confirm
confirmed
  POST /api/training-reports
completed
```

Request:

```ts
await api.post(`/booking-slots/${slotId}/request`, {
  studentId,
  preference: 'утро',
  studentComment: 'Хочу повторить базу'
});
```

Confirm:

```ts
await api.post(`/booking-slots/${slotId}/confirm`, {
  finalLocation: 'Учебная площадка',
  finalLocationUrl: 'https://maps.example.com/track',
  instructorComment: 'Берем конусы'
});
```

### Reschedule Flow

Current backend uses same-slot reschedule.

```text
confirmed
  POST /api/booking-slots/:slotId/reschedule
reschedule
  POST /api/booking-slots/:slotId/confirm
confirmed
```

`POST /reschedule` updates the same `slotId`:

- new time goes to `startsAt` / `endsAt`;
- old confirmed time goes to `previousStartsAt` / `previousDurationMinutes`;
- status becomes `reschedule`.

Example:

```ts
await api.post(`/booking-slots/${slotId}/reschedule`, {
  startsAt: '2026-05-18T06:00:00.000Z',
  durationMinutes: 90,
  instructorComment: 'Переносим из-за погоды'
});
```

Frontend can show persisted "Было / Стало" after reload:

```ts
const previous = slot.previousStartsAt;
const previousDuration = slot.previousDurationMinutes;
const next = slot.startsAt;
```

Important backend detail: confirming `reschedule` keeps the training on the same `slotId`. During confirmation, backend also frees the previous time if there is no separate available slot for it yet. Frontend should still render the rescheduled training itself from the same booking slot.

### Student Cancel Flow

```http
POST /api/booking-slots/:slotId/cancel
```

Allowed source statuses:

- `requested`
- `reschedule`
- `confirmed`

Rejected source statuses:

- `available`
- `completed`
- `cancelled`

Optional body:

```json
{
  "reason": "не получается приехать"
}
```

After cancel backend reuses the same slot and clears booking fields:

- `status = available`
- `studentId = null`
- `requestedById = null`
- `requestedAt = null`
- `confirmedAt = null`
- `preference = null`
- `studentComment = null`
- `finalLocation = null`
- `finalLocationUrl = null`
- `instructorComment = null`
- `previousStartsAt = null`
- `previousDurationMinutes = null`

The slot appears again in:

```http
GET /api/booking-slots?status=available
```

Cancel also calls `NotificationsService.notifyInstructorTrainingCancelled(payload)`. Current implementation is a stub/log; Telegram Bot API can be connected there later without changing frontend calls.

## Students

```http
GET   /api/students
POST  /api/students
GET   /api/students/:id/profile
PATCH /api/students/:studentId
```

Create student:

```ts
await api.post('/students', {
  name: 'Иван',
  telegramUsername: 'ivan_moto',
  level: 'BEGINNER',
  focus: 'Овал',
  nextTrainingPlan: 'Площадка и торможение'
});
```

Backend creates linked `User` and assigns the default instructor when `instructorId` is not provided. The student appears in Nikita's profile even before any training.

## Instructors

```http
GET /api/instructors
GET /api/instructors/:id/profile
```

Use these endpoints when frontend needs Nikita's student list from the backend rather than local store/mock data.

Seeded default instructor:

```text
Никита Александров
@Nikita_Alex_Vietnam
```

## Packages

```http
GET /api/students/:studentId/package
PUT /api/students/:studentId/package
```

Packages are manual and are not recalculated from training history.

```ts
await api.put(`/students/${studentId}/package`, {
  totalTrainings: 3,
  completedTrainings: 0,
  paymentStatus: 'paid',
  startedAt: '2026-06-19T09:00:00.000Z',
  endedAt: null,
  isActive: true
});
```

Current API-to-Prisma mapping:

| API field | Prisma field |
| --- | --- |
| `totalTrainings` | `TrainingPackage.totalSessions` |
| `completedTrainings` | `TrainingPackage.usedSessions` |
| `startedAt` | `TrainingPackage.purchasedAt` |
| `endedAt` | `TrainingPackage.expiresAt` |
| `isActive` | `TrainingPackage.status === active` |

## Skills

```http
GET /api/skills
GET /api/students/:studentId/skills
PUT /api/students/:studentId/skills
```

Update student skills:

```ts
await api.put(`/students/${studentId}/skills`, [
  {
    skillId: 'skill-uuid',
    progressPercent: 80
  }
]);
```

Validation:

- `progressPercent` is integer `0-100`.
- Duplicate `skillId` values are rejected.
- Missing `StudentSkill` rows are created, existing rows are updated.

## Reports, History, Videos

Create report after a confirmed training:

```http
POST /api/training-reports
```

```ts
await api.post('/training-reports', {
  slotId,
  studentId,
  trainedSkills: ['Овал', 'Торможение'],
  improved: 'Стал плавнее держать траекторию',
  nextFocus: 'Добавить взгляд в выход',
  levelUpdate: 'INTERMEDIATE'
});
```

Backend transaction:

1. Checks slot exists.
2. Checks `slot.status = confirmed`.
3. Checks student exists.
4. Creates `TrainingReport`.
5. Creates `TrainingHistory`.
6. Updates slot to `completed`.
7. Updates student level when `levelUpdate` is provided.

Manual history without booking slot:

```http
POST /api/students/:studentId/training-history/manual
```

Add Telegram video to training history:

```http
POST /api/training-history/:historyId/videos
```

```ts
await api.post(`/training-history/${historyId}/videos`, {
  title: 'Овал после корректировки',
  telegramUrl: 'https://t.me/example_video/1',
  comment: 'видно прогресс'
});
```

## Validation And Errors

Global validation strips unknown fields and rejects non-whitelisted DTO fields.

Common statuses:

| Status | Meaning |
| --- | --- |
| `400` | invalid DTO, invalid range, package completed count greater than total |
| `404` | student, instructor, slot, skill, history not found |
| `409` | invalid slot status transition, duplicate telegram username, wrong student for slot |

Error shape:

```json
{
  "message": "Only requested or reschedule slots can be confirmed",
  "error": "Conflict",
  "statusCode": 409
}
```

## Postman Collections

```text
postman/Moto Mini App Backend.postman_collection.json
postman/Moto Mini App Backend Write.postman_collection.json
postman/Moto Mini App Backend Cancel.postman_collection.json
```

Example:

```bash
npx newman run "postman/Moto Mini App Backend Write.postman_collection.json" --env-var baseUrl=http://127.0.0.1:3000
```
