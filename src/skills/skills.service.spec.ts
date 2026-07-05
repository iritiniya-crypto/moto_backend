import { SkillsService } from './skills.service';

describe('SkillsService', () => {
  it('returns skills ordered by name asc', async () => {
    const prisma = {
      skill: {
        findMany: jest.fn().mockResolvedValue([])
      }
    };

    const service = new SkillsService(prisma as any);
    await service.findAll();

    expect(prisma.skill.findMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' }
    });
  });
});

