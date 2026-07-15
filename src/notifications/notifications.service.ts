import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramBotService } from '../telegram/telegram-bot.service';

type NotificationRecipientRoleValue = 'instructor' | 'student';
type NotificationChannelValue = 'internal' | 'telegram';

export interface TrainingCancelledNotificationPayload {
  studentName: string;
  telegramUsername?: string | null;
  startsAt: Date;
  durationMinutes: number;
  location?: string | null;
  slotId: string;
  studentId?: string | null;
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
  studentId?: string | null;
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
  studentId?: string | null;
}

export interface TrainingReminderNotificationPayload {
  studentName: string;
  telegramUsername?: string | null;
  startsAt: Date;
  durationMinutes: number;
  location?: string | null;
  slotId: string;
  studentId?: string | null;
  studentTelegramChatId?: string | null;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly telegram?: TelegramBotService,
    @Optional() private readonly config?: ConfigService
  ) {}

  async notifyInstructorBookingRequested(payload: BookingRequestedNotificationPayload) {
    const title = 'Новая заявка на тренировку';
    const message = [
      title,
      `Ученик: ${this.formatStudent(payload.studentName, payload.telegramUsername)}`,
      `Дата: ${this.formatDate(payload.startsAt)}`,
      `Время: ${this.formatTime(payload.startsAt)}`,
      `Длительность: ${payload.durationMinutes} мин.`,
      payload.location ? `Место: ${payload.location}` : null,
      payload.preference ? `Пожелание: ${payload.preference}` : null,
      payload.studentComment ? `Комментарий: ${payload.studentComment}` : null
    ].filter(Boolean).join('\n');

    return this.deliver({
      type: 'instructor.booking_requested',
      title,
      recipientRole: 'instructor',
      entityId: payload.slotId,
      bookingSlotId: payload.slotId,
      studentId: payload.studentId,
      message,
      payload
    });
  }

  async notifyInstructorStudentCreated(payload: StudentCreatedNotificationPayload) {
    const title = 'Новый ученик';
    const message = [
      title,
      `Ученик: ${this.formatStudent(payload.studentName, payload.telegramUsername)}`,
      payload.level ? `Уровень: ${payload.level}` : null,
      payload.focus ? `Фокус: ${payload.focus}` : null,
      payload.nextTrainingPlan ? `План: ${payload.nextTrainingPlan}` : null
    ].filter(Boolean).join('\n');

    return this.deliver({
      type: 'instructor.student_created',
      title,
      recipientRole: 'instructor',
      entityId: payload.studentId,
      studentId: payload.studentId,
      message,
      payload
    });
  }

  async notifyInstructorTrainingRescheduled(payload: TrainingRescheduledNotificationPayload) {
    const title = 'Запрос на перенос тренировки';
    const message = [
      title,
      `Ученик: ${this.formatStudent(payload.studentName, payload.telegramUsername)}`,
      `Было: ${this.formatDate(payload.previousStartsAt)} ${this.formatTime(payload.previousStartsAt)}`,
      `Стало: ${this.formatDate(payload.startsAt)} ${this.formatTime(payload.startsAt)}`,
      `Длительность: ${payload.durationMinutes} мин.`,
      payload.location ? `Место: ${payload.location}` : null
    ].filter(Boolean).join('\n');

    return this.deliver({
      type: 'instructor.training_rescheduled',
      title,
      recipientRole: 'instructor',
      entityId: payload.slotId,
      bookingSlotId: payload.slotId,
      studentId: payload.studentId,
      message,
      payload
    });
  }

  async notifyInstructorTrainingReminder(payload: TrainingReminderNotificationPayload) {
    const title = 'Тренировка через 1 час';
    const message = [
      title,
      `Ученик: ${this.formatStudent(payload.studentName, payload.telegramUsername)}`,
      `Время: ${this.formatDate(payload.startsAt)} ${this.formatTime(payload.startsAt)}`,
      `Длительность: ${payload.durationMinutes} мин.`,
      payload.location ? `Место: ${payload.location}` : null
    ].filter(Boolean).join('\n');

    return this.deliver({
      type: 'instructor.training_reminder_1h',
      title,
      recipientRole: 'instructor',
      entityId: payload.slotId,
      bookingSlotId: payload.slotId,
      studentId: payload.studentId,
      message,
      payload,
      dedupeBySlotAndRecipient: true
    });
  }

  async notifyStudentTrainingReminder(payload: TrainingReminderNotificationPayload) {
    const title = 'Тренировка через 1 час';
    const message = [
      title,
      `Время: ${this.formatDate(payload.startsAt)} ${this.formatTime(payload.startsAt)}`,
      `Длительность: ${payload.durationMinutes} мин.`,
      payload.location ? `Место: ${payload.location}` : null
    ].filter(Boolean).join('\n');

    return this.deliver({
      type: 'student.training_reminder_1h',
      title,
      recipientRole: 'student',
      recipientTelegramChatId: payload.studentTelegramChatId,
      entityId: payload.slotId,
      bookingSlotId: payload.slotId,
      studentId: payload.studentId,
      message,
      payload,
      dedupeBySlotAndRecipient: true
    });
  }

  async notifyInstructorTrainingCancelled(payload: TrainingCancelledNotificationPayload) {
    const title = 'Тренировка отменена';
    const message = [
      `${payload.studentName} отменил тренировку.`,
      payload.telegramUsername ? `Telegram: @${payload.telegramUsername}` : null,
      `Дата: ${this.formatDate(payload.startsAt)}`,
      `Время: ${this.formatTime(payload.startsAt)}`,
      payload.location ? `Место: ${payload.location}` : null,
      'Слот автоматически возвращен в календарь и снова доступен для записи.'
    ].filter(Boolean).join('\n');

    return this.deliver({
      type: 'instructor.training_cancelled',
      title,
      recipientRole: 'instructor',
      entityId: payload.slotId,
      bookingSlotId: payload.slotId,
      studentId: payload.studentId,
      message,
      payload
    });
  }

  private async deliver(input: {
    type: string;
    title: string;
    recipientRole: NotificationRecipientRoleValue;
    entityId: string;
    message: string;
    payload: unknown;
    bookingSlotId?: string | null;
    studentId?: string | null;
    recipientTelegramChatId?: string | null;
    dedupeBySlotAndRecipient?: boolean;
  }) {
    this.logger.log({
      type: input.type,
      entityId: input.entityId,
      payload: input.payload,
      message: input.message
    });

    const telegramTarget = this.resolveTelegramTarget(input);
    const feedItem = await this.createFeedItem(input, telegramTarget ? 'telegram' : 'internal');
    const notification = feedItem.notification;

    if (!telegramTarget || !this.telegram || !feedItem.created) {
      return { delivered: false, provider: 'database', message: input.message, notification };
    }

    try {
      const delivery = telegramTarget === 'instructor'
        ? await this.telegram.sendInstructorMessage(input.message)
        : await this.telegram.sendMessageToChat(telegramTarget, input.message);

      const sent = Boolean(delivery.delivered);
      const updatedNotification = await this.updateDeliveryStatus(notification?.id, sent ? 'sent' : 'failed');

      return {
        ...delivery,
        message: input.message,
        notification: updatedNotification ?? notification
      };
    } catch (error) {
      this.logger.error('Failed to deliver Telegram notification', error);
      const updatedNotification = await this.updateDeliveryStatus(notification?.id, 'failed');

      return {
        delivered: false,
        provider: 'telegram',
        error,
        message: input.message,
        notification: updatedNotification ?? notification
      };
    }
  }

  private resolveTelegramTarget(input: {
    recipientRole: NotificationRecipientRoleValue;
    recipientTelegramChatId?: string | null;
  }) {
    if (!this.telegram?.getStatus().configured) {
      return null;
    }

    if (input.recipientRole === 'instructor') {
      return this.telegram.getStatus().instructorChatConfigured ? 'instructor' : null;
    }

    return input.recipientTelegramChatId ?? null;
  }

  private async createFeedItem(input: {
    type: string;
    title: string;
    recipientRole: NotificationRecipientRoleValue;
    message: string;
    payload: unknown;
    bookingSlotId?: string | null;
    studentId?: string | null;
    recipientTelegramChatId?: string | null;
    dedupeBySlotAndRecipient?: boolean;
  }, channel: NotificationChannelValue) {
    if (!this.prisma) {
      return { notification: undefined, created: false };
    }

    try {
      if (input.dedupeBySlotAndRecipient && input.bookingSlotId) {
        const existing = await this.prisma.notification.findFirst({
          where: {
            type: input.type,
            bookingSlotId: input.bookingSlotId,
            recipientRole: input.recipientRole
          }
        });

        if (existing) {
          return { notification: existing, created: false };
        }
      }

      const notification = await this.prisma.notification.create({
        data: {
          type: input.type,
          recipientRole: input.recipientRole,
          recipientTelegramChatId: input.recipientTelegramChatId,
          studentId: input.studentId,
          bookingSlotId: input.bookingSlotId,
          title: input.title,
          message: input.message,
          payload: input.payload as object,
          channel,
          status: 'pending'
        }
      });

      return { notification, created: true };
    } catch (error) {
      this.logger.error('Failed to create notification feed item', error);
      return { notification: undefined, created: false };
    }

  }

  private async updateDeliveryStatus(notificationId: string | undefined, status: 'sent' | 'failed') {
    if (!this.prisma || !notificationId) {
      return undefined;
    }

    try {
      return await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status,
          sentAt: status === 'sent' ? new Date() : null
        }
      });
    } catch (error) {
      this.logger.error('Failed to update notification delivery status', error);
      return undefined;
    }
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
