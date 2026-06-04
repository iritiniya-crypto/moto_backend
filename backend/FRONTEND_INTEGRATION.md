# Moto Mini App Frontend Integration Guide

Этот гайд поможет фронтенд разработчикам интегрировать Moto Mini App Backend в их приложение.

## Содержание

- [Быстрый старт](#быстрый-старт)
- [TypeScript Типы](#typescript-типы)
- [API Документация](#api-документация)
- [Примеры запросов](#примеры-запросов)
- [Обработка ошибок](#обработка-ошибок)
- [Доступные слоты для студента](#доступные-слоты-для-студента)

## Быстрый старт

### 1. Скопировать типы

Скопируй содержимое файла `FRONTEND_TYPES.ts` в свой проект:

```bash
cp FRONTEND_TYPES.ts /path/to/your/frontend/types/
```

### 2. Использовать базовый URL

```typescript
const API_BASE_URL = 'http://localhost:3000/api';
// или на production
const API_BASE_URL = 'https://api.moto-app.com/api';
```

### 3. Создать API клиент

```typescript
import { API_BASE_URL, Student, BookingSlot } from './types/FRONTEND_TYPES';

class MotoApiClient {
  private baseUrl = API_BASE_URL;

  async getStudents(): Promise<Student[]> {
    const response = await fetch(`${this.baseUrl}/students`);
    if (!response.ok) throw new Error('Failed to fetch students');
    return response.json();
  }

  async getStudentProfile(studentId: string): Promise<StudentProfile> {
    const response = await fetch(`${this.baseUrl}/students/${studentId}/profile`);
    if (!response.ok) throw new Error('Failed to fetch student profile');
    return response.json();
  }

  async getBookingSlots(query?: FindBookingSlotsQuery): Promise<BookingSlot[]> {
    const params = new URLSearchParams();
    if (query?.status) params.append('status', query.status);
    if (query?.studentId) params.append('studentId', query.studentId);
    
    const url = `${this.baseUrl}/booking-slots${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch booking slots');
    return response.json();
  }

  // ... остальные методы
}
```

## TypeScript Типы

### Основные типы

```typescript
import {
  // Enums
  StudentLevel,
  BookingSlotStatus,
  TrainingPackagePaymentStatus,
  UserRole,

  // Entity Types
  Student,
  StudentProfile,
  BookingSlot,
  TrainingReport,
  TrainingHistory,
  TrainingVideo,
  Skill,
  TrainingPackage,
  
  // Request Types
  CreateStudentRequest,
  UpdateStudentRequest,
  CreateBookingSlotRequest,
  ConfirmBookingSlotRequest,
  
  // Constants
  STUDENT_LEVELS,
  BOOKING_SLOT_STATUSES,
  PAYMENT_STATUSES,
  SEED_SKILLS,
  
  // Helper Functions
  canCancelBookingSlot,
  canEditBookingSlot,
  getRemainingTrainings
} from './types/FRONTEND_TYPES';
```

## API Документация

Полная документация доступна в файле `API.md`:

```bash
cat API.md
```

### Основные endpoints:

| Метод | URL | Описание |
| --- | --- | --- |
| GET | `/students` | Получить всех студентов |
| GET | `/students/:id/profile` | Получить профиль студента |
| POST | `/students` | Создать нового студента |
| PATCH | `/students/:id` | Обновить студента |
| GET | `/booking-slots` | Получить слоты бронирования |
| POST | `/booking-slots` | Создать слот |
| POST | `/booking-slots/:id/request` | Запросить слот |
| POST | `/booking-slots/:id/confirm` | Подтвердить слот |
| POST | `/booking-slots/:id/cancel` | Отменить слот |
| GET | `/skills` | Получить все навыки |
| PUT | `/students/:id/skills` | Обновить прогресс навыков |
| POST | `/training-reports` | Создать отчет о тренировке |

## Примеры запросов

### Получить слоты студента

```typescript
// Получить все слоты студента + доступные для записи
const studentId = '550e8400-e29b-41d4-a716-446655440000';
const slots = await apiClient.getBookingSlots({ studentId });

// Получить только подтвержденные слоты студента
const confirmedSlots = await apiClient.getBookingSlots({ 
  studentId,
  status: 'confirmed' 
});

// Получить все доступные слоты
const availableSlots = await apiClient.getBookingSlots({ status: 'available' });
```

### Создать студента

```typescript
const newStudent = await apiClient.createStudent({
  name: 'Иван Иванов',
  telegramUsername: 'ivan_moto',
  level: 'BEGINNER',
  focus: 'Овал',
  nextTrainingPlan: 'Произвольная езда'
});
```

### Запросить слот

```typescript
const slotId = '660e8400-e29b-41d4-a716-446655440000';
const studentId = '550e8400-e29b-41d4-a716-446655440000';

const result = await apiClient.requestBookingSlot(slotId, {
  studentId,
  preference: 'утро',
  studentComment: 'Хочу повторить базовые навыки'
});
```

### Подтвердить слот

```typescript
const confirmedSlot = await apiClient.confirmBookingSlot(slotId, {
  finalLocation: 'Учебная площадка',
  finalLocationUrl: 'https://maps.google.com/...',
  instructorComment: 'Берем конусы и маты'
});
```

### Создать отчет о тренировке

```typescript
const report = await apiClient.createTrainingReport({
  slotId,
  studentId,
  trainedSkills: ['Овал', 'Торможение'],
  improved: 'Стал плавнее держать траекторию',
  nextFocus: 'Добавить взгляд в выход',
  levelUpdate: 'INTERMEDIATE'
});
```

## Обработка ошибок

### HTTP Status Codes

```typescript
type ApiError = {
  message: string;
  error: string;
  statusCode: number;
};

async function handleApiError(response: Response): Promise<ApiError> {
  const data = await response.json();
  return {
    message: data.message,
    error: data.error,
    statusCode: response.status
  };
}
```

### Типовые ошибки

| Status | Ошибка | Решение |
| --- | --- | --- |
| 400 | Invalid DTO | Проверить валидацию данных перед отправкой |
| 404 | Student not found | Убедиться, что studentId корректен |
| 409 | Slot already requested | Слот уже занят другим студентом |
| 409 | Only available slots can be requested | Можно запросить только доступный слот |

### Пример обработки ошибок

```typescript
try {
  const slot = await apiClient.confirmBookingSlot(slotId, data);
} catch (error) {
  if (error.statusCode === 404) {
    console.error('Слот не найден');
  } else if (error.statusCode === 409) {
    console.error('Статус слота не соответствует', error.message);
  } else {
    console.error('Неизвестная ошибка', error);
  }
}
```

## Доступные слоты для студента

### Логика фильтрации

Когда вы запрашиваете слоты с параметром `?studentId=<uuid>`, API возвращает:

1. **Все слоты, где `studentId` совпадает** - текущие и прошлые тренировки студента
2. **Или слоты с `status = 'available'`** - доступные для записи

```sql
WHERE 
  (studentId = :studentId) OR (status = 'available')
```

Это позволяет студенту видеть:
- ✅ Свои pending запросы (`requested`)
- ✅ Проведенные тренировки (`completed`)
- ✅ Перенесенные тренировки (`reschedule`)
- ✅ Подтвержденные запись (`confirmed`)
- ✅ Отмененные тренировки (`cancelled`)
- ✅ **Плюс** все доступные слоты для новой записи

### Пример использования

```typescript
// Студент видит свои тренировки + доступные для записи
const myAndAvailable = await apiClient.getBookingSlots({ 
  studentId: currentStudentId 
});

// Показать в UI:
// - Mои тренировки (фильтр: studentId = currentStudentId)
// - Доступные для записи (фильтр: status = 'available')
```

## Поток бронирования

```
Инструктор создает слот
    ↓
   [Available]
    ↓
Студент запрашивает
    ↓
  [Requested]
    ↓
Инструктор подтверждает
    ↓
  [Confirmed]
    ↓
   Тренировка  ← Возможен перенос
    ↓         ↖ POST .../reschedule
  [Reschedule]  (возвращается к Confirmed после подтверждения)
    ↓
   Выполнена
    ↓
  [Completed]
```

### Отмена на любом этапе

```
[Requested] → POST .../cancel → [Available]
[Confirmed] → POST .../cancel → [Available]
[Reschedule] → POST .../cancel → [Available]
```

## Деплой и окружения

### Sviluppo (Development)

```
Base URL: http://localhost:3000/api
Port: 3000 (или указан в PORT env)
Database: PostgreSQL (локально)
```

### Production

```
Base URL: https://api.moto-app.com/api
Database: PostgreSQL (cloud)
```

## Дополнительные ресурсы

- API документация: `API.md`
- TypeScript типы: `FRONTEND_TYPES.ts`
- Postman коллекции: `postman/`
- Seed данные: `prisma/seed.ts`

## Поддержка

При возникновении вопросов:

1. Проверь `API.md` для полной документации
2. Проверь `FRONTEND_TYPES.ts` для типизации
3. Выполни запрос в Postman и посмотри ответ
4. Проверь консоль backend'а для ошибок

