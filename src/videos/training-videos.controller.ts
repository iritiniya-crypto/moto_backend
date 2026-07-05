import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CreateTrainingVideoDto } from './dto/create-training-video.dto';
import { TrainingVideosService } from './training-videos.service';

@Controller('training-history/:historyId/videos')
export class TrainingVideosController {
  constructor(private readonly trainingVideosService: TrainingVideosService) {}

  @Post()
  create(@Param('historyId', ParseUUIDPipe) historyId: string, @Body() dto: CreateTrainingVideoDto) {
    return this.trainingVideosService.createForTrainingHistory(historyId, dto);
  }
}
