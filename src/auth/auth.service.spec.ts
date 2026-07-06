import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let prismaService: PrismaService;

  const mockUser = {
    id: 'test-user-id',
    telegramId: '123456789',
    telegramUsername: 'test_user',
    displayName: 'Test User',
    role: 'STUDENT',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockStudent = {
    id: 'test-student-id',
    userId: 'test-user-id',
    instructorId: '11111111-1111-1111-1111-111111111111',
    name: 'Test User',
    avatar: null,
    telegramUsername: 'test_user',
    level: 'BEGINNER',
    focus: null,
    nextTrainingPlan: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockInstructor = {
    id: '11111111-1111-1111-1111-111111111111',
    firstName: 'Nikita',
    lastName: 'Aleksandrov',
    telegramUsername: 'Nikita_Alex_Vietnam',
    userId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token')
          }
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              const config = {
                JWT_SECRET: 'test-secret'
              };
              return config[key] ?? null;
            })
          }
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn()
            },
            student: {
              findUnique: jest.fn(),
              create: jest.fn()
            },
            instructor: {
              findFirst: jest.fn()
            },
            $transaction: jest.fn()
          }
        }
      ]
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('validateTelegramData', () => {
    it('should throw if initData is empty', () => {
      expect(() => service['validateTelegramData']('')).toThrow(UnauthorizedException);
    });

    it('should throw if user data is missing', () => {
      const initData = 'query_id=AAH&user_not_found=true';
      expect(() => service['validateTelegramData'](initData)).toThrow(UnauthorizedException);
    });

    it('should parse valid initData', () => {
      const userData = { id: 123456789, first_name: 'John', username: 'john_doe' };
      const initData = `query_id=AAH&user=${encodeURIComponent(JSON.stringify(userData))}`;
      const result = service['validateTelegramData'](initData);
      expect(result.id).toBe(123456789);
      expect(result.first_name).toBe('John');
      expect(result.username).toBe('john_doe');
    });
  });

  describe('formatDisplayName', () => {
    it('should format first and last name', () => {
      const user = { id: 1, first_name: 'John', last_name: 'Doe' };
      const result = service['formatDisplayName'](user as any);
      expect(result).toBe('John Doe');
    });

    it('should use only first name if last name missing', () => {
      const user = { id: 1, first_name: 'John' };
      const result = service['formatDisplayName'](user as any);
      expect(result).toBe('John');
    });

    it('should fallback to User id if name missing', () => {
      const user = { id: 123 };
      const result = service['formatDisplayName'](user as any);
      expect(result).toBe('User 123');
    });
  });

  describe('authenticateWithTelegram', () => {
    it('should authenticate existing user', async () => {
      const initData = `user=${encodeURIComponent(JSON.stringify({ id: 123456789, first_name: 'Test' }))}`;

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce(mockUser);
      jest.spyOn(prismaService.student, 'findUnique').mockResolvedValueOnce(mockStudent);
      jest.spyOn(jwtService, 'sign').mockReturnValueOnce('mock-token');

      const result = await service.authenticateWithTelegram({ initData });

      expect(result.token).toBe('mock-token');
      expect(result.studentId).toBe('test-student-id');
      expect(result.user.displayName).toBe('Test User');
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });

    it('should create new user and student on first login', async () => {
      const initData = `user=${encodeURIComponent(JSON.stringify({ id: 123456789, first_name: 'New', last_name: 'User', username: 'newuser' }))}`;

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce(null);
      jest.spyOn(prismaService.instructor, 'findFirst').mockResolvedValueOnce(mockInstructor);
      jest.spyOn(prismaService, '$transaction').mockImplementation(async (callback) => {
        const txMock = {
          user: {
            create: jest.fn().mockResolvedValueOnce(mockUser)
          },
          student: {
            create: jest.fn().mockResolvedValueOnce(mockStudent)
          }
        };
        return callback(txMock);
      });
      jest.spyOn(prismaService.student, 'findUnique').mockResolvedValueOnce(mockStudent);
      jest.spyOn(jwtService, 'sign').mockReturnValueOnce('mock-token');

      const result = await service.authenticateWithTelegram({ initData });

      expect(result.token).toBe('mock-token');
      expect(result.studentId).toBe('test-student-id');
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should parse and store avatar from Telegram user', async () => {
      const avatarUrl = 'https://t.me/avatar.jpg';
      const initData = `user=${encodeURIComponent(JSON.stringify({ id: 123456789, first_name: 'Test', photo_url: avatarUrl }))}`;

      const studentWithAvatar = { ...mockStudent, avatar: avatarUrl };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce(mockUser);
      jest.spyOn(prismaService.student, 'findUnique').mockResolvedValueOnce(mockStudent);
      jest.spyOn(prismaService.student, 'update').mockResolvedValueOnce(studentWithAvatar);
      jest.spyOn(prismaService.student, 'findUnique').mockResolvedValueOnce(studentWithAvatar);
      jest.spyOn(jwtService, 'sign').mockReturnValueOnce('mock-token');

      const result = await service.authenticateWithTelegram({ initData });

      expect(prismaService.student.update).toHaveBeenCalledWith({
        where: { id: 'test-student-id' },
        data: expect.objectContaining({
          name: 'Test',
          avatar: avatarUrl
        })
      });
      expect(result.user.avatar).toBe(avatarUrl);
    });

    it('should include avatar in response', async () => {
      const avatarUrl = 'https://t.me/avatar.jpg';
      const initData = `user=${encodeURIComponent(JSON.stringify({ id: 123456789, first_name: 'Test', photo_url: avatarUrl }))}`;

      const studentWithAvatar = { ...mockStudent, avatar: avatarUrl };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce(mockUser);
      jest.spyOn(prismaService.student, 'findUnique').mockResolvedValueOnce(studentWithAvatar);
      jest.spyOn(jwtService, 'sign').mockReturnValueOnce('mock-token');

      const result = await service.authenticateWithTelegram({ initData });

      expect(result.user).toEqual({
        id: 'test-user-id',
        telegramId: 123456789,
        telegramUsername: 'test_user',
        displayName: 'Test User',
        avatar: avatarUrl
      });
    });
  });
});
