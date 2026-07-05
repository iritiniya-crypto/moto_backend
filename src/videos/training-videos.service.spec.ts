import { NotFoundException } from '@nestjs/common';
import { TrainingVideosService } from './training-videos.service';

describe('TrainingVideosService', () => {
  const prisma = {
    trainingHistory: {
      findUnique: jest.fn()
    },
    trainingVideo: {
      create: jest.fn()
    }
  };

  const service = new TrainingVideosService(prisma as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when history not found', async () => {
    prisma.trainingHistory.findUnique.mockResolvedValue(null);

    await expect(
      service.createForTrainingHistory('history-1', { telegramUrl: 'https://t.me/video' })
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates video for existing history', async () => {
    prisma.trainingHistory.findUnique.mockResolvedValue({
      id: 'history-1',
      studentId: 'student-1',
      reportId: 'report-1'
    });
    prisma.trainingVideo.create.mockResolvedValue({ id: 'video-1' });

    await service.createForTrainingHistory('history-1', {
      title: 'video',
      telegramUrl: 'https://t.me/video',
      comment: 'good'
    });

    expect(prisma.trainingVideo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentId: 'student-1',
          trainingHistoryId: 'history-1',
          reportId: 'report-1',
          notes: 'good'
        })
      })
    );
  });
});

