import { Controller, Post, Body } from '@nestjs/common';
import { AuthService, AuthResponse } from './auth.service';
import { TelegramAuthDto } from './dto/telegram-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('telegram')
  async authenticateWithTelegram(@Body() dto: TelegramAuthDto): Promise<AuthResponse> {
    return this.authService.authenticateWithTelegram(dto);
  }
}
