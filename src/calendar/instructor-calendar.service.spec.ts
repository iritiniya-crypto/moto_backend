import { InstructorCalendarService } from './instructor-calendar.service';

describe('InstructorCalendarService', () => {
  it('returns booking slots with fixed include shape', async () => {
    const prisma = {
      bookingSlot: {
        findMany: jest.fn().mockResolvedValue([])
      }
    };

    const service = new InstructorCalendarService(prisma as any);
    await service.findAll();

    expect(prisma.bookingSlot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          startsAt: {
            gte: expect.any(Date)
          }
        },
        orderBy: { startsAt: 'asc' },
        include: expect.any(Object)
      })
    );
  });
});
