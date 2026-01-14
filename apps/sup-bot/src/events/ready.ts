import { BotClient, IEvent, logger, PrimeTimeModel } from '@lolz-bots/shared';
import { EmbedBuilder, TextChannel } from 'discord.js';
import * as cron from 'node-cron';
import { supConfig } from '../config';

export default class ReadyEvent implements IEvent {
  name = 'ready';

  async run(client: BotClient) {
    logger.info('Sup bot started successfully!');
    logger.info(`Logged in as: ${client.user?.tag}`);

    // Задача для отправки сообщений о верификации каждые 4 часа
    cron.schedule(
      '0 */4 * * *',
      async () => {
        const guild = client.guilds.cache.get(supConfig.guildId);
        if (!guild) return;

        const channel = guild.channels.cache.get(
          supConfig.channels.verifyCall
        ) as TextChannel;
        if (!channel) return;

        try {
          // Удаляем последнее сообщение
          const messages = await channel.messages.fetch({ limit: 10 });
          const lastMessage = messages.first();
          if (lastMessage) {
            await lastMessage.delete();
            logger.info(`Удалено сообщение с ID ${lastMessage.id}`);
          }
        } catch (error) {
          logger.error('Ошибка при поиске сообщений:', error);
        }

        try {
          await channel.send({
            embeds: [
              {
                title: 'Верификация',
                description:
                  '🤍 Здравствуй! Именно тебя ждут наши саппорты на верификацию. Они проведут вам качественную навигацию и быстренько пропустят на сервер!',
                color: 2829617,
              },
            ],
            content: `<@&${supConfig.roles.unverify}>`,
          });
        } catch (error) {
          logger.error('Ошибка при отправке сообщения:', error);
        }
      },
      {
        timezone: 'Europe/Moscow',
      }
    );

    // Проверка PrimeTime каждые 5 минут
    setInterval(async () => {
      const supports = await PrimeTimeModel.find({ guild: supConfig.guildId });
      let members = '';
      const guild = client.guilds.cache.get(supConfig.guildId);
      if (!guild) return;

      const channel = guild.channels.cache.get(
        supConfig.channels.primeTimeNotify
      ) as TextChannel;
      if (!channel) return;

      // Получаем текущее время в московском часовом поясе
      const currentTime = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Europe/Moscow',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      };
      const formattedTime = currentTime
        .toLocaleString('ru-RU', options)
        .replace(',', '');

      for (const support of supports) {
        if (support.userId && support.startPrimeTime === formattedTime) {
          const member = await guild.members.fetch(support.userId).catch(() => null);
          if (member && member.roles.cache.has('1180136674177597470')) {
            members += `<@${support.userId}>`;
          }
        }
      }

      if (!members) return;

      const emb = new EmbedBuilder()
        .setTitle('Уведомление')
        .setDescription('Встаем рабы, пора работать, залетаем в проходочки')
        .setColor(0x2b2d31)
        .setTimestamp();

      await channel.send({ embeds: [emb], content: members });
    }, 5 * 60 * 1000); // Каждые 5 минут
  }
}
