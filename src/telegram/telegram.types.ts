export interface TelegramChat {
  id: number;
  type?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramMessage {
  message_id: number;
  text?: string;
  chat: TelegramChat;
  from?: {
    id: number;
    is_bot: boolean;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export interface TelegramSendMessageOptions {
  replyMarkup?: Record<string, unknown>;
  disableWebPagePreview?: boolean;
}

export interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}
