import * as Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
  DEV_AUTH_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
  DEV_AUTH_USER_ID: Joi.string().default('dev-instructor-nikita'),
  DEV_AUTH_ROLE: Joi.string().valid('INSTRUCTOR', 'STUDENT').default('INSTRUCTOR'),
  TELEGRAM_ENABLED: Joi.boolean().truthy('true').falsy('false').default(false),
  TELEGRAM_BOT_TOKEN: Joi.string().allow('').optional(),
  TELEGRAM_MINI_APP_URL: Joi.string().uri({ scheme: ['https'] }).allow('').optional(),
  TELEGRAM_WEBHOOK_SECRET: Joi.string().allow('').optional(),
  TELEGRAM_INSTRUCTOR_CHAT_ID: Joi.string().allow('').optional()
});
