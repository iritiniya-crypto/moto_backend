import { TrainingReportsController } from './training-reports.controller';

describe('TrainingReportsController', () => {
  it('delegates create', () => {
    const service = { create: jest.fn() };
    const controller = new TrainingReportsController(service as any);
    const dto = {
      slotId: 'slot-1',
      studentId: 'student-1',
      trainedSkills: ['Овал'],
      improved: 'ok',
      nextFocus: 'focus'
    };

    controller.create(dto as any);

    expect(service.create).toHaveBeenCalledWith(dto);
  });
});

