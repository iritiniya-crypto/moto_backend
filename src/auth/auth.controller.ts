import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService, AuthResponse } from './auth.service';
import { TelegramAuthDto } from './dto/telegram-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('telegram')
  async authenticateWithTelegram(@Body() dto: TelegramAuthDto): Promise<AuthResponse> {
    try {
      console.log('[AUTH] Telegram auth request received');
      const result = await this.authService.authenticateWithTelegram(dto);
      console.log('[AUTH] Authentication successful for user:', result.user.id);
      return result;
    } catch (error) {
      console.error('[AUTH] Authentication failed:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
