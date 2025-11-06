import { BotClient, logger } from '@lolz-bots/shared';
import { MessageCreateOptions, MessagePayload, TextChannel } from 'discord.js';

const LOGS_CHANNEL_ID = process.env.LOGS_CHANNELID!;

export async function sendLog(
  client: BotClient,
  message: MessagePayload | MessageCreateOptions,
) {
  const channel = await client.channels.fetch(LOGS_CHANNEL_ID);
  if (!channel || !channel.isSendable()) {
    logger.error('Logs channel not found or is not text-based');
    return;
  }
  if (channel.partial) {
    try {
      await channel.fetch();
    } catch {
      logger.error('Failed to fetch logs channel');
      return;
    }
  }
  await (channel as TextChannel).send(message);
}
