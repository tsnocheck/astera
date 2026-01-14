import {
  IFeature,
  RunFeatureParams,
  constructEmbed,
  ClanModel,
  ClanPrivateRoomModel,
} from '@lolz-bots/shared';
import { ButtonInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

export default class ClanRoomSetLimitFeature implements IFeature<ButtonInteraction> {
  name = 'clanRoomSetLimit';

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
      .setCustomId('clanRoomSetLimitModal')
      .setTitle('Установить лимит участников');

    const limitInput = new TextInputBuilder()
      .setCustomId('userLimit')
      .setLabel('Лимит участников (0 = без лимита)')
      .setStyle(TextInputStyle.Short)
      .setMinLength(1)
      .setMaxLength(2)
      .setPlaceholder('0-99')
      .setRequired(true);

    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(limitInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }
}
