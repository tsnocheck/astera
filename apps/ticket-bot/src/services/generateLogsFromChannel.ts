import { Message, TextChannel } from 'discord.js';

export const generateLogsFromChannel = async (channel: TextChannel) => {
  const messages = await channel.messages.fetch({ limit: 100 });
  const logs: { [key: string]: string } = {};
  messages.forEach((message: Message) => {
    if (message.author.bot) return;
    logs[
      `${message.id} - [${message.createdAt.getHours()}:${message.createdAt.getMinutes()}:${message.createdAt.getSeconds()}] ${message.author.username}`
    ] = message.content || 'Нет текста в данном сообщении';
  });
  return logs;
};
