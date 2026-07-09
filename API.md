# Moto Mini App Backend API

Документация актуальна на 19 июня 2026. Включает текущие endpoints, DTO с валидацией, Prisma transaction notes и интеграционные правила для frontend.

Последние обновления:
- Добавлена dedicated `Instructor` entity и endpoints `GET /instructors`, `GET /instructors/:id/profile`.
- Зафиксирован текущий same-slot `reschedule` flow с `previousStartsAt` и `previousDurationMinutes`.
- Добавлен student cancel flow `POST /booking-slots/:slotId/cancel` с notification hook.
- Добавлен параметр `studentId` в `GET /booking-slots` для сценариев frontend.
- `GET /booking-slots` по умолчанию возвращает только актуальные слоты: от текущей даты минус один месяц и дальше.
- `GET /instructor/calendar` использует такое же актуальное окно: все статусы, но только от текущей даты минус один месяц и дальше.
- Все DTO задокументированы с типами полей и validation rules.

## Base URL

```text
http://localhost:3000/api
```

Если порт `3000` занят, можно запустить backend на другом порту:

```bash
PORT=3002 npm run start:dev
```

## Auth

Telegram Mini App авторизация через JWT токены.

### POST /api/auth/telegram

Авторизует пользователя через Telegram `initData`. При первом входе автоматически создает студента с `uuid`.

**Request:**

```json
{
  "initData": "query_id=AAH...&user=%7B%22id%22%3A123456789..."
}
```

`initData` получается в фронтенде через `WebApp.initData` (Telegram Mini App SDK).

**Response:**

```json
{
  "token": "eyJhbGc...",
  "studentId": "550e8400-e29b-41d4-a716-446655440000",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "telegramId": 123456789,
    "telegramUsername": "john_doe",
    "displayName": "John Doe"
  }
}
```

**Usage in Frontend:**

1. При запуске приложения получить `WebApp.initData`
2. Отправить POST запрос на `/auth/telegram`
3. Сохранить `token` в localStorage
4. Отправлять `Authorization: Bearer <token>` в headers всех последующих requests

**Dev Mode:**

Для локального тестирования без Telegram:
- Установить `DEV_AUTH_ENABLED=true` в .env
- Токен JWT не требуется, авторизация идет через `DevAuthMiddleware`

Production auth пока не реализован.

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

### TrainingPackageType

```text
scooter
motorcycle
gymkhana
```

Display names:

| type | name |
| --- | --- |
| `scooter` | `Скутер` |
| `motorcycle` | `Мотоцикл` |
| `gymkhana` | `Джимхана` |

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

Возвращает легкий список учеников для профиля инструктора: user, instructor, manual packages и счетчик завершенных тренировок. Полная история, навыки и предстоящие тренировки подгружаются через `GET /students/:id/profile` при открытии карточки ученика.

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
    "completedTrainingsCount": 0
  }
]
```

Notes:

- Ученики сортируются по `createdAt ASC`.
- Пакеты сортируются по `createdAt DESC`.
- `completedTrainingsCount` считается через `_count.trainingHistory`.
- Пакеты полностью ручные и не пересчитываются из истории тренировок.
- `trainingHistory`, `skills`, `upcomingTrainings` и `nextTraining` намеренно не входят в список, чтобы не грузить тяжелые данные при входе в профиль инструктора.

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

Возвращает полный профиль ученика: user, packages, skills, training history, reports, booking slots, videos и счетчики истории.

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
  "upcomingTrainings": [
    {
      "id": "slot-id",
      "startsAt": "2026-07-10T09:00:00.000Z",
      "endsAt": "2026-07-10T10:30:00.000Z",
      "status": "confirmed",
      "title": "Площадка",
      "location": "Учебная площадка"
    }
  ],
  "nextTraining": {
    "id": "slot-id",
    "startsAt": "2026-07-10T09:00:00.000Z",
    "endsAt": "2026-07-10T10:30:00.000Z",
    "status": "confirmed",
    "title": "Площадка",
    "location": "Учебная площадка"
  },
  "completedTrainingsCount": 1,
  "videos": []
}
```

`completedTrainingsCount` равен количеству записей `TrainingHistory`. `upcomingTrainings` содержит активные записи ученика со статусами `requested | reschedule | confirmed`, отсортированные по `startsAt ASC`; `nextTraining` равен первой записи из этого массива или `null`. Поля ручного пакета (`totalSessions`, `usedSessions`, а в package API — `totalTrainings`, `completedTrainings`) остаются независимыми и не изменяются по истории.

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
  "type": "scooter",
  "name": "Скутер",
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
  "type": "scooter",
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
| `type` | `TrainingPackage.type` |
| `name` | `TrainingPackage.name` |
| `totalTrainings` | `TrainingPackage.totalSessions` |
| `completedTrainings` | `TrainingPackage.usedSessions` |
| `startedAt` | `TrainingPackage.purchasedAt` |
| `endedAt` | `TrainingPackage.expiresAt` |
| `isActive` | `TrainingPackage.status === active` |

Validation:

- `type`: optional `scooter | motorcycle | gymkhana`.
- `name`: optional persisted display field `Скутер | Мотоцикл | Джимхана`; frontend currently sends Russian values.
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

Возвращает рабочий список слотов с учеником, инструктором, requester, report и trainingRecord.

По умолчанию endpoint ограничивает выдачу скользящим актуальным окном: `startsAt >= текущий момент минус один месяц`. Это не календарный месяц и не архив всей базы. Будущие слоты остаются в ответе, старые слоты старше месяца скрываются из обычной выдачи.

`durationMinutes` всегда возвращается backend в ответе и вычисляется из `endsAt - startsAt`. Frontend не должен падать в fallback `90 мин`, если слот был создан на `60 мин`.

Query params:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `status` | BookingSlotStatus | no | Filter by booking slot status. |
| `studentId` | UUID | no | Student-facing filter: returns slots where `studentId` matches OR `status = available`. |

Examples:

- `GET /booking-slots` - все актуальные слоты за скользящий месяц назад и будущее
- `GET /booking-slots?status=confirmed` - только актуальные подтвержденные слоты
- `GET /booking-slots?studentId=<uuid>` - актуальные слоты студента + доступные для записи
- `GET /booking-slots?studentId=<uuid>&status=confirmed` - актуальные подтвержденные слоты этого студента

Response `200`:

```json
[
  {
    "id": "slot-id",
    "startsAt": "2026-06-10T10:00:00.000Z",
    "endsAt": "2026-06-10T11:30:00.000Z",
    "durationMinutes": 90,
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
      "level": "BASIC",
      "activePackage": {
        "id": "package-id",
        "studentId": "student-id",
        "type": "scooter",
        "name": "Скутер",
        "totalTrainings": 4,
        "completedTrainings": 1,
        "paymentStatus": "paid",
        "startedAt": "2026-06-02T06:00:00.000Z",
        "endedAt": null,
        "isActive": true,
        "createdAt": "2026-06-02T06:00:00.000Z",
        "updatedAt": "2026-06-02T06:00:00.000Z"
      },
      "package": {
        "id": "package-id",
        "studentId": "student-id",
        "type": "scooter",
        "name": "Скутер",
        "totalTrainings": 4,
        "completedTrainings": 1,
        "paymentStatus": "paid",
        "startedAt": "2026-06-02T06:00:00.000Z",
        "endedAt": null,
        "isActive": true,
        "createdAt": "2026-06-02T06:00:00.000Z",
        "updatedAt": "2026-06-02T06:00:00.000Z"
      },
      "packages": [
        {
          "id": "package-id",
          "studentId": "student-id",
          "type": "scooter",
          "name": "Скутер",
          "totalTrainings": 4,
          "completedTrainings": 1,
          "paymentStatus": "paid",
          "startedAt": "2026-06-02T06:00:00.000Z",
          "endedAt": null,
          "isActive": true,
          "createdAt": "2026-06-02T06:00:00.000Z",
          "updatedAt": "2026-06-02T06:00:00.000Z"
        }
      ]
    },
    "report": null,
    "trainingRecord": null
  }
]
```

Notes:

- Слоты сортируются по `startsAt ASC`.
- `durationMinutes` является частью API-контракта для всех slot response: `GET /booking-slots`, `GET /instructor/calendar`, `POST/PATCH/POST action` endpoints, которые возвращают slot.
- Для `requested/reschedule/confirmed` слотов `student.activePackage` содержит последний активный ручной пакет ученика. UI блока "Новые запросы на запись" может показать `Пакет "Скутер" 1/4` из `student.activePackage.name`, `completedTrainings`, `totalTrainings`.
- `available` слот может иметь `student`, `requestedBy`, `report`, `trainingRecord` равными `null`.
- `reschedule` означает перенос уже подтвержденной записи на другое время.
- Для `reschedule` backend хранит старое confirmed-время в `previousStartsAt` и `previousDurationMinutes`, чтобы UI мог показать "Было / Стало" после reload.
- При фильтре только по `studentId` возвращаются слоты, где либо `studentId` соответствует переданному значению, либо слот `available` (чтобы студент мог видеть свои тренировки и доступные для записи слоты).
- При одновременном `studentId` и `status` backend применяет оба условия: `((studentId = :studentId) OR status = available) AND status = :status`. Например, `status=available` вернет доступные слоты, а `status=confirmed` вернет confirmed-слоты этого студента.

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
  "durationMinutes": 90,
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

Для `requested` это обычный update одного slot. Для `reschedule` backend использует Prisma transaction: подтверждает тот же rescheduled slot и освобождает предыдущее время, если отдельного слота на старое время еще нет. Frontend при этом продолжает работать с тем же `slotId` как с перенесенной тренировкой.

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
- для `reschedule` должны быть заполнены `previousStartsAt` и `previousDurationMinutes`.

Prisma transaction for `reschedule` confirmation:

1. Проверить, есть ли отдельный слот на `previousStartsAt` / previous duration.
2. Если такого слота нет, создать `available` slot на старое время.
3. Обновить текущий rescheduled slot до `confirmed`.

### POST /booking-slots/:slotId/reschedule

Переводит уже подтвержденную запись `confirmed -> reschedule` на том же `slotId`.

Backend сохраняет старое confirmed-время в `previousStartsAt` и `previousDurationMinutes`, а новое время записывает в `startsAt/endsAt`. Эти поля persist в PostgreSQL и возвращаются после reload.

Важно: endpoint не создает новый booking slot. Он меняет время у той же записи и сохраняет старое время в previous-полях.

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

По умолчанию endpoint возвращает все статусы слотов, но только в актуальном скользящем окне: `startsAt >= текущий момент минус один месяц`. Это не календарный месяц; будущие слоты остаются в ответе, старые слоты старше месяца скрываются из обычного календаря.

Календарь самодостаточен для отображения: занятые слоты содержат короткого `student`, активный пакет внутри `student.activePackage`, а completed-слоты содержат короткий `report`. Frontend не должен дополнительно запрашивать `GET /students` или полные профили учеников только ради календарной ленты.

Это не Google Calendar. `calendarEvents` зарезервирован для будущей интеграции.

Response `200`:

```json
[
  {
    "id": "slot-id",
    "startsAt": "2026-06-10T10:00:00.000Z",
    "endsAt": "2026-06-10T11:30:00.000Z",
    "durationMinutes": 90,
    "status": "confirmed",
    "previousStartsAt": null,
    "previousDurationMinutes": null,
    "student": {
      "id": "student-id",
      "name": "Иван",
      "telegramUsername": "ivan_moto",
      "level": "BASIC",
      "activePackage": {
        "id": "package-id",
        "studentId": "student-id",
        "type": "scooter",
        "name": "Скутер",
        "totalTrainings": 4,
        "completedTrainings": 1,
        "paymentStatus": "paid",
        "startedAt": "2026-06-02T06:00:00.000Z",
        "endedAt": null,
        "isActive": true,
        "createdAt": "2026-06-02T06:00:00.000Z",
        "updatedAt": "2026-06-02T06:00:00.000Z"
      }
    },
    "instructor": {
      "id": "instructor-id",
      "displayName": "Никита",
      "telegramUsername": "nikita_instructor"
    },
    "calendarEvents": [],
    "report": {
      "id": "report-id",
      "trainedOn": "Овал, торможение",
      "successes": "Лучше держит траекторию",
      "focusNext": "Взгляд в повороте",
      "levelChange": null,
      "createdAt": "2026-06-10T12:00:00.000Z"
    }
  }
]
```

## Training Reports

### POST /training-reports

Создает отчет по confirmed-тренировке и завершает слот.

DTO: `CreateTrainingReportDto`.

Также в той же Prisma transaction обновляет последний активный ручной пакет ученика:

- если пакет есть и `completedTrainings < totalTrainings`, backend увеличивает `completedTrainings` на `+1`;
- если пакета нет или пакет уже заполнен, счетчик не меняется;
- повторный вызов с тем же `slotId` идемпотентен: существующий отчет возвращается, пакет повторно не увеличивается.

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
  },
  "trainingPackage": {
    "id": "package-id",
    "studentId": "student-id",
    "type": "motorcycle",
    "name": "Мотоцикл",
    "totalTrainings": 4,
    "completedTrainings": 2,
    "paymentStatus": "paid",
    "startedAt": "2026-06-02T06:00:00.000Z",
    "endedAt": null,
    "isActive": true,
    "createdAt": "2026-06-02T06:00:00.000Z",
    "updatedAt": "2026-07-02T10:00:00.000Z"
  }
}
```

Prisma transaction:

1. Проверить, что slot существует.
2. Проверить, есть ли уже `TrainingReport` для `slotId`; если есть, вернуть существующие данные без повторного увеличения пакета.
3. Проверить `slot.status = confirmed`.
4. Проверить, что student существует.
5. Проверить, что slot не принадлежит другому student.
6. Создать `TrainingReport`.
7. Создать `TrainingHistory`.
8. Обновить `BookingSlot.status -> completed`.
9. Обновить `Student.level`, если передан `levelUpdate`.
10. Найти активный `TrainingPackage` ученика и увеличить `usedSessions` на `1`, если `usedSessions < totalSessions`.

Если любой шаг падает, вся операция откатывается.

Важно: `POST /students/:studentId/training-history/manual` не увеличивает пакет автоматически.

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
  type?: TrainingPackageType;
  name?: 'Скутер' | 'Мотоцикл' | 'Джимхана';
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

### FindBookingSlotsQueryDto

```ts
{
  status?: BookingSlotStatus;
  studentId?: string;
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

## DTO Validation Details

### CreateStudentDto

- `name`: string, required, max length 120
- `telegramUsername`: string, optional, max length 120
- `level`: StudentLevel enum, required (BEGINNER | BASIC | INTERMEDIATE | ADVANCED)
- `focus`: string, optional
- `nextTrainingPlan`: string, optional

### UpdateStudentDto

- `name`: string, optional, max length 120
- `telegramUsername`: string, optional, max length 120
- `level`: StudentLevel enum, optional
- `focus`: string, optional
- `nextTrainingPlan`: string, optional

### CreateBookingSlotDto

- `startsAt`: ISO date string, required
- `durationMinutes`: integer, required, min 15, max 600

### UpdateBookingSlotDto

- `startsAt`: ISO date string, optional
- `durationMinutes`: integer, optional, min 15, max 600
- `title`: string, optional
- `location`: string, optional
- `notes`: string, optional

### RequestBookingSlotDto

- `studentId`: UUID, required
- `preference`: string, optional
- `studentComment`: string, optional

### ConfirmBookingSlotDto

- `finalLocation`: string, optional
- `finalLocationUrl`: URL with protocol, optional
- `instructorComment`: string, optional

### RescheduleBookingSlotDto

- `startsAt`: ISO date string, required
- `durationMinutes`: integer, required, min 15, max 600
- `instructorComment`: string, optional

### CancelBookingSlotDto

- `reason`: string, optional

### FindBookingSlotsQueryDto

- `status`: BookingSlotStatus enum, optional
- `studentId`: UUID, optional

### UpsertTrainingPackageDto

- `type`: TrainingPackageType enum, optional (scooter | motorcycle | gymkhana)
- `name`: persisted display package name, optional (Скутер | Мотоцикл | Джимхана)
- `totalTrainings`: integer, required, min 0, max 1000
- `completedTrainings`: integer, required, min 0, max 1000
- `paymentStatus`: TrainingPackagePaymentStatus enum, required (unpaid | paid | partial)
- `startedAt`: ISO date string, optional
- `endedAt`: ISO date string, optional
- `isActive`: boolean, required
- Validation: `completedTrainings <= totalTrainings`

### UpsertStudentSkillDto

- `skillId`: UUID, required
- `progressPercent`: integer, required, min 0, max 100

### CreateManualTrainingHistoryDto

- `trainedAt`: ISO date string, optional
- `summary`: string, optional

### CreateTrainingReportDto

- `slotId`: UUID, required
- `studentId`: UUID, required
- `trainedSkills`: string array, required
- `improved`: string, required
- `nextFocus`: string, required
- `levelUpdate`: StudentLevel enum, optional

### CreateTrainingVideoDto

- `title`: string, optional
- `telegramUrl`: URL with protocol, required
- `comment`: string, optional

## Prisma Migration

Current migration history:

```text
20260601000000_initial_foundation
20260602000000_write_endpoints_foundation
20260602010000_add_reschedule_booking_slot_status
20260603000000_add_previous_reschedule_fields
20260603010000_reschedule_target_slot_flow
20260603020000_revert_reschedule_target_slot_flow
20260604000000_add_instructor_entity
20260701000000_add_training_package_type
20260701010000_add_training_package_name
```

Write endpoints foundation:

```text
prisma/migrations/20260602000000_write_endpoints_foundation/migration.sql
```

It adds:

- `Student.focus`
- `Student.nextTrainingPlan`
- `BookingSlot.preference`
- `BookingSlot.studentComment`
- `BookingSlot.finalLocation`
- `BookingSlot.finalLocationUrl`
- `BookingSlot.instructorComment`
- nullable `TrainingHistory.bookingSlotId`
- nullable `TrainingHistory.reportId`

Reschedule status migration:

```text
prisma/migrations/20260602010000_add_reschedule_booking_slot_status/migration.sql
```

It adds:

- `BookingSlotStatus.reschedule`

Reschedule persistence migration:

```text
prisma/migrations/20260603000000_add_previous_reschedule_fields/migration.sql
```

It adds:

- `BookingSlot.previousStartsAt`
- `BookingSlot.previousDurationMinutes`

Historical two-slot reschedule migration and revert:

```text
prisma/migrations/20260603010000_reschedule_target_slot_flow/migration.sql
prisma/migrations/20260603020000_revert_reschedule_target_slot_flow/migration.sql
```

The first migration added `BookingSlot.rescheduleSourceSlotId`; the second migration removed it. Current schema does not use `rescheduleSourceSlotId`.

Instructor entity migration:

```text
prisma/migrations/20260604000000_add_instructor_entity/migration.sql
```

It adds:

- `Instructor`
- `Student.instructorId`
- relation `Instructor.students`

Training package display migrations:

```text
prisma/migrations/20260701000000_add_training_package_type/migration.sql
prisma/migrations/20260701010000_add_training_package_name/migration.sql
```

They add:

- `TrainingPackageType`
- `TrainingPackage.type`
- `TrainingPackage.name`

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

## Frontend TypeScript Types

Рекомендуемые типы для фронтенда на базе API ответов:

```typescript
// Domain Types
type StudentLevel = 'BEGINNER' | 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
type BookingSlotStatus = 'available' | 'requested' | 'reschedule' | 'confirmed' | 'completed' | 'cancelled';
type TrainingPackagePaymentStatus = 'unpaid' | 'paid' | 'partial';
type TrainingPackageStatus = 'active' | 'completed' | 'cancelled';
type UserRole = 'STUDENT' | 'INSTRUCTOR';

// Entity Types
interface Student {
  id: string;
  userId: string;
  instructorId: string;
  name: string;
  telegramUsername: string;
  level: StudentLevel;
  focus?: string;
  nextTrainingPlan?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  user: User;
  instructor: Instructor;
  packages: TrainingPackage[];
  skills: StudentSkill[];
}

interface Instructor {
  id: string;
  firstName: string;
  lastName: string;
  telegramUsername: string;
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
  students?: Array<{
    id: string;
    name: string;
    telegramUsername?: string | null;
    level: StudentLevel;
    createdAt: string;
    updatedAt: string;
  }>;
}

interface BookingSlot {
  id: string;
  startsAt: string;
  endsAt: string;
  status: BookingSlotStatus;
  title: string;
  location?: string;
  notes?: string;
  instructorId: string;
  studentId?: string;
  requestedById?: string;
  requestedAt?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  preference?: string;
  studentComment?: string;
  finalLocation?: string;
  finalLocationUrl?: string;
  instructorComment?: string;
  previousStartsAt?: string;
  previousDurationMinutes?: number;
  student?: {
    id: string;
    name: string;
    telegramUsername: string;
    level: StudentLevel;
  };
  instructor?: {
    id: string;
    displayName: string;
    telegramUsername: string;
    role: UserRole;
  };
  report?: TrainingReport | null;
  trainingRecord?: TrainingHistory | null;
}

interface TrainingPackage {
  id: string;
  studentId: string;
  totalTrainings: number;
  completedTrainings: number;
  paymentStatus: TrainingPackagePaymentStatus;
  startedAt?: string | null;
  endedAt?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StudentSkill {
  skillId: string;
  progressPercent: number;
  skill: {
    id: string;
    name: string;
    description?: string;
  };
}

interface TrainingReport {
  id: string;
  bookingSlotId: string;
  studentId: string;
  instructorId: string;
  trainedOn: string;
  successes: string;
  focusNext: string;
  levelChange: StudentLevel;
  createdAt?: string;
  updatedAt?: string;
}

interface TrainingHistory {
  id: string;
  studentId: string;
  bookingSlotId?: string | null;
  reportId?: string | null;
  trainedAt: string;
  summary?: string | null;
  videos: TrainingVideo[];
  report?: TrainingReport | null;
  bookingSlot?: { id: string; status: BookingSlotStatus } | null;
}

interface TrainingVideo {
  id: string;
  studentId: string;
  trainingHistoryId?: string | null;
  reportId?: string | null;
  telegramUrl: string;
  title?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  telegramId?: string;
  telegramUsername: string;
  displayName: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

interface Skill {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Request/Query Types
interface FindBookingSlotsQuery {
  status?: BookingSlotStatus;
  studentId?: string;
}

interface CreateStudentRequest {
  name: string;
  telegramUsername?: string;
  level: StudentLevel;
  focus?: string;
  nextTrainingPlan?: string;
  instructorId?: string;
}

interface UpdateStudentRequest {
  name?: string;
  telegramUsername?: string;
  level?: StudentLevel;
  focus?: string;
  nextTrainingPlan?: string;
  instructorId?: string;
}

interface CreateBookingSlotRequest {
  startsAt: string;
  durationMinutes: number;
}

interface UpdateBookingSlotRequest {
  startsAt?: string;
  durationMinutes?: number;
  title?: string;
  location?: string;
  notes?: string;
}

interface RequestBookingSlotRequest {
  studentId: string;
  preference?: string;
  studentComment?: string;
}

interface ConfirmBookingSlotRequest {
  finalLocation?: string;
  finalLocationUrl?: string;
  instructorComment?: string;
}

interface RescheduleBookingSlotRequest {
  startsAt: string;
  durationMinutes: number;
  instructorComment?: string;
}

interface CancelBookingSlotRequest {
  reason?: string;
}

interface UpsertTrainingPackageRequest {
  totalTrainings: number;
  completedTrainings: number;
  paymentStatus: TrainingPackagePaymentStatus;
  startedAt?: string;
  endedAt?: string;
  isActive: boolean;
}

interface UpsertStudentSkillRequest {
  skillId: string;
  progressPercent: number;
}

interface CreateTrainingReportRequest {
  slotId: string;
  studentId: string;
  trainedSkills: string[];
  improved: string;
  nextFocus: string;
  levelUpdate?: StudentLevel;
}

interface CreateTrainingVideoRequest {
  title?: string;
  telegramUrl: string;
  comment?: string;
}

interface CreateManualTrainingHistoryRequest {
  trainedAt?: string;
  summary?: string;
}
```

## API Status Codes

| Code | Meaning | Common Causes |
| --- | --- | --- |
| 200 | OK | Успешный GET, PATCH, PUT запрос |
| 201 | Created | Успешный POST запрос |
| 400 | Bad Request | Невалидный DTO, неверный диапазон значений, нарушение бизнес-логики |
| 404 | Not Found | Ресурс не найден (student, slot, skill, report, instructor) |
| 409 | Conflict | Неверный переход статуса, дубликат telegramUsername, неправильный слот для студента |
| 500 | Internal Server Error | Ошибка сервера |

## Integration Examples

### Получить слоты студента

```http
GET /api/booking-slots?studentId=550e8400-e29b-41d4-a716-446655440000
```

Ответ:
- Слоты, где `studentId = 550e8400-e29b-41d4-a716-446655440000`
- ИЛИ слоты с `status = available`

Используется чтобы показать студенту:
- Его активные тренировки (requested, confirmed, reschedule)
- Доступные для записи слоты

### Создать и провести тренировку (flow)

1. **POST /booking-slots** - создать свободный слот
2. **POST /booking-slots/:slotId/request** - студент запрашивает запись
3. **POST /booking-slots/:slotId/confirm** - инструктор подтверждает
4. **POST /training-reports** - инструктор создает отчет после тренировки
5. **Slot автоматически переходит в status = completed**

### Отмена тренировки

**POST /booking-slots/:slotId/cancel** - студент отменяет

- `requested -> cancel -> available`
- `confirmed -> cancel -> available`
- `reschedule -> cancel -> available`

Слот возвращается в календарь и становится доступным для других студентов.

### Перенос тренировки

**POST /booking-slots/:slotId/reschedule** - инструктор переносит confirmed тренировку

Поля `previousStartsAt` и `previousDurationMinutes` сохраняют старое время для отображения "Было / Стало".

### Ручная запись истории

**POST /students/:studentId/training-history/manual** - когда нет booking slot (тренировка не через систему бронирования)

Позволяет добавить исторические тренировки без связи с booking slot.
