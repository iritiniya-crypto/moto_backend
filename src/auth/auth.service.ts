import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramAuthDto } from './dto/telegram-auth.dto';

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export interface AuthResponse {
  token: string;
  studentId: string;
  user: {
    id: string;
    telegramId: number;
    telegramUsername?: string;
    displayName: string;
    avatar?: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService
  ) {}

  async authenticateWithTelegram(dto: TelegramAuthDto): Promise<AuthResponse> {
    // Parse and validate Telegram init data
    const telegramUser = this.validateTelegramData(dto.initData);

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { telegramId: telegramUser.id.toString() }
    });

    if (!user) {
      // Create new user and student on first login
      user = await this.prisma.user.create({
        data: {
          telegramId: telegramUser.id.toString(),
          telegramUsername: telegramUser.username,
          displayName: this.formatDisplayName(telegramUser),
          role: 'STUDENT'
        }
      });

      // Create corresponding student
      const defaultInstructor = await this.getDefaultInstructor();
      await this.prisma.student.create({
        data: {
          userId: user.id,
          instructorId: defaultInstructor.id,
          name: this.formatDisplayName(telegramUser),
          avatar: telegramUser.photo_url,
          telegramUsername: telegramUser.username,
          level: 'BEGINNER'
        }
      });
    }

    // Get student profile
    let student = await this.prisma.student.findUnique({
      where: { userId: user.id }
    });

    if (!student) {
      const defaultInstructor = await this.getDefaultInstructor();
      student = await this.prisma.student.create({
        data: {
          userId: user.id,
          instructorId: defaultInstructor.id,
          name: this.formatDisplayName(telegramUser),
          avatar: telegramUser.photo_url,
          telegramUsername: telegramUser.username,
          level: 'BEGINNER'
        }
      });
    } else {
      // Update student name and avatar on each login if they changed
      const updatedData: { name: string; avatar?: string | null } = {
        name: this.formatDisplayName(telegramUser)
      };

      // Only update avatar if it has changed or exists
      if (telegramUser.photo_url !== student.avatar) {
        updatedData.avatar = telegramUser.photo_url;
      }

      await this.prisma.student.update({
        where: { id: student.id },
        data: updatedData
      });

      student = await this.prisma.student.findUnique({
        where: { id: student.id }
      });
    }

    // Generate JWT token
    const token = this.jwtService.sign({
      sub: user.id,
      role: user.role,
      studentId: student!.id,
      telegramId: user.telegramId
    });

    return {
      token,
      studentId: student!.id,
      user: {
        id: user.id,
        telegramId: parseInt(user.telegramId || '0'),
        telegramUsername: user.telegramUsername || undefined,
        displayName: user.displayName,
        avatar: student!.avatar || undefined
      }
    };
  }

  private validateTelegramData(initData: string): TelegramUser {
    if (!initData) {
      throw new UnauthorizedException('initData is required');
    }

    try {
      // Parse init data (format: key=value&key=value&...)
      const params = new URLSearchParams(initData);
      const userStr = params.get('user');

      if (!userStr) {
        throw new UnauthorizedException('user data not found in initData');
      }

      const telegramUser = JSON.parse(userStr) as TelegramUser;

      if (!telegramUser.id || typeof telegramUser.id !== 'number') {
        throw new UnauthorizedException('Invalid telegram user data');
      }

      return telegramUser;
    } catch (error) {
      throw new UnauthorizedException('Invalid telegram init data format');
    }
  }

  private formatDisplayName(telegramUser: TelegramUser): string {
    const parts = [telegramUser.first_name, telegramUser.last_name].filter(Boolean);
    return parts.join(' ') || `User ${telegramUser.id}`;
  }

  private async getDefaultInstructor() {
    const instructor = await this.prisma.instructor.findFirst({
      where: { id: '11111111-1111-1111-1111-111111111111' }
    });

    if (!instructor) {
      throw new BadRequestException('Default instructor not found. Please seed the database.');
    }

    return instructor;
  }
}
