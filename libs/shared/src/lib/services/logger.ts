import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json({ space: 2 }),
  defaultMeta: 'bot',
  transports: [
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format.errors({ stack: true }),
      ),
    }),
  ],
});

export { logger };
