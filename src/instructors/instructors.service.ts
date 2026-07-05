import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InstructorsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.instructor.findMany({
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ],
      include: this.studentsInclude()
    });
  }

  async findProfile(id: string) {
    const instructor = await this.prisma.instructor.findUnique({
      where: { id },
      include: this.studentsInclude()
    });

    if (!instructor) {
      throw new NotFoundException(`Instructor ${id} was not found`);
    }

    return instructor;
  }

  private studentsInclude() {
    return {
      students: {
        orderBy: { createdAt: 'asc' as const },
        select: {
          id: true,
          name: true,
          telegramUsername: true,
          level: true,
          createdAt: true,
          updatedAt: true
        }
      }
    };
  }
}

