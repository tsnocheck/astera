import {
  BotClient,
  logger,
  PunishmentModel,
  PunishmentType,
} from '@lolz-bots/shared';
import cron from 'node-cron';

async function removeExpiredRoles(client: BotClient) {
  const guild = client.guilds.cache.get(
    process.env.MODE! === 'dev'
      ? process.env.DEV_GUILD_ID!
      : process.env.PROD_GUILD_ID!,
  );
  if (!guild) {
    logger.error('Guild not found');
    return;
  }

  const expiredPunishments = await PunishmentModel.find({
    type: { $in: [PunishmentType.BAN, PunishmentType.MUTE] },
    expiresAt: { $lt: new Date() },
  });

  if (expiredPunishments.length === 0) {
    logger.info('No expired roles found');
    return;
  }

  for (const punishment of expiredPunishments) {
    const member = await guild.members
      .fetch(punishment.userID)
      .catch(() => null);
    if (!member) {
      logger.warn(`Member with ID ${punishment.userID} not found`);
      continue;
    }

    if (punishment.type === PunishmentType.BAN) {
      try {
        await member.roles.remove(process.env.BAN_ROLE_ID!);
        logger.info(`Removed ban role from ${member.user.tag}`);
      } catch (error) {
        logger.error(
          `Failed to remove ban role from ${member.user.tag}: ${error}`,
        );
      }
    } else if (punishment.type === PunishmentType.MUTE) {
      try {
        await member.roles.remove(process.env.MUTE_ROLE_ID!);
        logger.info(`Removed mute role from ${member.user.tag}`);
      } catch (error) {
        logger.error(
          `Failed to remove mute role from ${member.user.tag}: ${error}`,
        );
      }
    }
  }
}

export async function runCronJob(client: BotClient) {
  // every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    logger.info('Running expired roles removal job');
    await removeExpiredRoles(client);
  });
}
