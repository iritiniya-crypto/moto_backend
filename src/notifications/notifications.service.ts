import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramBotService } from '../telegram/telegram-bot.service';

export interface TrainingCancelledNotificationPayload {
  studentName: string;
  telegramUsername?: string | null;
  startsAt: Date;
  durationMinutes: number;
  location?: string | null;
  slotId: string;
}

export interface BookingRequestedNotificationPayload {
  studentName: string;
  telegramUsername?: string | null;
  startsAt: Date;
  durationMinutes: number;
  location?: string | null;
  preference?: string | null;
  studentComment?: string | null;
  slotId: string;
}

export interface StudentCreatedNotificationPayload {
  studentName: string;
  telegramUsername?: string | null;
  level?: string | null;
  focus?: string | null;
  nextTrainingPlan?: string | null;
  studentId: string;
}

export interface TrainingRescheduledNotificationPayload {
  studentName: string;
  telegramUsername?: string | null;
  previousStartsAt: Date;
  startsAt: Date;
  durationMinutes: number;
  location?: string | null;
  slotId: string;
}

export interface TrainingReminderNotificationPayload {
  studentName: string;
  telegramUsername?: string | null;
  startsAt: Date;
  durationMinutes: number;
  location?: string | null;
  slotId: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Optional() private readonly telegram?: TelegramBotService,
    @Optional() private readonly config?: ConfigService
  ) {}

  async notifyInstructorBookingRequested(payload: BookingRequestedNotificationPayload) {
    const message = [
      'Новая заявка на тренировку.',
      `Ученик: ${this.formatStudent(payload.studentName, payload.telegramUsername)}`,
      `Дата: ${this.formatDate(payload.startsAt)}`,
      `Время: ${this.formatTime(payload.startsAt)}`,
      `Длительность: ${payload.durationMinutes} мин.`,
      payload.location ? `Место: ${payload.location}` : null,
      payload.preference ? `Пожелание: ${payload.preference}` : null,
      payload.studentComment ? `Комментарий: ${payload.studentComment}` : null
    ].filter(Boolean).join('\n');

    return this.deliver('instructor.booking_requested', payload.slotId, message, payload);
  }

  async notifyInstructorStudentCreated(payload: StudentCreatedNotificationPayload) {
    const message = [
      'Новый ученик.',
      `Ученик: ${this.formatStudent(payload.studentName, payload.telegramUsername)}`,
      payload.level ? `Уровень: ${payload.level}` : null,
      payload.focus ? `Фокус: ${payload.focus}` : null,
      payload.nextTrainingPlan ? `План: ${payload.nextTrainingPlan}` : null
    ].filter(Boolean).join('\n');

    return this.deliver('instructor.student_created', payload.studentId, message, payload);
  }

  async notifyInstructorTrainingRescheduled(payload: TrainingRescheduledNotificationPayload) {
    const message = [
      'Запрос на перенос тренировки.',
      `Ученик: ${this.formatStudent(payload.studentName, payload.telegramUsername)}`,
      `Было: ${this.formatDate(payload.previousStartsAt)} ${this.formatTime(payload.previousStartsAt)}`,
      `Стало: ${this.formatDate(payload.startsAt)} ${this.formatTime(payload.startsAt)}`,
      `Длительность: ${payload.durationMinutes} мин.`,
      payload.location ? `Место: ${payload.location}` : null
    ].filter(Boolean).join('\n');

    return this.deliver('instructor.training_rescheduled', payload.slotId, message, payload);
  }

  async notifyInstructorTrainingReminder(payload: TrainingReminderNotificationPayload) {
    const message = [
      'Тренировка через 1 час.',
      `Ученик: ${this.formatStudent(payload.studentName, payload.telegramUsername)}`,
      `Время: ${this.formatDate(payload.startsAt)} ${this.formatTime(payload.startsAt)}`,
      `Длительность: ${payload.durationMinutes} мин.`,
      payload.location ? `Место: ${payload.location}` : null
    ].filter(Boolean).join('\n');

    return this.deliver('instructor.training_reminder_1h', payload.slotId, message, payload);
  }

  async notifyInstructorTrainingCancelled(payload: TrainingCancelledNotificationPayload) {
    const message = [
      `${payload.studentName} отменил тренировку.`,
      payload.telegramUsername ? `Telegram: @${payload.telegramUsername}` : null,
      `Дата: ${this.formatDate(payload.startsAt)}`,
      `Время: ${this.formatTime(payload.startsAt)}`,
      payload.location ? `Место: ${payload.location}` : null,
      'Слот автоматически возвращен в календарь и снова доступен для записи.'
    ].filter(Boolean).join('\n');

    return this.deliver('instructor.training_cancelled', payload.slotId, message, payload);
  }

  private async deliver(type: string, entityId: string, message: string, payload: unknown) {
    this.logger.log({
      type,
      entityId,
      payload,
      message
    });

    if (!this.telegram) {
      return { delivered: false, provider: 'stub', message };
    }

    const delivery = await this.telegram.sendInstructorMessage(message);

    return { ...delivery, message };
  }

  private formatDate(value: Date) {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      timeZone: this.timeZone()
    }).format(value);
  }

  private formatTime(value: Date) {
    return new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: this.timeZone()
    }).format(value);
  }

  private formatStudent(name: string, telegramUsername?: string | null) {
    return telegramUsername ? `${name} (@${telegramUsername})` : name;
  }

  private timeZone() {
    return this.config?.get<string>('TELEGRAM_NOTIFICATIONS_TIME_ZONE', 'Asia/Ho_Chi_Minh') ?? 'Asia/Ho_Chi_Minh';
  }
}
