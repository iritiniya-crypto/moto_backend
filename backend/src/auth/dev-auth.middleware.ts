import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';

export type DevAuthRole = 'INSTRUCTOR' | 'STUDENT';

export interface DevAuthUser {
  id: string;
  role: DevAuthRole;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: DevAuthUser;
  }
}

@Injectable()
export class DevAuthMiddleware implements NestMiddleware {
  constructor(private readonly config: ConfigService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    const enabled = this.config.get<boolean>('DEV_AUTH_ENABLED', true);

    if (enabled) {
      req.user = {
        id: this.config.get<string>('DEV_AUTH_USER_ID', 'dev-instructor-nikita'),
        role: this.config.get<DevAuthRole>('DEV_AUTH_ROLE', 'INSTRUCTOR')
      };
    }

    next();
  }
}
