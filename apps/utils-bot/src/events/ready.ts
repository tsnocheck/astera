import { BotClient, IEvent, logger } from '@lolz-bots/shared';

export default class ReadyEvent implements IEvent {
  name = 'ready';

  async run(client: BotClient) {
    logger.info('Utils bot started successfully!');
    logger.info(`Logged in as: ${client.user?.tag}`);
  }
}
