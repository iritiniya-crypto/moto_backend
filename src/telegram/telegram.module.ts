import { Module } from '@nestjs/common';
import { TelegramApiService } from './telegram-api.service';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramController } from './telegram.controller';

@Module({
  controllers: [TelegramController],
  providers: [TelegramApiService, TelegramBotService],
  exports: [TelegramApiService, TelegramBotService]
})
export class TelegramModule {}
