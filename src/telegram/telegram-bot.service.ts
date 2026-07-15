import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramApiService } from './telegram-api.service';
import { TelegramMessage, TelegramUpdate } from './telegram.types';

@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name);
  private readonly miniAppUrl: string;
  private readonly instructorChatId: string;

  constructor(
    private readonly config: ConfigService,
    private readonly telegramApi: TelegramApiService
  ) {
    this.miniAppUrl = this.config.get<string>('TELEGRAM_MINI_APP_URL', '');
    this.instructorChatId = this.config.get<string>('TELEGRAM_INSTRUCTOR_CHAT_ID', '');
  }

  getStatus() {
    return {
      ...this.telegramApi.getStatus(),
      miniAppConfigured: Boolean(this.miniAppUrl),
      instructorChatConfigured: Boolean(this.instructorChatId)
    };
  }

  async handleUpdate(update: TelegramUpdate) {
    const message = update.message;

    if (!message?.text) {
      return { handled: false };
    }

    if (message.text.startsWith('/start')) {
      await this.sendMiniAppEntry(message);
      return { handled: true };
    }

    if (message.text.startsWith('/chat_id')) {
      await this.sendChatId(message);
      return { handled: true };
    }

    return { handled: false };
  }

  async sendInstructorMessage(text: string) {
    if (!this.instructorChatId) {
      this.logger.warn('TELEGRAM_INSTRUCTOR_CHAT_ID is not configured');
      return { delivered: false, provider: 'telegram', reason: 'missing_instructor_chat_id' };
    }

    return this.telegramApi.sendMessage(this.instructorChatId, text);
  }

  async sendMessageToChat(chatId: string | number, text: string) {
    return this.telegramApi.sendMessage(chatId, text);
  }

  private async sendMiniAppEntry(message: TelegramMessage) {
    const replyMarkup = this.miniAppUrl
      ? {
          inline_keyboard: [
            [
              {
                text: 'Открыть запись на тренировки',
                web_app: { url: this.miniAppUrl }
              }
            ]
          ]
        }
      : undefined;

    const text = this.miniAppUrl
      ? 'Привет! Нажми кнопку ниже, чтобы открыть запись на мототренировки.'
      : 'Привет! Mini App URL пока не настроен на сервере.';

    return this.telegramApi.sendMessage(message.chat.id, text, { replyMarkup });
  }

  private async sendChatId(message: TelegramMessage) {
    const lines = [
      `chat_id: ${message.chat.id}`,
      message.chat.type ? `chat_type: ${message.chat.type}` : null,
      message.from?.id ? `user_id: ${message.from.id}` : null,
      message.from?.username ? `username: @${message.from.username}` : null
    ].filter(Boolean);

    return this.telegramApi.sendMessage(message.chat.id, lines.join('\n'));
  }
}
