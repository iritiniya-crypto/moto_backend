import { SkillsController } from './skills.controller';

describe('SkillsController', () => {
  it('delegates findAll', () => {
    const service = { findAll: jest.fn() };
    const controller = new SkillsController(service as any);

    controller.findAll();

    expect(service.findAll).toHaveBeenCalled();
  });
});

