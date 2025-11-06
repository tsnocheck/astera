import { BotClient } from '@lolz-bots/shared';
import { startPunishmentsConsumer } from './consumer/punishments';

const bot = new BotClient();

bot.build(process.env.TOKEN!, __dirname);

startPunishmentsConsumer(bot);
