import { BotClient, IEvent, logger } from '@lolz-bots/shared';

export default class ReadyEvent implements IEvent {
  name = 'ready';

  async run(client: BotClient) {
    logger.info('Clan bot started successfully!');
  }
}
