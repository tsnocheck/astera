import {
  CaseItem,
  CaseModel,
  constructEmbed,
  ICommand,
  IFeature,
  Item,
  RunCommandParams,
  RunFeatureParams,
  UserModel,
  logger
} from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  RepliableInteraction,
  ApplicationCommandOptionData,
  EmbedBuilder
} from 'discord.js';
import { ButtonStyle, ApplicationCommandOptionType, ChannelType } from 'discord-api-types/v10';
import * as process from 'node:process';

export default class Award implements ICommand {
  name = 'award';
  description = 'View the shop to buy items';
  preconditions = ['admins-only'];
  options: ApplicationCommandOptionData[] = [
    {
      name: 'user',
      description: 'Пользователь для дуэли',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: 'coins',
      description: 'Количество монет для выдачи',
      type: ApplicationCommandOptionType.Number,
      required: true,
    }
  ];

  async run({ interaction }: RunCommandParams) {
    const user = interaction.options.getUser('user')
    const coins = interaction.options.getNumber('coins')

    if(!user || !coins) {
      return interaction.reply({ content: 'Не удалось получить данные, обратитесь в поддержку.', ephemeral: true });
    }

    const userProfile = await UserModel.findOne({ discordID: user.id }) || await UserModel.create({ discordID: user.id })
    userProfile.coins += coins
    await userProfile.save()

    const logsEmbed = new EmbedBuilder()
      .setTitle(`Выдача монет`)
      .addFields(
        { name: 'Пользователь', value: `<@${user.id}>`, inline: true },
        { name: 'Количество монет', value: `${coins}`, inline: true },
        { name: 'Выдал', value: `<@${interaction.user.id}>`, inline: true },
      );

    const logsChannel = await interaction.client.channels.fetch(process.env.LOGS_CHANNEL_ID!);

    if (!logsChannel) {
      logger.error('Logs channel not found or is not text-based.');
      return interaction.reply({ content: 'Произошла ошибка при попытке записать лог.', ephemeral: true });
    }

    if (logsChannel.type === ChannelType.GuildText) {
      await logsChannel.send({ embeds: [logsEmbed] });
    }

    return interaction.reply({ content: `Выдано ${coins} монет пользователю <@${user.id}>.`, ephemeral: true });
  }
}
