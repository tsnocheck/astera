import {
  IFeature,
  RunFeatureParams,
  constructEmbed,
  ClanModel,
  ClanPrivateRoomModel,
} from '@lolz-bots/shared';
import { ButtonInteraction, ActionRowBuilder, UserSelectMenuBuilder } from 'discord.js';

export default class ClanRoomMuteFeature implements IFeature<ButtonInteraction> {
  name = 'clanRoomMute';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const clan = await ClanModel.findOne({ 'users.userID': interaction.user.id });

    if (!clan) {
      return interaction.reply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Вы не состоите в клане',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
    }

    const privateRoom = await ClanPrivateRoomModel.findOne({
      ownerId: interaction.user.id,
      clanId: clan.id,
    });

    if (!privateRoom || !privateRoom.roomId) {
      return interaction.reply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'У вас нет приватной комнаты',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
    }

    const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId('clanRoomSelectUserToMute')
        .setPlaceholder('Выберите участника')
        .setMinValues(1)
        .setMaxValues(1)
    );

    return interaction.reply({
      embeds: [
        constructEmbed({
          title: '🔇 Заглушить/Разглушить',
          description: 'Выберите участника для изменения статуса звука',
          customType: 'custom',
        }),
      ],
      components: [row],
      ephemeral: true,
    });
  }
}
