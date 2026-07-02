/**
 * Frontend TypeScript Types для Moto Mini App Backend
 *
 * Используй эти типы для типизации фронтенда
 * Дата обновления: 04 июня 2026
 */

// ============================================
// Domain Enums
// ============================================

export type StudentLevel = 'BEGINNER' | 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
export type BookingSlotStatus = 'available' | 'requested' | 'reschedule' | 'confirmed' | 'completed' | 'cancelled';
export type TrainingPackagePaymentStatus = 'unpaid' | 'paid' | 'partial';
export type TrainingPackageStatus = 'active' | 'completed' | 'cancelled';
export type TrainingPackageType = 'scooter' | 'motorcycle' | 'gymkhana';
export type UserRole = 'STUDENT' | 'INSTRUCTOR';

// ============================================
// Entity Types
// ============================================

export interface User {
  id: string;
  telegramId?: string;
  telegramUsername: string;
  displayName: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface Skill {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: string;
  userId: string;
  name: string;
  telegramUsername: string;
  level: StudentLevel;
  focus?: string;
  nextTrainingPlan?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  user: User;
  packages: TrainingPackage[];
  skills: StudentSkill[];
}

export interface StudentProfile extends Student {
  trainingHistory: TrainingHistory[];
  videos: TrainingVideo[];
}

export interface TrainingPackage {
  id: string;
  studentId: string;
  type: TrainingPackageType;
  name: 'Скутер' | 'Мотоцикл' | 'Джимхана';
  totalTrainings: number;
  completedTrainings: number;
  paymentStatus: TrainingPackagePaymentStatus;
  startedAt: string;
  endedAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentSkill {
  skillId: string;
  progressPercent: number;
  skill: {
    id: string;
    name: string;
    description?: string;
  };
}

export interface BookingSlot {
  id: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
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
    activePackage?: TrainingPackage | null;
    package?: TrainingPackage | null;
    packages?: TrainingPackage[];
  };
  instructor?: {
    id: string;
    displayName: string;
    telegramUsername: string;
    role: UserRole;
  };
  requestedBy?: {
    id: string;
    displayName: string;
    telegramUsername: string;
    role: UserRole;
  };
  report?: TrainingReport | null;
  trainingRecord?: TrainingHistory | null;
}

export interface TrainingReport {
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

export interface TrainingHistory {
  id: string;
  studentId: string;
  bookingSlotId?: string | null;
  reportId?: string | null;
  trainedAt: string;
  summary: string;
  videos: TrainingVideo[];
  report?: TrainingReport | null;
  bookingSlot?: {
    id: string;
    status: BookingSlotStatus;
  } | null;
}

export interface TrainingVideo {
  id: string;
  studentId: string;
  trainingHistoryId: string;
  reportId?: string;
  telegramUrl: string;
  title?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstructorCalendarEvent {
  id: string;
  startsAt: string;
  endsAt: string;
  status: BookingSlotStatus;
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
  };
  calendarEvents: any[];
  report?: TrainingReport | null;
}

// ============================================
// Request/Command Types (для фронтенда)
// ============================================

export interface CreateStudentRequest {
  name: string;
  telegramUsername?: string;
  level: StudentLevel;
  focus?: string;
  nextTrainingPlan?: string;
}

export interface UpdateStudentRequest {
  name?: string;
  telegramUsername?: string;
  level?: StudentLevel;
  focus?: string;
  nextTrainingPlan?: string;
}

export interface FindBookingSlotsQuery {
  status?: BookingSlotStatus;
  studentId?: string;
}

export interface CreateBookingSlotRequest {
  startsAt: string;
  durationMinutes: number;
}

export interface UpdateBookingSlotRequest {
  startsAt?: string;
  durationMinutes?: number;
  title?: string;
  location?: string;
  notes?: string;
}

export interface RequestBookingSlotRequest {
  studentId: string;
  preference?: string;
  studentComment?: string;
}

export interface ConfirmBookingSlotRequest {
  finalLocation?: string;
  finalLocationUrl?: string;
  instructorComment?: string;
}

export interface RescheduleBookingSlotRequest {
  startsAt: string;
  durationMinutes: number;
  instructorComment?: string;
}

export interface CancelBookingSlotRequest {
  reason?: string;
}

export interface UpsertTrainingPackageRequest {
  type?: TrainingPackageType;
  name?: 'Скутер' | 'Мотоцикл' | 'Джимхана';
  totalTrainings: number;
  completedTrainings: number;
  paymentStatus: TrainingPackagePaymentStatus;
  startedAt?: string;
  endedAt?: string;
  isActive: boolean;
}

export interface UpsertStudentSkillRequest {
  skillId: string;
  progressPercent: number;
}

export interface CreateTrainingReportRequest {
  slotId: string;
  studentId: string;
  trainedSkills: string[];
  improved: string;
  nextFocus: string;
  levelUpdate?: StudentLevel;
}

export interface CreateTrainingVideoRequest {
  title?: string;
  telegramUrl: string;
  comment?: string;
}

export interface CreateManualTrainingHistoryRequest {
  trainedAt?: string;
  summary?: string;
}

// ============================================
// Response Types
// ============================================

export interface ApiHealthResponse {
  status: 'ok';
  service: string;
}

export interface DeleteResponse {
  deleted: boolean;
  id: string;
}

export interface CreateTrainingReportResponse {
  report: TrainingReport;
  trainingHistory: TrainingHistory;
  slot: {
    id: string;
    status: BookingSlotStatus;
  };
  student: {
    id: string;
    level: StudentLevel;
  };
}

// ============================================
// API Client Constants
// ============================================

export const API_BASE_URL = 'http://localhost:3000/api';

export const BOOKING_SLOT_STATUSES = [
  'available',
  'requested',
  'reschedule',
  'confirmed',
  'completed',
  'cancelled'
] as const;

export const STUDENT_LEVELS = [
  'BEGINNER',
  'BASIC',
  'INTERMEDIATE',
  'ADVANCED'
] as const;

export const PAYMENT_STATUSES = [
  'unpaid',
  'paid',
  'partial'
] as const;

export const SEED_SKILLS = [
  'Овал',
  'Восьмерка',
  'Змейка',
  'Торможение',
  'Развороты',
  'Медленная езда',
  'Взгляд',
  'Город'
] as const;

// ============================================
// API Endpoints
// ============================================

export const API_ENDPOINTS = {
  // Health
  HEALTH: '/health',

  // Students
  STUDENTS: '/students',
  STUDENT_PROFILE: (id: string) => `/students/${id}/profile`,
  STUDENT_UPDATE: (id: string) => `/students/${id}`,
  STUDENT_PACKAGE: (studentId: string) => `/students/${studentId}/package`,
  STUDENT_SKILLS: (studentId: string) => `/students/${studentId}/skills`,
  MANUAL_TRAINING_HISTORY: (studentId: string) => `/students/${studentId}/training-history/manual`,

  // Skills
  SKILLS: '/skills',

  // Booking Slots
  BOOKING_SLOTS: '/booking-slots',
  BOOKING_SLOT: (id: string) => `/booking-slots/${id}`,
  BOOKING_SLOT_REQUEST: (id: string) => `/booking-slots/${id}/request`,
  BOOKING_SLOT_CONFIRM: (id: string) => `/booking-slots/${id}/confirm`,
  BOOKING_SLOT_RESCHEDULE: (id: string) => `/booking-slots/${id}/reschedule`,
  BOOKING_SLOT_DECLINE: (id: string) => `/booking-slots/${id}/decline`,
  BOOKING_SLOT_CANCEL: (id: string) => `/booking-slots/${id}/cancel`,

  // Instructor Calendar
  INSTRUCTOR_CALENDAR: '/instructor/calendar',

  // Training Reports
  TRAINING_REPORTS: '/training-reports',

  // Training Videos
  TRAINING_VIDEO: (historyId: string) => `/training-history/${historyId}/videos`
} as const;

// ============================================
// Validation Rules
// ============================================

export const VALIDATION_RULES = {
  STUDENT_NAME_MAX_LENGTH: 120,
  TELEGRAM_USERNAME_MAX_LENGTH: 120,
  BOOKING_SLOT_DURATION_MIN: 15,
  BOOKING_SLOT_DURATION_MAX: 600,
  TRAINING_PACKAGE_TOTAL_MAX: 1000,
  TRAINING_PACKAGE_COMPLETED_MAX: 1000,
  SKILL_PROGRESS_MIN: 0,
  SKILL_PROGRESS_MAX: 100
} as const;

// ============================================
// Helper Functions
// ============================================

/**
 * Проверить, может ли статус слота быть отмечен как завершённый
 */
export function canCancelBookingSlot(status: BookingSlotStatus): boolean {
  return ['requested', 'reschedule', 'confirmed'].includes(status);
}

/**
 * Проверить, может ли слот быть отредактирован
 */
export function canEditBookingSlot(status: BookingSlotStatus): boolean {
  return status === 'available';
}

/**
 * Проверить, может ли слот быть запрошен
 */
export function canRequestBookingSlot(status: BookingSlotStatus): boolean {
  return status === 'available';
}

/**
 * Проверить, может ли слот быть подтвержден
 */
export function canConfirmBookingSlot(status: BookingSlotStatus): boolean {
  return ['requested', 'reschedule'].includes(status);
}

/**
 * Проверить, может ли слот быть перенесен
 */
export function canRescheduleBookingSlot(status: BookingSlotStatus): boolean {
  return status === 'confirmed';
}

/**
 * Общее количество оставшихся тренировок в пакете
 */
export function getRemainingTrainings(pkg: TrainingPackage): number {
  return pkg.totalTrainings - pkg.completedTrainings;
}

/**
 * Процент использованных тренировок
 */
export function getPackageUsagePercent(pkg: TrainingPackage): number {
  if (pkg.totalTrainings === 0) return 0;
  return Math.round((pkg.completedTrainings / pkg.totalTrainings) * 100);
}

/**
 * Преобразовать массив навыков в строку (для отправки в отчет)
 */
export function skillsArrayToString(skills: string[]): string {
  return skills.join(', ');
}

/**
 * Преобразовать строку навыков в массив
 */
export function skillsStringToArray(skillsStr: string): string[] {
  return skillsStr.split(',').map(s => s.trim());
}
