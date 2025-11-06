import { BotClient } from '@lolz-bots/shared';
import { startConsumer } from './consumer/appeal-ticket';

const bot = new BotClient();

bot.build(process.env.TOKEN!, __dirname);

startConsumer(bot);
