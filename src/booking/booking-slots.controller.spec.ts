import { BookingSlotsController } from './booking-slots.controller';

describe('BookingSlotsController', () => {
  const service = {
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    request: jest.fn(),
    confirm: jest.fn(),
    reschedule: jest.fn(),
    decline: jest.fn(),
    cancel: jest.fn()
  };

  const controller = new BookingSlotsController(service as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates findAll', () => {
    const query = { status: 'available' };
    controller.findAll(query as any);
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('delegates create', () => {
    const dto = { startsAt: '2026-01-01T10:00:00.000Z', durationMinutes: 60 };
    controller.create(dto as any);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('delegates update', () => {
    const dto = { title: 'slot' };
    controller.update('slot-1', dto as any);
    expect(service.update).toHaveBeenCalledWith('slot-1', dto);
  });

  it('delegates remove', () => {
    controller.remove('slot-1');
    expect(service.remove).toHaveBeenCalledWith('slot-1');
  });

  it('delegates request', () => {
    const dto = { studentId: 'student-1' };
    controller.request('slot-1', dto as any);
    expect(service.request).toHaveBeenCalledWith('slot-1', dto);
  });

  it('delegates confirm', () => {
    const dto = { finalLocation: 'place' };
    controller.confirm('slot-1', dto as any);
    expect(service.confirm).toHaveBeenCalledWith('slot-1', dto);
  });

  it('delegates reschedule', () => {
    const dto = { startsAt: '2026-01-01T12:00:00.000Z', durationMinutes: 90 };
    controller.reschedule('slot-1', dto as any);
    expect(service.reschedule).toHaveBeenCalledWith('slot-1', dto);
  });

  it('delegates decline', () => {
    controller.decline('slot-1');
    expect(service.decline).toHaveBeenCalledWith('slot-1');
  });

  it('delegates cancel', () => {
    const dto = { reason: 'x' };
    controller.cancel('slot-1', dto as any);
    expect(service.cancel).toHaveBeenCalledWith('slot-1', dto);
  });
});

