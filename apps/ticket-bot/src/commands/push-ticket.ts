import { BotClient, ICommand } from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ApplicationCommandOptionData,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  TextChannel,
} from 'discord.js';

export default class PushTicket implements ICommand {
  name = 'pushticket';
  description = '...';
  options: ApplicationCommandOptionData[] = [
    {
      type: ApplicationCommandOptionType.Channel,
      name: 'channel',
      description: 'The channel to push the tickets to',
    },
  ];

  async run({
    interaction,
    client,
  }: {
    interaction: ChatInputCommandInteraction;
    client: BotClient;
  }) {
    const channel = interaction.options.get('channel')!.channel!;
    if (channel.type !== ChannelType.GuildText) {
      return interaction.reply({
        content: 'Данный канал не является текстовым',
        flags: [MessageFlags.Ephemeral],
      });
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('Создать тикет / Create Ticket')
        .setCustomId('CreateTicketButton')
        .setStyle(ButtonStyle.Success),
    );

    const embed = new EmbedBuilder()
      .setTitle('Создание тикета / Create Ticket')
      .setDescription(
        'Нажмите кнопку для создания тикета / Click the button to create a ticket',
      )
      .setColor('Green');

    await (channel as TextChannel).send({
      embeds: [embed],
      components: [row],
    });

    interaction.reply({
      content: 'Отправил сообщение с кнопкой для тикета',
      flags: [MessageFlags.Ephemeral],
    });
  }
}
