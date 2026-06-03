import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DevAuthMiddleware } from './auth/dev-auth.middleware';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { BookingModule } from './booking/booking.module';
import { CalendarModule } from './calendar/calendar.module';
import { envSchema } from './config/env.schema';
import { PrismaModule } from './prisma/prisma.module';
import { ReportsModule } from './reports/reports.module';
import { SkillsModule } from './skills/skills.module';
import { StudentsModule } from './students/students.module';
import { TrainingHistoryModule } from './training-history/training-history.module';
import { UsersModule } from './users/users.module';
import { VideosModule } from './videos/videos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envSchema
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    StudentsModule,
    BookingModule,
    ReportsModule,
    TrainingHistoryModule,
    VideosModule,
    SkillsModule,
    CalendarModule
  ],
  controllers: [AppController]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(DevAuthMiddleware).forRoutes('{*path}');
  }
}
