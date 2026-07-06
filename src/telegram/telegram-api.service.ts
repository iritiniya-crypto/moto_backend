import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramApiResponse, TelegramMessage, TelegramSendMessageOptions } from './telegram.types';

@Injectable()
export class TelegramApiService {
  private readonly logger = new Logger(TelegramApiService.name);
  private readonly botToken: string;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN', '');
    this.enabled = this.config.get<boolean>('TELEGRAM_ENABLED', false);
  }

  getStatus() {
    return {
      enabled: this.enabled,
      configured: this.isConfigured()
    };
  }

  isConfigured() {
    return this.enabled && Boolean(this.botToken);
  }

  async sendMessage(chatId: string | number, text: string, options: TelegramSendMessageOptions = {}) {
    if (!this.isConfigured()) {
      this.logger.warn('Telegram bot is disabled or TELEGRAM_BOT_TOKEN is not configured');
      return { delivered: false, provider: 'telegram', reason: 'not_configured' };
    }

    const response = await this.call<TelegramMessage>('sendMessage', {
      chat_id: chatId,
      text,
      disable_web_page_preview: options.disableWebPagePreview ?? true,
      reply_markup: options.replyMarkup
    });

    return { delivered: response.ok, provider: 'telegram', response };
  }

  private async call<T>(method: string, payload: Record<string, unknown>) {
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
