import { constructEmbed, ICommand } from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ApplicationCommandOptionData,
  ButtonBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import {
  ApplicationCommandOptionType,
  ButtonStyle,
  ChannelType,
} from 'discord-api-types/v10';

export default class Info implements ICommand {
  name = 'info';
  description = 'info';
  preconditions = ['moderator-only'];
  options: ApplicationCommandOptionData[] = [
    {
      name: 'channel',
      description: 'The channel to push info to',
      type: ApplicationCommandOptionType.Channel,
      required: true,
    },
  ];

  async run({ interaction }: { interaction: ChatInputCommandInteraction }) {
    const channel = interaction.options.getChannel('channel', true, [
      ChannelType.GuildText,
    ])!;
    if (channel.type !== ChannelType.GuildText) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            title: 'Неверный тип канала',
            description: 'Пожалуйста, выберите текстовый канал.',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
      return;
    }

    const embed = constructEmbed({
      title: 'Получение информации',
      description:
        'Вы получили наказание, используйте кнопки снизу для действий.',
      customType: 'info',
    });
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('appeal-punishment')
        .setLabel('Обжаловать наказание')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('get-information')
        .setLabel('Получить информацию')
        .setStyle(ButtonStyle.Secondary),
    );
    await channel.send({
      embeds: [embed],
      components: [row],
    });
  }
}
