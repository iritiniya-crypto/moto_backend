import { StudentsController } from './students.controller';

describe('StudentsController', () => {
  const service = {
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findProfile: jest.fn(),
    findPackage: jest.fn(),
    upsertPackage: jest.fn(),
    findSkills: jest.fn(),
    upsertSkills: jest.fn(),
    createManualTrainingHistory: jest.fn()
  };

  const controller = new StudentsController(service as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates findAll', () => {
    controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
  });

  it('delegates create', () => {
    const dto = { name: 'Ivan', level: 'BEGINNER' };
    controller.create(dto as any);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('delegates update', () => {
    const dto = { name: 'Updated' };
    controller.update('student-1', dto as any);
    expect(service.update).toHaveBeenCalledWith('student-1', dto);
  });

  it('delegates findProfile', () => {
    controller.findProfile('student-1');
    expect(service.findProfile).toHaveBeenCalledWith('student-1');
  });

  it('delegates findPackage', () => {
    controller.findPackage('student-1');
    expect(service.findPackage).toHaveBeenCalledWith('student-1');
  });

  it('delegates upsertPackage', () => {
    const dto = { totalTrainings: 5, completedTrainings: 1, paymentStatus: 'paid', isActive: true };
    controller.upsertPackage('student-1', dto as any);
    expect(service.upsertPackage).toHaveBeenCalledWith('student-1', dto);
  });

  it('delegates findSkills', () => {
    controller.findSkills('student-1');
    expect(service.findSkills).toHaveBeenCalledWith('student-1');
  });

  it('delegates upsertSkills', () => {
    const dto = [{ skillId: 'skill-1', progressPercent: 80 }];
    controller.upsertSkills('student-1', dto as any);
    expect(service.upsertSkills).toHaveBeenCalledWith('student-1', dto);
  });

  it('delegates createManualTrainingHistory', () => {
    const dto = { summary: 'manual' };
    controller.createManualTrainingHistory('student-1', dto as any);
    expect(service.createManualTrainingHistory).toHaveBeenCalledWith('student-1', dto);
  });
});

