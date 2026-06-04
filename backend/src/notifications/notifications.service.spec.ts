import { Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  it('formats cancellation message and logs payload', async () => {
    const loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const service = new NotificationsService();

    const result = await service.notifyInstructorTrainingCancelled({
      studentName: 'Иван',
      startsAt: new Date('2026-06-01T10:00:00.000Z'),
      durationMinutes: 90,
      location: 'Площадка',
      slotId: 'slot-1'
    });

    expect(result.delivered).toBe(false);
    expect(result.provider).toBe('stub');
    expect(result.message).toContain('Иван отменил тренировку.');
    expect(result.message).toContain('Слот автоматически возвращен в календарь и снова доступен для записи.');
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'instructor.training_cancelled',
        slotId: 'slot-1',
        durationMinutes: 90,
        location: 'Площадка'
      })
    );

    loggerSpy.mockRestore();
  });
});

