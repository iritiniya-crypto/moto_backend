import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const auth = request.headers.authorization;

    if (!auth) {
      // Allow if dev auth is enabled
      if (request.user) {
        return true;
      }
      throw new UnauthorizedException('Missing authorization header');
    }

    const [scheme, token] = auth.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    try {
      const payload = this.jwtService.verify(token);
      request.user = {
        id: payload.sub,
        role: payload.role,
        studentId: payload.studentId,
        telegramId: payload.telegramId
      };
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
