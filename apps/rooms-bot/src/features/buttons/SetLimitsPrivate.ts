import { IFeature, RunFeatureParams, PrivateModel } from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonInteraction,
  ModalBuilder,
  TextInputStyle,
  TextInputBuilder
} from 'discord.js';

export class SetLimitsPrivate implements IFeature<ButtonInteraction> {
  name = 'setLimitsPrivate';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({ content: 'Ошибка получения данных участника.', ephemeral: true });
      return;
    }

    const member = interaction.guild.members.cache.get(interaction.user.id);
    if (!member) {
      await interaction.reply({ content: 'Участник не найден.', ephemeral: true });
      return;
    }

    const privateRoom = await PrivateModel.findOne({ ownerId: interaction.user.id });
    if (!privateRoom) {
      await interaction.reply({ content: 'У вас нет приватной комнаты.', ephemeral: true });
      return;
    }

    if (privateRoom.roomId !== member.voice.channelId) {
      await interaction.reply({ content: 'Вы не являетесь владельцем этой приватной комнаты.', ephemeral: true });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(`setLimitPrivateModal_${privateRoom._id}`)
      .setTitle('Установка лимита');

    const limitInput = new TextInputBuilder()
      .setCustomId(`roomLimitInput`)
      .setLabel('Введите лимит пользователей (0 - без лимита):')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('например, 5')
      .setRequired(true)
      .setMaxLength(2);
    
    const modalActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(limitInput);

    modal.addComponents(modalActionRow);

    await interaction.showModal(modal);
  }
}

export default SetLimitsPrivate;
