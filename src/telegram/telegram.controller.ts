import { Body, Controller, ForbiddenException, Get, Param, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramUpdate } from './telegram.types';

@Controller('telegram')
export class TelegramController {
  constructor(
    private readonly bot: TelegramBotService,
    private readonly config: ConfigService
  ) {}

  @Get('status')
  getStatus() {
    return this.bot.getStatus();
  }

  @Post('webhook/:secret')
  async handleWebhook(@Param('secret') secret: string, @Body() update: TelegramUpdate) {
    const expectedSecret = this.config.get<string>('TELEGRAM_WEBHOOK_SECRET', '');

    if (expectedSecret && secret !== expectedSecret) {
      throw new ForbiddenException('Invalid Telegram webhook secret');
    }

    const result = await this.bot.handleUpdate(update);

    return { ok: true, ...result };
  }
}
