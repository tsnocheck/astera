import { BotClient, IEvent, logger } from '@lolz-bots/shared';

export default class ReadyEvent implements IEvent {
  name = 'ready';
  run = async (client: BotClient) => {
    logger.info(`Logged in as ${client.user?.tag}`);
  };
}
