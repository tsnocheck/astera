import { BotClient, constructEmbed } from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from 'discord.js';
import { PermissionFlagsBits } from 'discord-api-types/v10';

export async function createTicket(
  topic: string,
  description: string,
  authorID: string,
  images: string[],
  client: BotClient,
) {
  const number = Math.floor(Math.random() * 1000000);
  const initialEmbed = constructEmbed({
    title: `Тикет #${number}`,
    description: `Тема: ${topic}\nАвтор: <@${authorID}>\nОписание: ${description}`,
    customType: 'info',
  });
  const initialRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel('Закрыть тикет')
      .setStyle(ButtonStyle.Danger)
      .setCustomId('CloseTicketButton'),
  );
  const guild = await client.guilds.fetch(
    (process.env.MODE as string) === 'dev'
      ? (process.env.DEV_GUILD_ID as string)
      : (process.env.PROD_GUILD_ID as string),
  );
  const channel = await guild.channels.create({
    name: `ticket-${number}`,
    parent: process.env.TICKET_CATEGORY_ID,
    type: ChannelType.GuildText,
    permissionOverwrites: [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: authorID,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
        ],
      },
      {
        id: process.env.SUPPORT_ROLE_ID!,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
        ],
      },
    ],
  });
  images = await checkIsValidImages(images);
  await channel.send({
    content: `<@&${process.env.SUPPORT_ROLE_ID!}>`,
    embeds: [initialEmbed],
    components: [initialRow],
    files: images,
  });

  return channel.id;
}

async function checkIsValidImages(urls: string[]): Promise<string[]> {
  const res: string[] = [];
  urls = urls.filter((v) => v.match(/^https?:\/\/.+\.(png|jpg|jpeg|gif)$/));
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (
        response.ok &&
        response.headers.get('content-type')?.startsWith('image/')
      ) {
        res.push(url);
      }
    } catch {
      // ok
    }
  }
  return res;
}
