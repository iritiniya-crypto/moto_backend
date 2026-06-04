# Moto Mini App Backend API

Документация актуальна после Backend Pass №4: read/write endpoints, DTO validation, Prisma migration и Postman/Newman smoke-сценарий.

## Base URL

```text
http://localhost:3000/api
```

Если порт `3000` занят, можно запустить backend на другом порту:

```bash
PORT=3002 npm run start:dev
```

## Auth

Production auth пока не реализован. В dev-режиме работает `DevAuthMiddleware`, который добавляет пользователя в `req.user`.

```json
{
  "id": "dev-instructor-nikita",
  "role": "INSTRUCTOR"
}
```

## Validation

DTO используют `class-validator` и `class-transformer`.

Глобальный `ValidationPipe` настроен с:

- `whitelist: true`
- `forbidNonWhitelisted: true`
- `transform: true`

Типовые проверки:

- UUID path/body ids.
- ISO date strings.
- enum values.
- string fields.
- integer ranges.
- skill progress `0-100`.

## Errors

Используются стандартные NestJS exceptions:

- `400 BadRequestException`: невалидный DTO, неверный диапазон, `completedTrainings > totalTrainings`, дубли `skillId`.
- `404 NotFoundException`: не найден ученик, слот, навык, история, инструктор.
- `409 ConflictException`: неверный переход статуса, duplicate `telegramUsername`, слот принадлежит другому ученику, cancel для неподходящего статуса.

Пример ошибки:

```json
{
  "message": "Student student-id was not found",
  "error": "Not Found",
  "statusCode": 404
}
```

## Domain Enums

### StudentLevel

```text
BEGINNER
BASIC
INTERMEDIATE
ADVANCED
```

### BookingSlotStatus

```text
available
requested
reschedule
confirmed
completed
cancelled
```

### TrainingPackagePaymentStatus

```text
unpaid
paid
partial
```

### TrainingPackageStatus

```text
active
completed
cancelled
```

## Health

### GET /health

Проверка, что backend отвечает.

Request body: отсутствует.

Response `200`:

```json
{
  "status": "ok",
  "service": "moto-mini-app-backend"
}
```

## Students

### GET /students

Возвращает всех учеников с user, instructor, manual packages и skills.

Request body: отсутствует.

Response `200`:

```json
[
  {
    "id": "student-id",
    "userId": "user-id",
    "name": "Алексей",
    "telegramUsername": "alex_moto",
    "level": "BASIC",
    "focus": "Восьмерка",
    "nextTrainingPlan": "Медленная езда",
    "notes": null,
    "createdAt": "2026-06-01T15:07:44.000Z",
    "updatedAt": "2026-06-02T06:00:00.000Z",
    "user": {
      "id": "user-id",
      "telegramId": null,
      "telegramUsername": "alex_moto",
      "displayName": "Алексей",
      "role": "STUDENT"
    },
    "instructor": {
      "id": "instructor-id",
      "firstName": "Никита",
      "lastName": "Александров",
      "telegramUsername": "Nikita_Alex_Vietnam",
      "userId": "user-id",
      "createdAt": "2026-06-01T15:00:00.000Z",
      "updatedAt": "2026-06-01T15:00:00.000Z"
    },
    "packages": [],
    "skills": []
  }
]
```

Notes:

- Ученики сортируются по `createdAt ASC`.
- Пакеты сортируются по `createdAt DESC`.
- Пакеты полностью ручные и не пересчитываются из истории тренировок.

### POST /students

Создает ученика вручную. Backend также создает связанного `User` с ролью `STUDENT` и назначает дефолтного инструктора, поэтому ученик появляется в списке/профиле Никиты даже без тренировок.

DTO: `CreateStudentDto`.

Request:

```json
{
  "name": "Иван",
  "telegramUsername": "ivan_moto",
  "level": "BEGINNER",
  "focus": "Овал",
  "nextTrainingPlan": "Площадка и торможение"
}
```

Response `201`:

```json
{
  "id": "student-id",
  "userId": "user-id",
  "name": "Иван",
  "telegramUsername": "ivan_moto",
  "level": "BEGINNER",
  "focus": "Овал",
  "nextTrainingPlan": "Площадка и торможение",
  "notes": null,
  "user": {
    "id": "user-id",
    "telegramId": null,
    "telegramUsername": "ivan_moto",
    "displayName": "Иван",
    "role": "STUDENT"
  },
  "instructor": {
    "id": "instructor-id",
    "firstName": "Никита",
    "lastName": "Александров",
    "telegramUsername": "Nikita_Alex_Vietnam",
    "userId": "user-id",
    "createdAt": "2026-06-01T15:00:00.000Z",
    "updatedAt": "2026-06-01T15:00:00.000Z"
  },
  "packages": [],
  "skills": []
}
```

Prisma transaction:

- create `User`
- create `Student`

### GET /students/:id/profile

Возвращает полный профиль ученика: user, packages, skills, training history, reports, booking slots, videos.

Path params:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | UUID | yes | Student id. |

Request body: отсутствует.

Response `200`:

```json
{
  "id": "student-id",
  "userId": "user-id",
  "name": "Иван",
  "telegramUsername": "ivan_moto",
  "level": "INTERMEDIATE",
  "focus": "Восьмерка",
  "nextTrainingPlan": "Медленная езда",
  "notes": null,
  "user": {
    "id": "user-id",
    "telegramId": null,
    "telegramUsername": "ivan_moto",
    "displayName": "Иван",
    "role": "STUDENT"
  },
  "instructor": {
    "id": "instructor-id",
    "firstName": "Никита",
    "lastName": "Александров",
    "telegramUsername": "Nikita_Alex_Vietnam",
    "userId": "user-id",
    "createdAt": "2026-06-01T15:00:00.000Z",
    "updatedAt": "2026-06-01T15:00:00.000Z"
  },
  "packages": [],
  "skills": [],
  "trainingHistory": [
    {
      "id": "history-id",
      "studentId": "student-id",
      "bookingSlotId": "slot-id",
      "reportId": "report-id",
      "trainedAt": "2026-06-10T10:00:00.000Z",
      "summary": "Стал плавнее держать траекторию",
      "report": {
        "id": "report-id",
        "trainedOn": "Овал, Торможение",
        "successes": "Стал плавнее держать траекторию",
        "focusNext": "Добавить взгляд в выход",
        "levelChange": "INTERMEDIATE"
      },
      "videos": [],
      "bookingSlot": {
        "id": "slot-id",
        "status": "completed"
      }
    }
  ],
  "videos": []
}
```

### PATCH /students/:studentId

Редактирует ученика и синхронизирует связанные поля `User`.

DTO: `UpdateStudentDto`.

Path params:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `studentId` | UUID | yes | Student id. |

Request:

```json
{
  "name": "Иван Петров",
  "telegramUsername": "ivan_petrov",
  "level": "BASIC",
  "focus": "Восьмерка",
  "nextTrainingPlan": "Медленная езда"
}
```

Response `200`: обновленный student с `user`, `instructor`, `packages`, `skills`.

Prisma transaction:

- update `User`
- update `Student`

## Packages

### GET /students/:studentId/package

Возвращает последний активный ручной пакет ученика или `null`.

Path params:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `studentId` | UUID | yes | Student id. |

Response `200`:

```json
{
  "id": "package-id",
  "studentId": "student-id",
  "totalTrainings": 5,
  "completedTrainings": 1,
  "paymentStatus": "paid",
  "startedAt": "2026-06-02T06:00:00.000Z",
  "endedAt": "2026-07-02T06:00:00.000Z",
  "isActive": true,
  "createdAt": "2026-06-02T06:00:00.000Z",
  "updatedAt": "2026-06-02T06:00:00.000Z"
}
```

### PUT /students/:studentId/package

Создает или обновляет последний активный ручной пакет ученика.

Важно: пакет не пересчитывается автоматически по `trainingHistory`.

DTO: `UpsertTrainingPackageDto`.

Request:

```json
{
  "totalTrainings": 5,
  "completedTrainings": 1,
  "paymentStatus": "paid",
  "startedAt": "2026-06-02T06:00:00.000Z",
  "endedAt": "2026-07-02T06:00:00.000Z",
  "isActive": true
}
```

Response `200`: пакет в API field names.

Field mapping:

| API field | Prisma field |
| --- | --- |
| `totalTrainings` | `TrainingPackage.totalSessions` |
| `completedTrainings` | `TrainingPackage.usedSessions` |
| `startedAt` | `TrainingPackage.purchasedAt` |
| `endedAt` | `TrainingPackage.expiresAt` |
| `isActive` | `TrainingPackage.status === active` |

Validation:

- `totalTrainings`: integer `0-1000`.
- `completedTrainings`: integer `0-1000`.
- `completedTrainings <= totalTrainings`.
- `paymentStatus`: `unpaid | paid | partial`.

## Instructors

### GET /instructors

Возвращает список инструкторов с их учениками.

Response `200`:

```json
[
  {
    "id": "instructor-id",
    "firstName": "Никита",
    "lastName": "Александров",
    "telegramUsername": "Nikita_Alex_Vietnam",
    "userId": "user-id",
    "createdAt": "2026-06-01T15:00:00.000Z",
    "updatedAt": "2026-06-01T15:00:00.000Z",
    "students": [
      {
        "id": "student-id",
        "name": "Алексей",
        "telegramUsername": "alex_moto",
        "level": "BASIC",
        "createdAt": "2026-06-01T15:07:44.000Z",
        "updatedAt": "2026-06-02T06:00:00.000Z"
      }
    ]
  }
]
```

### GET /instructors/:id/profile

Возвращает профиль инструктора и его список учеников.

Path params:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | UUID | yes | Instructor id. |

Response `200`: instructor with `students`.

Validation:

- `firstName`: string `1-120`.
- `lastName`: string `1-120`.
- `telegramUsername`: unique string `1-120`.
- `students`: array of student summaries.

## Skills

### GET /skills

Возвращает справочник навыков.

Response `200`:

```json
[
  {
    "id": "skill-id",
    "name": "Овал",
    "description": null,
    "createdAt": "2026-06-01T15:07:44.000Z",
    "updatedAt": "2026-06-01T15:07:44.000Z"
  }
]
```

Seed skills:

- `Овал`
- `Восьмерка`
- `Змейка`
- `Торможение`
- `Развороты`
- `Медленная езда`
- `Взгляд`
- `Город`

### GET /students/:studentId/skills

Возвращает прогресс навыков ученика.

Response `200`:

```json
[
  {
    "skillId": "skill-id",
    "progressPercent": 80,
    "skill": {
      "id": "skill-id",
      "name": "Овал",
      "description": null
    }
  }
]
```

### PUT /students/:studentId/skills

Обновляет прогресс навыков ученика. Existing rows обновляются, missing rows создаются.

DTO item: `UpsertStudentSkillDto`.

Request:

```json
[
  {
    "skillId": "skill-id",
    "progressPercent": 80
  }
]
```

Response `200`: обновленный список навыков ученика.

Validation:

- body должен быть array.
- `skillId`: UUID.
- `progressPercent`: integer `0-100`.
- дубли `skillId` запрещены.
- все `skillId` должны существовать.

Prisma transaction:

- bulk `StudentSkill.upsert`.

## Booking Slots

### GET /booking-slots

Возвращает все слоты с учеником, инструктором, requester, report и trainingRecord.

Response `200`:

```json
[
  {
    "id": "slot-id",
    "startsAt": "2026-06-10T10:00:00.000Z",
    "endsAt": "2026-06-10T11:30:00.000Z",
    "status": "confirmed",
    "title": "Свободный слот",
    "location": null,
    "notes": null,
    "instructorId": "instructor-id",
    "studentId": "student-id",
    "requestedById": "user-id",
    "requestedAt": "2026-06-02T06:00:00.000Z",
    "confirmedAt": "2026-06-02T06:10:00.000Z",
    "cancelledAt": null,
    "cancellationReason": null,
    "preference": "утро",
    "studentComment": "хочу повторить базу",
    "finalLocation": "Учебная площадка",
    "finalLocationUrl": "https://maps.example.com/track",
    "instructorComment": "берем конусы",
    "previousStartsAt": null,
    "previousDurationMinutes": null,
    "student": {
      "id": "student-id",
      "name": "Иван",
      "telegramUsername": "ivan_moto",
      "level": "BASIC"
    },
    "report": null,
    "trainingRecord": null
  }
]
```

Notes:

- Слоты сортируются по `startsAt ASC`.
- `available` слот может иметь `student`, `requestedBy`, `report`, `trainingRecord` равными `null`.
- `reschedule` означает перенос уже подтвержденной записи на другое время.
- Для `reschedule` backend хранит старое confirmed-время в `previousStartsAt` и `previousDurationMinutes`, чтобы UI мог показать “Было / Стало” после reload.

### POST /booking-slots

Создает свободный слот.

DTO: `CreateBookingSlotDto`.

Request:

```json
{
  "startsAt": "2026-06-10T10:00:00.000Z",
  "durationMinutes": 90
}
```

Response `201`:

```json
{
  "id": "slot-id",
  "startsAt": "2026-06-10T10:00:00.000Z",
  "endsAt": "2026-06-10T11:30:00.000Z",
  "status": "available",
  "title": "Свободный слот",
  "instructorId": "instructor-id"
}
```

Validation:

- `startsAt`: ISO date string.
- `durationMinutes`: integer `15-600`.

### PATCH /booking-slots/:slotId

Редактирует только `available` слот.

DTO: `UpdateBookingSlotDto`.

Request:

```json
{
  "startsAt": "2026-06-10T11:00:00.000Z",
  "durationMinutes": 120,
  "title": "Свободный слот",
  "location": "Учебная площадка",
  "notes": "Перенос на час позже"
}
```

Response `200`: обновленный slot.

Conflict:

- Если статус не `available`, вернется `409`.

### DELETE /booking-slots/:slotId

Удаляет только `available` слот.

Response `200`:

```json
{
  "deleted": true,
  "id": "slot-id"
}
```

Conflict:

- `completed` слот нельзя удалить.
- Любой не-`available` слот нельзя удалить.

### POST /booking-slots/:slotId/request

Переводит слот `available -> requested`.

DTO: `RequestBookingSlotDto`.

Request:

```json
{
  "studentId": "student-id",
  "preference": "утро",
  "studentComment": "хочу повторить базу"
}
```

Response `201`:

```json
{
  "id": "slot-id",
  "status": "requested",
  "studentId": "student-id",
  "requestedById": "user-id",
  "preference": "утро",
  "studentComment": "хочу повторить базу"
}
```

Checks:

- slot exists.
- student exists.
- slot status is `available`.

### POST /booking-slots/:slotId/confirm

Переводит слот `requested -> confirmed` или `reschedule -> confirmed`.

DTO: `ConfirmBookingSlotDto`.

Request:

```json
{
  "finalLocation": "Учебная площадка",
  "finalLocationUrl": "https://maps.example.com/track",
  "instructorComment": "берем конусы"
}
```

Response `201`:

```json
{
  "id": "slot-id",
  "status": "confirmed",
  "finalLocation": "Учебная площадка",
  "finalLocationUrl": "https://maps.example.com/track",
  "instructorComment": "берем конусы"
}
```

Checks:

- slot exists.
- slot status is `requested` or `reschedule`.

### POST /booking-slots/:slotId/reschedule

Переводит уже подтвержденную запись `confirmed -> reschedule` на том же `slotId`.

Backend сохраняет старое confirmed-время в `previousStartsAt` и `previousDurationMinutes`, а новое время записывает в `startsAt/endsAt`. Эти поля persist в PostgreSQL и возвращаются после reload.

DTO: `RescheduleBookingSlotDto`.

Request:

```json
{
  "startsAt": "2026-05-18T06:00:00.000Z",
  "durationMinutes": 90,
  "instructorComment": "Переносим из-за погоды"
}
```

Response `201`:

```json
{
  "id": "slot-id",
  "previousStartsAt": "2026-05-17T14:30:00.000Z",
  "previousDurationMinutes": 90,
  "startsAt": "2026-05-18T06:00:00.000Z",
  "endsAt": "2026-05-18T07:30:00.000Z",
  "status": "reschedule",
  "studentId": "student-id",
  "instructorComment": "Переносим из-за погоды"
}
```

Checks:

- slot exists.
- slot status is `confirmed`.
- `durationMinutes`: integer `15-600`.

Frontend example:

```text
Было:
17 мая 17:30

Стало:
18 мая 09:00
```

В UTC это может выглядеть как:

```json
{
  "previousStartsAt": "2026-05-17T14:30:00.000Z",
  "previousDurationMinutes": 90,
  "startsAt": "2026-05-18T06:00:00.000Z",
  "endsAt": "2026-05-18T07:30:00.000Z",
  "status": "reschedule"
}
```

### POST /booking-slots/:slotId/decline

Переводит слот `requested -> cancelled` или `reschedule -> cancelled`.

Request body: отсутствует.

Response `201`:

```json
{
  "id": "slot-id",
  "status": "cancelled",
  "cancelledAt": "2026-06-02T06:00:00.000Z"
}
```

### POST /booking-slots/:slotId/cancel

Ученик отменяет свою заявку/тренировку. Backend не создает новый слот: тот же `BookingSlot` возвращается в календарь как свободный.

Allowed statuses:

- `requested`
- `reschedule`
- `confirmed`

Rejected statuses:

- `available`
- `completed`
- `cancelled`

DTO: `CancelBookingSlotDto`.

Request body is optional:

```json
{
  "reason": "не получается приехать"
}
```

Response `201`: обновленный booking slot.

```json
{
  "id": "slot-id",
  "startsAt": "2026-06-11T14:30:00.000Z",
  "endsAt": "2026-06-11T16:00:00.000Z",
  "status": "available",
  "studentId": null,
  "requestedById": null,
  "requestedAt": null,
  "confirmedAt": null,
  "cancelledAt": null,
  "cancellationReason": null,
  "preference": null,
  "studentComment": null,
  "finalLocation": null,
  "finalLocationUrl": null,
  "instructorComment": null,
  "previousStartsAt": null,
  "previousDurationMinutes": null
}
```

После cancel:

- слот больше не принадлежит ученику;
- слот не отображается как активная тренировка ученика;
- слот исчезает из календаря Никиты как занятая тренировка;
- слот снова виден как `available`;
- состояние сохраняется в PostgreSQL и переживает reload/restart.

Проверка доступных слотов:

```http
GET /api/booking-slots?status=available
```

Notification hook:

После успешного обновления вызывается `NotificationsService.notifyInstructorTrainingCancelled(payload)`.

Payload:

```ts
{
  studentName: string;
  startsAt: Date;
  durationMinutes: number;
  location?: string | null;
  slotId: string;
}
```

Текущая реализация stub/log. Позже Telegram Bot API можно подключить внутри `NotificationsService`, не переписывая cancel business logic.

Будущий текст уведомления:

```text
Алексей Иванов отменил тренировку.
Дата: 11 июня
Время: 17:30
Слот автоматически возвращен в календарь и снова доступен для записи.
```

## Instructor Calendar

### GET /instructor/calendar

Возвращает внутренний календарь инструктора на основе `BookingSlot`.

Это не Google Calendar. `calendarEvents` зарезервирован для будущей интеграции.

Response `200`:

```json
[
  {
    "id": "slot-id",
    "startsAt": "2026-06-10T10:00:00.000Z",
    "endsAt": "2026-06-10T11:30:00.000Z",
    "status": "confirmed",
    "previousStartsAt": null,
    "previousDurationMinutes": null,
    "student": {
      "id": "student-id",
      "name": "Иван",
      "telegramUsername": "ivan_moto",
      "level": "BASIC"
    },
    "instructor": {
      "id": "instructor-id",
      "displayName": "Никита",
      "telegramUsername": "nikita_instructor"
    },
    "calendarEvents": [],
    "report": null
  }
]
```

## Training Reports

### POST /training-reports

Создает отчет по confirmed-тренировке и завершает слот.

DTO: `CreateTrainingReportDto`.

Request:

```json
{
  "slotId": "slot-id",
  "studentId": "student-id",
  "trainedSkills": ["Овал", "Торможение"],
  "improved": "Стал плавнее держать траекторию",
  "nextFocus": "Добавить взгляд в выход",
  "levelUpdate": "INTERMEDIATE"
}
```

Response `201`:

```json
{
  "report": {
    "id": "report-id",
    "bookingSlotId": "slot-id",
    "studentId": "student-id",
    "instructorId": "instructor-id",
    "trainedOn": "Овал, Торможение",
    "successes": "Стал плавнее держать траекторию",
    "focusNext": "Добавить взгляд в выход",
    "levelChange": "INTERMEDIATE"
  },
  "trainingHistory": {
    "id": "history-id",
    "studentId": "student-id",
    "bookingSlotId": "slot-id",
    "reportId": "report-id",
    "trainedAt": "2026-06-10T10:00:00.000Z",
    "summary": "Стал плавнее держать траекторию"
  },
  "slot": {
    "id": "slot-id",
    "status": "completed"
  },
  "student": {
    "id": "student-id",
    "level": "INTERMEDIATE"
  }
}
```

Prisma transaction:

1. Проверить, что slot существует.
2. Проверить `slot.status = confirmed`.
3. Проверить, что student существует.
4. Проверить, что slot не принадлежит другому student.
5. Создать `TrainingReport`.
6. Создать `TrainingHistory`.
7. Обновить `BookingSlot.status -> completed`.
8. Обновить `Student.level`, если передан `levelUpdate`.

Если любой шаг падает, вся операция откатывается.

## Manual Training History

### POST /students/:studentId/training-history/manual

Создает ручную запись истории без booking slot, request/confirm и report.

DTO: `CreateManualTrainingHistoryDto`.

Request:

```json
{
  "trainedAt": "2026-06-01T10:00:00.000Z",
  "summary": "Ручная запись старой тренировки"
}
```

Response `201`:

```json
{
  "id": "history-id",
  "studentId": "student-id",
  "bookingSlotId": null,
  "reportId": null,
  "trainedAt": "2026-06-01T10:00:00.000Z",
  "summary": "Ручная запись старой тренировки",
  "videos": [],
  "report": null,
  "bookingSlot": null
}
```

Schema note:

- Для этого endpoint поля `TrainingHistory.bookingSlotId` и `TrainingHistory.reportId` сделаны nullable в миграции `20260602000000_write_endpoints_foundation`.

## Videos

### POST /training-history/:historyId/videos

Добавляет Telegram video link к конкретной тренировке.

DTO: `CreateTrainingVideoDto`.

Request:

```json
{
  "title": "Овал после корректировки",
  "telegramUrl": "https://t.me/example_video/pass4",
  "comment": "видно прогресс"
}
```

Response `201`:

```json
{
  "id": "video-id",
  "studentId": "student-id",
  "trainingHistoryId": "history-id",
  "reportId": "report-id",
  "telegramUrl": "https://t.me/example_video/pass4",
  "title": "Овал после корректировки",
  "notes": "видно прогресс",
  "createdAt": "2026-06-02T06:00:00.000Z",
  "updatedAt": "2026-06-02T06:00:00.000Z"
}
```

Checks:

- training history exists.
- `studentId` берется из найденной training history.
- `reportId` берется из найденной training history, если он есть.

## DTO Reference

### CreateStudentDto

```ts
{
  name: string;
  telegramUsername?: string;
  level: StudentLevel;
  focus?: string;
  nextTrainingPlan?: string;
  instructorId?: string;
}
```

### UpdateStudentDto

```ts
{
  name?: string;
  telegramUsername?: string;
  level?: StudentLevel;
  focus?: string;
  nextTrainingPlan?: string;
  instructorId?: string;
}
```

### UpsertTrainingPackageDto

```ts
{
  totalTrainings: number;
  completedTrainings: number;
  paymentStatus: TrainingPackagePaymentStatus;
  startedAt?: string;
  endedAt?: string;
  isActive: boolean;
}
```

### UpsertStudentSkillDto

```ts
{
  skillId: string;
  progressPercent: number;
}
```

### CreateManualTrainingHistoryDto

```ts
{
  trainedAt?: string;
  summary?: string;
}
```

### CreateBookingSlotDto

```ts
{
  startsAt: string;
  durationMinutes: number;
}
```

### UpdateBookingSlotDto

```ts
{
  startsAt?: string;
  durationMinutes?: number;
  title?: string;
  location?: string;
  notes?: string;
}
```

### RequestBookingSlotDto

```ts
{
  studentId: string;
  preference?: string;
  studentComment?: string;
}
```

### CancelBookingSlotDto

```ts
{
  reason?: string;
}
```

### ConfirmBookingSlotDto

```ts
{
  finalLocation?: string;
  finalLocationUrl?: string;
  instructorComment?: string;
}
```

### RescheduleBookingSlotDto

```ts
{
  startsAt: string;
  durationMinutes: number;
  instructorComment?: string;
}
```

### CreateTrainingReportDto

```ts
{
  slotId: string;
  studentId: string;
  trainedSkills: string[];
  improved: string;
  nextFocus: string;
  levelUpdate?: StudentLevel;
}
```

### CreateTrainingVideoDto

```ts
{
  title?: string;
  telegramUrl: string;
  comment?: string;
}
```

## Prisma Migration

Write endpoints use migration:

```text
prisma/migrations/20260602000000_write_endpoints_foundation/migration.sql
```

It adds:

- `Student.focus`
- `Student.nextTrainingPlan`
- booking request/confirm fields:
  - `BookingSlot.preference`
  - `BookingSlot.studentComment`
  - `BookingSlot.finalLocation`
  - `BookingSlot.finalLocationUrl`
- `BookingSlot.instructorComment`
- `BookingSlot.previousStartsAt`
- `BookingSlot.previousDurationMinutes`

- nullable `TrainingHistory.bookingSlotId`
- nullable `TrainingHistory.reportId`

Reschedule persistence migration:

```text
prisma/migrations/20260603000000_add_previous_reschedule_fields/migration.sql
```

It adds:

- `BookingSlot.previousStartsAt`
- `BookingSlot.previousDurationMinutes`

## Postman / Newman

Read collection:

```text
postman/Moto Mini App Backend.postman_collection.json
```

Write scenario collection:

```text
postman/Moto Mini App Backend Write.postman_collection.json
```

Cancel scenario collection:

```text
postman/Moto Mini App Backend Cancel.postman_collection.json
```

Run write scenario:

```bash
npx newman run "postman/Moto Mini App Backend Write.postman_collection.json" --env-var baseUrl=http://127.0.0.1:3002
```

Run cancel scenario:

```bash
npx newman run "postman/Moto Mini App Backend Cancel.postman_collection.json" --env-var baseUrl=http://127.0.0.1:3006
```

Verified scenario:

1. Create student.
2. Update student.
3. Put manual package.
4. Get skills.
5. Put student skill progress.
6. Create slot.
7. Request slot.
8. Confirm slot.
9. Create report.
10. Verify slot became `completed`.
11. Verify `trainingHistory` was created.
12. Add video.
13. Create manual training history.
14. Get profile and verify level/history/videos.

Last Newman result:

```text
12 requests
0 failed
```

Cancel flow verified:

```text
requested -> cancel -> available
confirmed -> cancel -> available
reschedule -> cancel -> available
available -> cancel -> 409
completed -> cancel -> 409
```

## Local Verification Commands

```bash
npm run build
npx prisma generate
npx prisma migrate status
npx newman run "postman/Moto Mini App Backend Write.postman_collection.json" --env-var baseUrl=http://127.0.0.1:3002
```
