import {
  IFeature,
  RunFeatureParams,
  constructEmbed,
  ClanModel,
  ClanPrivateRoomModel,
} from '@lolz-bots/shared';
import { ButtonInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

export default class ClanRoomRenameFeature implements IFeature<ButtonInteraction> {
  name = 'clanRoomRename';

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

    const modal = new ModalBuilder()
      .setCustomId('clanRoomRenameModal')
      .setTitle('Переименовать комнату');

    const nameInput = new TextInputBuilder()
      .setCustomId('roomName')
      .setLabel('Новое название')
      .setStyle(TextInputStyle.Short)
      .setMinLength(1)
      .setMaxLength(32)
      .setRequired(true);

    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }
}
