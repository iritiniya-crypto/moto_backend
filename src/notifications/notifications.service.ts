import { Injectable, Logger } from '@nestjs/common';

export interface TrainingCancelledNotificationPayload {
  studentName: string;
  startsAt: Date;
  durationMinutes: number;
  location?: string | null;
  slotId: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  async notifyInstructorTrainingCancelled(payload: TrainingCancelledNotificationPayload) {
    const message = [
      `${payload.studentName} отменил тренировку.`,
      `Дата: ${this.formatDate(payload.startsAt)}`,
      `Время: ${this.formatTime(payload.startsAt)}`,
      'Слот автоматически возвращен в календарь и снова доступен для записи.'
    ].join('\n');

    this.logger.log({
      type: 'instructor.training_cancelled',
      slotId: payload.slotId,
      durationMinutes: payload.durationMinutes,
      location: payload.location,
      message
    });

    return { delivered: false, provider: 'stub', message };
  }

  private formatDate(value: Date) {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      timeZone: 'Europe/Moscow'
    }).format(value);
  }

  private formatTime(value: Date) {
    return new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Moscow'
    }).format(value);
  }
}
