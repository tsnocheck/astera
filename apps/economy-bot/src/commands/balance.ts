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
} from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  RepliableInteraction,
  ApplicationCommandOptionData
} from 'discord.js';
import { ButtonStyle, ApplicationCommandOptionType } from 'discord-api-types/v10';

export default class Balance implements ICommand {
  name = 'balance';
  description = 'View the shop to buy items';
  options: ApplicationCommandOptionData[] = [
    {
      name: 'user',
      description: 'The user whose profile you want to view',
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ];

  async run({ interaction }: RunCommandParams) {
    const user = interaction.options.getUser('user') || interaction.user
    const userProfile = await UserModel.findOne({ discordID: interaction.user.id }) || await UserModel.create({ discordID: interaction.user.id })

    const embed = constructEmbed({
      title: `Баланс ${user.username}`,
      fields: [
        {
          name: 'Balance',
          value: `${userProfile.coins} LOLZ`,
          inline: true,
        },
      ],
      thumbnail: { url: user.displayAvatarURL({ size: 512, forceStatic: false }) },
      customType: 'info',
    });

    await interaction.reply({ embeds: [embed] });
  }
}
