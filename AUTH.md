# Telegram Mini App Authentication

## Overview

Backend реализует JWT-based авторизацию через Telegram Mini App `initData`. При первом входе автоматически создается студент с UUID и привязывается к инструктору по умолчанию.

## Endpoints

### POST /api/auth/telegram

Авторизует пользователя через Telegram initData и возвращает JWT токен.

**Request Body:**

```json
{
  "initData": "query_id=AAH...&user=%7B%22id%22%3A123456789..."
}
```

`initData` - строка из `WebApp.initData` Telegram Mini App SDK.

**Response (201 Created):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "studentId": "550e8400-e29b-41d4-a716-446655440000",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "telegramId": 123456789,
    "telegramUsername": "john_doe",
    "displayName": "John Doe"
  }
}
```

**Error Responses:**

| Status | Message |
|--------|---------|
| `400` | `initData is required` |
| `400` | `user data not found in initData` |
| `401` | `Invalid telegram init data format` |
| `401` | `Invalid telegram user data` |

## Implementation Details

### Service Flow (src/auth/auth.service.ts)

1. **validateTelegramData(initData: string)**
   - Парсит `initData` как URL query string
   - Извлекает JSON из параметра `user`
   - Проверяет наличие `telegramId` (number)
   - Throws `UnauthorizedException` если данные некорректны

2. **authenticateWithTelegram(dto: TelegramAuthDto)**
   - Вызывает валидацию initData
   - Ищет User по `telegramId`:
     - **Если найден**: просто генерирует JWT токен
     - **Если новый**: создает User + Student в одной транзакции
   - Student создается как:
     - Уровень: `BEGINNER`
     - Инструктор: default инструктор (id = `11111111-1111-1111-1111-111111111111`)
     - Имя: из `first_name` + `last_name` или `User {id}`

3. **JWT Token**
   - Payload: `{ sub: userId, role: STUDENT, studentId, telegramId }`
   - Expires: 30 дней
   - Secret: `JWT_SECRET` из env (dev default: 'dev-secret-key')

### JWT Guard (src/auth/jwt-auth.guard.ts)

Может быть применен к контроллерам/методам для защиты endpoints:

```typescript
import { JwtAuthGuard } from './auth/jwt-auth.guard'

@Controller('booking-slots')
@UseGuards(JwtAuthGuard)
export class BookingController { }
```

Guard:
- Проверяет наличие `Authorization: Bearer <token>` header
- Верифицирует и декодирует JWT токен
- Добавляет `req.user` с данными из payload
- Throws `UnauthorizedException` если токен невалиден или отсутствует
- Позволяет req.user установленный DevAuthMiddleware (для dev режима)

## Environment Variables

```env
# JWT
JWT_SECRET=your-super-secret-key-for-production

# Dev Auth (отключить для production)
DEV_AUTH_ENABLED=false
```

## Database Impact

### При авторизации новой User:

```sql
-- Создается User
INSERT INTO "User" (id, telegramId, telegramUsername, displayName, role)
VALUES (..., '123456789', 'john_doe', 'John Doe', 'STUDENT')

-- Создается Student с uuid
INSERT INTO "Student" (id, userId, instructorId, name, telegramUsername, level)
VALUES (
  'generated-uuid',
  'user-id',
  '11111111-1111-1111-1111-111111111111',  -- default instructor
  'John Doe',
  'john_doe',
  'BEGINNER'
)
```

### При авторизации существующей User:

Никаких INSERT - только SELECT и JWT генерация.

## Dev Mode Testing

Для локального тестирования без Telegram:

```env
# backend/.env
DEV_AUTH_ENABLED=true
JWT_SECRET=dev-key
```

С `DEV_AUTH_ENABLED=true`:
- Запросы не требуют JWT токена
- `DevAuthMiddleware` автоматически добавляет `req.user`
- Можно тестировать API endpoints через Postman без авторизации

Отключить JWT guard для endpoints (временно для dev):

```typescript
// DEV: Пропустить авторизацию
// @UseGuards(JwtAuthGuard)
@Controller('students')
export class StudentsController { }
```

## Production Checklist

- [ ] `DEV_AUTH_ENABLED=false`
- [ ] `JWT_SECRET` установлен на сервере
- [ ] Default инструктор существует в БД
- [ ] JWT guard применена ко всем protected endpoints
- [ ] Frontend отправляет токен в `Authorization` header
- [ ] HTTPS включен (для Telegram Mini App требуется)
- [ ] CORS настроена правильно

## Common Errors

**"Missing authorization header"** - Guard не нашел Authorization header
- Проверьте что frontend отправляет `Authorization: Bearer <token>`

**"Invalid or expired token"** - JWT токен невалиден
- Может быть истек (30 дней)
- Может быть подписан другим JWT_SECRET
- Проверьте что JWT_SECRET совпадает между frontend и backend

**"Default instructor not found"** - БД не засеена
- Запустите `npm run prisma:seed`

**"initData is required"** - Frontend не передал initData
- Проверьте что приложение открыто из Telegram Mini App
- `WebApp.initData` пуст если приложение не в Telegram контексте
