import { logger, PunishmentType } from '@lolz-bots/shared';
import producer from './producer';

export async function sendPunishment(punishment: {
  userID: string;
  type: PunishmentType;
  reason: string;
}) {
  try {
    await producer.send('punishments', punishment);
    logger.info('Punishment sent successfully', { punishment });
  } catch (error) {
    logger.error('Failed to send punishment', {
      error: error instanceof Error ? error.message : String(error),
      punishment,
    });
  }
}
