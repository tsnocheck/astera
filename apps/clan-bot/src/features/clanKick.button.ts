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

export default class ClanKickFeature implements IFeature<ButtonInteraction> {
  name = 'clanKick';

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
            description: 'Только овнер или со-овнер может исключать участников',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
    }

    const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId('selectUserToKickClan')
        .setPlaceholder('Выберите участника для исключения')
        .setMinValues(1)
        .setMaxValues(1)
    );

    return interaction.reply({
      content: 'Выберите участника для исключения из клана:',
      components: [row],
      ephemeral: true,
    });
  }
}
