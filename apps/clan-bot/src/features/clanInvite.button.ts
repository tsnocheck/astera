import {
  IFeature,
  RunFeatureParams,
  constructEmbed,
  ClanModel,
} from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonInteraction,
  UserSelectMenuBuilder,
} from 'discord.js';

export default class ClanInviteFeature implements IFeature<ButtonInteraction> {
  name = 'clanInvite';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const clan = await ClanModel.findOne({ 'users.userID': interaction.user.id });

    if (!clan) {
      return interaction.reply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Вы не состоите ни в одном клане',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
    }

    const isOwner = clan.owner === interaction.user.id;
    const isCoOwner = clan.coOwners.includes(interaction.user.id);

    if (!isOwner && !isCoOwner) {
      return interaction.reply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Только овнер или со-овнер может приглашать участников',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
    }

    const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId('selectUserToInviteClan')
        .setPlaceholder('Выберите пользователя для приглашения')
        .setMinValues(1)
        .setMaxValues(1)
    );

    return interaction.reply({
      content: 'Выберите пользователя для приглашения в клан:',
      components: [row],
      ephemeral: true,
    });
  }
}
