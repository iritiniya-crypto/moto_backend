import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrainingVideoDto } from './dto/create-training-video.dto';

@Injectable()
export class TrainingVideosService {
  constructor(private readonly prisma: PrismaService) {}

  async createForTrainingHistory(historyId: string, dto: CreateTrainingVideoDto) {
    const history = await this.prisma.trainingHistory.findUnique({
      where: { id: historyId }
    });

    if (!history) {
      throw new NotFoundException(`Training history ${historyId} was not found`);
    }

    return this.prisma.trainingVideo.create({
      data: {
        studentId: history.studentId,
        trainingHistoryId: history.id,
        reportId: history.reportId,
        title: dto.title,
        telegramUrl: dto.telegramUrl,
        notes: dto.comment
      }
    });
  }
}
