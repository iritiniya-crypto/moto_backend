import { TrainingVideosController } from './training-videos.controller';

describe('TrainingVideosController', () => {
  it('delegates create', () => {
    const service = { createForTrainingHistory: jest.fn() };
    const controller = new TrainingVideosController(service as any);
    const dto = { telegramUrl: 'https://t.me/video' };

    controller.create('history-1', dto as any);

    expect(service.createForTrainingHistory).toHaveBeenCalledWith('history-1', dto);
  });
});

