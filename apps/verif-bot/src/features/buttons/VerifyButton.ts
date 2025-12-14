import { IFeature } from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonInteraction,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { BotClient } from '@lolz-bots/shared';
import { UserModel } from '@lolz-bots/shared';

export default class VerifyButton implements IFeature<ButtonInteraction> {
  name = 'VerifyButton';
  subfeatures = [];

  async run({
    interaction,
  }: {
    interaction: ButtonInteraction;
    client: BotClient;
  }) {
    const isVerified = await UserModel.findOne({
      discordId: interaction.user.id,
      verified: true,
    });
    const member = await interaction.guild!.members.fetch(interaction.user.id);
    if (
      member.roles.valueOf().has(process.env.VERIFIED_ROLE_ID!) &&
      !isVerified
    ) {
      await member.roles.remove(process.env.VERIFIED_ROLE_ID!);
      await interaction.reply({
        embeds: [
          {
            color: 0xff0000,
            title: 'Ошибка',
            description:
              'Похоже вы проходили верификацию до введения нового бота. Пройдите ее заново, нажав на кнопку.',
          },
        ],
        ephemeral: true,
      });
      return;
    }
    if (isVerified) {
      if (!member.roles.valueOf().has(process.env.VERIFIED_ROLE_ID!)) {
        await member.roles.add(process.env.VERIFIED_ROLE_ID!);
      }
      return interaction.reply({
        embeds: [
          {
            color: 0xff0000,
            title: 'Ошибка',
            description: 'Вы уже были верифицированы',
          },
        ],
        ephemeral: true,
      });
    }
    const modal = new ModalBuilder()
      .setTitle('VerifyModal')
      .setCustomId('VerifyModal')
      .setComponents(
        new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('nickname')
            .setLabel('Введите ваш никнейм на Lolzteam')
            .setRequired(true)
            .setStyle(TextInputStyle.Short),
        ),
      );
    await interaction.showModal(modal);
  }
}

export interface Response {
  users: User[];
}

interface User {
  user_id: number;
  fields: Array<{
    id: string;
    value: string;
  }>;
  custom_fields: {
    discord: string;
  };
}
