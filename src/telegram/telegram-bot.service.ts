import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TelegramApiResponse,
  TelegramMessage,
  TelegramSendMessageOptions,
  TelegramUpdate
} from './telegram.types';

@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name);
  private readonly botToken: string;
  private readonly enabled: boolean;
  private readonly miniAppUrl: string;
  private readonly instructorChatId: string;

  constructor(private readonly config: ConfigService) {
    this.botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN', '');
    this.enabled = this.config.get<boolean>('TELEGRAM_ENABLED', false);
    this.miniAppUrl = this.config.get<string>('TELEGRAM_MINI_APP_URL', '');
    this.instructorChatId = this.config.get<string>('TELEGRAM_INSTRUCTOR_CHAT_ID', '');
  }

  getStatus() {
    return {
      enabled: this.enabled,
      configured: this.isConfigured(),
      miniAppConfigured: Boolean(this.miniAppUrl),
      instructorChatConfigured: Boolean(this.instructorChatId)
    };
  }

  isConfigured() {
    return this.enabled && Boolean(this.botToken);
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

    return { handled: false };
  }

  async sendInstructorMessage(text: string) {
    if (!this.instructorChatId) {
      this.logger.warn('TELEGRAM_INSTRUCTOR_CHAT_ID is not configured');
      return { delivered: false, provider: 'telegram', reason: 'missing_instructor_chat_id' };
    }

    return this.sendMessage(this.instructorChatId, text);
  }

  async sendMessage(chatId: string | number, text: string, options: TelegramSendMessageOptions = {}) {
    if (!this.isConfigured()) {
      this.logger.warn('Telegram bot is disabled or TELEGRAM_BOT_TOKEN is not configured');
      return { delivered: false, provider: 'telegram', reason: 'not_configured' };
    }

    const response = await this.callTelegramApi<TelegramMessage>('sendMessage', {
      chat_id: chatId,
      text,
      disable_web_page_preview: options.disableWebPagePreview ?? true,
      reply_markup: options.replyMarkup
    });

    return { delivered: response.ok, provider: 'telegram', response };
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

    return this.sendMessage(message.chat.id, text, { replyMarkup });
  }

  private async callTelegramApi<T>(method: string, payload: Record<string, unknown>) {
    const response = await fetch(`https://api.telegram.org/bot${this.botToken}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = (await response.json()) as TelegramApiResponse<T>;

    if (!response.ok || !data.ok) {
      this.logger.error({
        method,
        status: response.status,
        description: data.description
      });
    }

    return data;
  }
}
