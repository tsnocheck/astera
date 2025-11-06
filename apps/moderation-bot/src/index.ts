import { BotClient } from '@lolz-bots/shared';
import { runCronJob } from './services/remove-expired-roles';

const bot = new BotClient();

bot.build(process.env.TOKEN!, __dirname);

runCronJob(bot);
