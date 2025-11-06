import { logger } from '@lolz-bots/shared';
import producer from './producer';

export async function sendAppealTicket(ticket: {
  userId: string;
  topic: string;
  description: string;
}) {
  try {
    await producer.send('appeal-tickets', ticket);
    logger.info('Appeal ticket sent successfully');
  } catch (error) {
    logger.error('Failed to send appeal ticket', {
      error: error instanceof Error ? error.message : String(error),
      ticket,
    });
  }
}
