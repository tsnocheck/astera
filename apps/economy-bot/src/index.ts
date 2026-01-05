import { BotClient } from '@lolz-bots/shared';

const bot = new BotClient();

bot.build(process.env.TOKEN!, __dirname);

