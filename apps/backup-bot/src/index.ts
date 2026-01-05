import { BotClient } from '@lolz-bots/shared';
import * as cron from 'node-cron';
import { BackupConfigModel, logger } from '@lolz-bots/shared';
import { BackupService } from './services/BackupService';

const bot = new BotClient();

// Запускаем бота
bot.build(process.env.TOKEN!, __dirname);

// Функция для запуска планировщика бекапов
function startBackupScheduler(client: BotClient) {
  logger.info('[Scheduler] Starting backup scheduler...');

  // Проверяем каждые 10 минут
  cron.schedule('*/10 * * * *', async () => {
    try {
      const now = new Date();
      
      // Находим все конфигурации, у которых пришло время бекапа
      const configs = await BackupConfigModel.find({
        isEnabled: true,
        nextBackup: { $lte: now },
      });

      if (configs.length === 0) return;

      logger.info(`[Scheduler] Found ${configs.length} backups to execute`);

      const backupService = new BackupService(client);

      for (const config of configs) {
        try {
          const sourceGuild = client.guilds.cache.get(config.guildId);
          const targetGuild = client.guilds.cache.get(config.targetGuildId);

          if (!sourceGuild || !targetGuild) {
            logger.error(`[Scheduler] Guild not found for config ${config._id}`);
            continue;
          }

          logger.info(`[Scheduler] Running backup for ${sourceGuild.name}`);
          await backupService.createBackup(sourceGuild, targetGuild, config);
        } catch (error) {
          logger.error(`[Scheduler] Failed to backup guild ${config.guildId}:`, error);
        }
      }
    } catch (error) {
      logger.error('[Scheduler] Error in backup scheduler:', error);
    }
  });

  logger.info('[Scheduler] Backup scheduler started (runs every 10 minutes)');
}

// Запускаем планировщик после готовности бота
bot.once('ready', () => {
  startBackupScheduler(bot);
});

