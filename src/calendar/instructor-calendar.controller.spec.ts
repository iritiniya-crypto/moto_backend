import { InstructorCalendarController } from './instructor-calendar.controller';

describe('InstructorCalendarController', () => {
  it('delegates findAll', () => {
    const service = { findAll: jest.fn() };
    const controller = new InstructorCalendarController(service as any);

    controller.findAll();

    expect(service.findAll).toHaveBeenCalled();
  });
});

